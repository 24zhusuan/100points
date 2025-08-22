export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    const responseHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };

    try {
      // 获取活跃的、等待中的房间列表
      if (pathname === '/api/rooms' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          "SELECT * FROM GameRooms WHERE status = 'waiting' ORDER BY created_date DESC LIMIT 20"
        ).all();
        return new Response(JSON.stringify(results || []), { headers: responseHeaders });
      }

      // 获取单个房间的详细信息
      if (pathname.startsWith('/api/room/') && !pathname.includes('/submit') && !pathname.includes('/process-round') && request.method === 'GET') {
        const id = pathname.split('/')[3];
        if (!id) return new Response(JSON.stringify({ error: 'Room ID is required' }), { status: 400, headers: responseHeaders });
        
        const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: responseHeaders });

        return new Response(JSON.stringify(room), { headers: responseHeaders });
      }

      // 创建新房间
      if (pathname === '/api/rooms' && request.method === 'POST') {
        const body = await request.json();
        const newRoomId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO GameRooms (id, room_name, room_code, rounds, player1_id, player1_full_name) 
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(newRoomId, body.room_name, body.room_code, body.rounds, body.player1_id, body.player1_full_name).run();
        
        const newRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(newRoomId).first();
        return new Response(JSON.stringify(newRoom), { status: 201, headers: responseHeaders });
      }

      // 通过房间代码加入房间
      if (pathname === '/api/join-by-code' && request.method === 'POST') {
          const { room_code, user } = await request.json();
          const room = await env.DB.prepare(
              "SELECT * FROM GameRooms WHERE room_code = ? AND status = 'waiting'"
          ).bind(room_code.toUpperCase()).first();

          if (!room) {
              return new Response(JSON.stringify({ error: 'Room not found or already in progress.' }), { status: 404, headers: responseHeaders });
          }
          
          if (room.player1_id === user.id) {
              return new Response(JSON.stringify(room), { headers: responseHeaders });
          }

          await env.DB.prepare(
              "UPDATE GameRooms SET player2_id = ?, player2_full_name = ?, status = 'in_progress' WHERE id = ?"
          ).bind(user.id, user.full_name, room.id).run();
          
          const updatedRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(room.id).first();
          return new Response(JSON.stringify(updatedRoom), { headers: responseHeaders });
      }

      // 玩家提交数字 (***新增了核心验证逻辑***)
      if (pathname.startsWith('/api/room/') && pathname.endsWith('/submit') && request.method === 'POST') {
          const id = pathname.split('/')[3];
          const { userId, number } = await request.json();

          const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
          if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: responseHeaders });
          
          const isPlayer1 = room.player1_id === userId;
          const currentNumbersStr = isPlayer1 ? room.player1_numbers : room.player2_numbers;
          const currentNumbers = JSON.parse(currentNumbersStr || '[]');
          
          // --- 核心规则验证 ---
          const sumOfNumbers = currentNumbers.reduce((sum, num) => sum + num, 0);
          if (sumOfNumbers + number > 100) {
            return new Response(JSON.stringify({ error: `Invalid number. Your total points cannot exceed 100. You have ${100 - sumOfNumbers} points remaining.` }), { status: 400, headers: responseHeaders });
          }
          // --- 验证结束 ---

          currentNumbers.push(number);

          const sql = isPlayer1 
              ? "UPDATE GameRooms SET player1_numbers = ? WHERE id = ?"
              : "UPDATE GameRooms SET player2_numbers = ? WHERE id = ?";
          
          await env.DB.prepare(sql).bind(JSON.stringify(currentNumbers), id).run();

          const updatedRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
          return new Response(JSON.stringify(updatedRoom), { headers: responseHeaders });
      }
      
      // 检查回合是否结束并结算分数
      if (pathname.startsWith('/api/room/') && pathname.endsWith('/process-round') && request.method === 'POST') {
          const id = pathname.split('/')[3];
          const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();

          if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: responseHeaders });
          
          const { current_round, rounds, player1_id, player2_id } = room;
          const player1_numbers = JSON.parse(room.player1_numbers);
          const player2_numbers = JSON.parse(room.player2_numbers);

          if (player1_numbers.length >= current_round && player2_numbers.length >= current_round) {
              const roundIndex = current_round - 1;
              const p1Number = player1_numbers[roundIndex];
              const p2Number = player2_numbers[roundIndex];

              let newP1Score = room.player1_score;
              let newP2Score = room.player2_score;

              if (p1Number > p2Number) newP1Score++;
              else if (p2Number > p1Number) newP2Score++;

              const isGameComplete = current_round >= rounds;
              const newStatus = isGameComplete ? "completed" : "in_progress";
              const newRound = isGameComplete ? current_round : current_round + 1;
              
              let winnerId = null;
              if (isGameComplete) {
                  if (newP1Score > newP2Score) winnerId = player1_id;
                  else if (newP2Score > p1Number) winnerId = player2_id;
                  else winnerId = "tie";
              }
              
              await env.DB.prepare(
                  `UPDATE GameRooms SET player1_score = ?, player2_score = ?, current_round = ?, status = ?, winner_id = ? WHERE id = ?`
              ).bind(newP1Score, newP2Score, newRound, newStatus, winnerId === "tie" ? null : winnerId, id).run();
          }

          const finalRoomState = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
          return new Response(JSON.stringify(finalRoomState), { headers: responseHeaders });
      }

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: responseHeaders });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: responseHeaders });
  },
};
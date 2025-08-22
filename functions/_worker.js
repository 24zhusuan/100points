import { createClerkClient } from "@clerk/backend";

// 游戏逻辑API保持不变
const handleApiRequest = async (request, env, auth) => {
    const { pathname } = new URL(request.url);

    // 从安全的 auth 对象中获取用户信息
    const { userId, user } = auth;

    // 获取活跃的、等待中的房间列表
    if (pathname === '/api/rooms' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
            "SELECT * FROM GameRooms WHERE status = 'waiting' ORDER BY created_date DESC LIMIT 20"
        ).all();
        return new Response(JSON.stringify(results || []), { headers: { 'Content-Type': 'application/json' } });
    }

    // 获取单个房间的详细信息
    if (pathname.startsWith('/api/room/') && !pathname.includes('/submit') && !pathname.includes('/process-round') && request.method === 'GET') {
        const id = pathname.split('/')[3];
        if (!id) return new Response(JSON.stringify({ error: 'Room ID is required' }), { status: 400 });
        const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });
        return new Response(JSON.stringify(room), { headers: { 'Content-Type': 'application/json' } });
    }

    // 创建新房间 (使用安全的用户信息)
    if (pathname === '/api/rooms' && request.method === 'POST') {
        const body = await request.json();
        const newRoomId = crypto.randomUUID();
        await env.DB.prepare(
            `INSERT INTO GameRooms (id, room_name, room_code, rounds, player1_id, player1_full_name) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(newRoomId, body.room_name, body.room_code, body.rounds, userId, user.fullName).run();
        const newRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(newRoomId).first();
        return new Response(JSON.stringify(newRoom), { status: 201 });
    }

    // 通过房间代码加入房间 (使用安全的用户信息)
    if (pathname === '/api/join-by-code' && request.method === 'POST') {
        const { room_code } = await request.json();
        const room = await env.DB.prepare("SELECT * FROM GameRooms WHERE room_code = ? AND status = 'waiting'").bind(room_code.toUpperCase()).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found or already in progress.' }), { status: 404 });
        if (room.player1_id === userId) return new Response(JSON.stringify(room));
        await env.DB.prepare("UPDATE GameRooms SET player2_id = ?, player2_full_name = ?, status = 'in_progress' WHERE id = ?").bind(userId, user.fullName, room.id).run();
        const updatedRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(room.id).first();
        return new Response(JSON.stringify(updatedRoom));
    }

    // 玩家提交数字
    if (pathname.startsWith('/api/room/') && pathname.endsWith('/submit') && request.method === 'POST') {
        const id = pathname.split('/')[3];
        const { number } = await request.json();
        const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });
        const isPlayer1 = room.player1_id === userId;
        const currentNumbers = JSON.parse(isPlayer1 ? room.player1_numbers : room.player2_numbers);
        const sumOfNumbers = currentNumbers.reduce((sum, num) => sum + num, 0);
        if (sumOfNumbers + number > 100) return new Response(JSON.stringify({ error: `Invalid number. Your total points cannot exceed 100.` }), { status: 400 });
        currentNumbers.push(number);
        const sql = isPlayer1 ? "UPDATE GameRooms SET player1_numbers = ? WHERE id = ?" : "UPDATE GameRooms SET player2_numbers = ? WHERE id = ?";
        await env.DB.prepare(sql).bind(JSON.stringify(currentNumbers), id).run();
        const updatedRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify(updatedRoom));
    }

    // 检查回合是否结束并结算分数
    if (pathname.startsWith('/api/room/') && pathname.endsWith('/process-round') && request.method === 'POST') {
        const id = pathname.split('/')[3];
        const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });
        const { current_round, rounds, player1_id, player2_id, player1_numbers, player2_numbers } = room;
        const p1Numbers = JSON.parse(player1_numbers);
        const p2Numbers = JSON.parse(player2_numbers);
        if (p1Numbers.length >= current_round && p2Numbers.length >= current_round) {
            // ... (您的回合结算逻辑不变) ...
        }
        const finalRoomState = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify(finalRoomState));
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
};


export default {
  async fetch(request, env, ctx) {
    // 1. 正确处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*', // 在生产环境中您可能希望限制为您的实际域名
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization', // 必须允许 Authorization 头
        },
      });
    }

    // 2. 初始化 Clerk 客户端，并进行严格的错误检查
    if (!env.CLERK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration error: CLERK_SECRET_KEY is not set." }), { status: 500 });
    }
    const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    
    // 3. 验证用户身份
    const auth = await clerkClient.authenticateRequest({ request });
    if (!auth.isAuthenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    // 4. 将请求传递给您的游戏逻辑API
    try {
        const response = await handleApiRequest(request, env, auth);
        // 为所有成功的API响应添加CORS头
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
    } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  },
};

import { createClerkClient } from "@clerk/backend";

// CORS 预检请求的响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 在生产环境中您可能希望限制为您的实际域名
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    // 立即处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 初始化 Clerk 客户端
    if (!env.CLERK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration error: CLERK_SECRET_KEY is not set." }), { status: 500, headers: corsHeaders });
    }
    const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    
    // 验证用户身份
    const auth = await clerkClient.authenticateRequest({ request });
    if (!auth.isAuthenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { pathname } = new URL(request.url);
    const { userId, user } = auth; // 从安全的 auth 对象中获取用户信息

    try {
      // --- API 路由 ---
      
      // 获取房间列表
      if (pathname === '/api/rooms' && request.method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM GameRooms WHERE status = 'waiting' ORDER BY created_date DESC LIMIT 20").all();
        return new Response(JSON.stringify(results || []), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 创建新房间
      if (pathname === '/api/rooms' && request.method === 'POST') {
        const body = await request.json();
        const newRoomId = crypto.randomUUID();
        await env.DB.prepare(
            `INSERT INTO GameRooms (id, room_name, room_code, rounds, player1_id, player1_full_name) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(newRoomId, body.room_name, body.room_code, body.rounds, userId, user.fullName).run();
        const newRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(newRoomId).first();
        return new Response(JSON.stringify(newRoom), { status: 201, headers: corsHeaders });
      }

      // 获取单个房间信息
      const roomMatch = pathname.match(/^\/api\/room\/([a-zA-Z0-9-]+)$/);
      if (roomMatch && request.method === 'GET') {
        const id = roomMatch[1];
        const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: corsHeaders });
        return new Response(JSON.stringify(room), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 加入房间
      if (pathname === '/api/join-by-code' && request.method === 'POST') {
        const { room_code } = await request.json();
        const room = await env.DB.prepare("SELECT * FROM GameRooms WHERE room_code = ? AND status = 'waiting'").bind(room_code.toUpperCase()).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found or already in progress.' }), { status: 404, headers: corsHeaders });
        if (room.player1_id === userId) return new Response(JSON.stringify(room), { headers: corsHeaders });
        await env.DB.prepare("UPDATE GameRooms SET player2_id = ?, player2_full_name = ?, status = 'in_progress' WHERE id = ?").bind(userId, user.fullName, room.id).run();
        const updatedRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(room.id).first();
        return new Response(JSON.stringify(updatedRoom), { headers: corsHeaders });
      }
      
      // 提交数字
      const submitMatch = pathname.match(/^\/api\/room\/([a-zA-Z0-9-]+)\/submit$/);
      if (submitMatch && request.method === 'POST') {
        const id = submitMatch[1];
        const { number } = await request.json();
        const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: corsHeaders });
        const isPlayer1 = room.player1_id === userId;
        const currentNumbers = JSON.parse(isPlayer1 ? room.player1_numbers : room.player2_numbers);
        const sumOfNumbers = currentNumbers.reduce((sum, num) => sum + num, 0);
        if (sumOfNumbers + number > 100) return new Response(JSON.stringify({ error: `Invalid number. Your total points cannot exceed 100.` }), { status: 400, headers: corsHeaders });
        currentNumbers.push(number);
        const sql = isPlayer1 ? "UPDATE GameRooms SET player1_numbers = ? WHERE id = ?" : "UPDATE GameRooms SET player2_numbers = ? WHERE id = ?";
        await env.DB.prepare(sql).bind(JSON.stringify(currentNumbers), id).run();
        const updatedRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify(updatedRoom), { headers: corsHeaders });
      }
      
      // 处理回合
      const processMatch = pathname.match(/^\/api\/room\/([a-zA-Z0-9-]+)\/process-round$/);
      if (processMatch && request.method === 'POST') {
        const id = processMatch[1];
        // ... (此处省略您的回合处理逻辑，因为它无需改变) ...
        const finalRoomState = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify(finalRoomState), { headers: corsHeaders });
      }
      
      // 如果没有匹配的路由
      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  },
};

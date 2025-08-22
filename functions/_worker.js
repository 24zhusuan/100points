import { createClerkClient } from "@clerk/backend";

// 这个函数将成为我们的API路由器
const apiRouter = {
  // 获取活跃的、等待中的房间列表
  async GET_rooms(request, env) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM GameRooms WHERE status = 'waiting' ORDER BY created_date DESC LIMIT 20"
    ).all();
    return new Response(JSON.stringify(results || []), { headers: { 'Content-Type': 'application/json' } });
  },

  // 获取单个房间的详细信息
  async GET_room(request, env, params) {
    const id = params.id;
    if (!id) return new Response(JSON.stringify({ error: 'Room ID is required' }), { status: 400 });
    
    const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
    if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });

    return new Response(JSON.stringify(room), { headers: { 'Content-Type': 'application/json' } });
  },
  
  // 创建新房间
  async POST_rooms(request, env, auth) {
    const { userId, user } = auth;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    
    const body = await request.json();
    const newRoomId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO GameRooms (id, room_name, room_code, rounds, player1_id, player1_full_name) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(newRoomId, body.room_name, body.room_code, body.rounds, userId, user.fullName).run();
    
    const newRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(newRoomId).first();
    return new Response(JSON.stringify(newRoom), { status: 201, headers: { 'Content-Type': 'application/json' } });
  },

  // ... 其他API路由可以继续添加在这里 ...
  
  // 404 Not Found
  async NOT_FOUND() {
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
  }
};


export default {
  async fetch(request, env, ctx) {
    // 初始化 Clerk 客户端
    const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    const { pathname } = new URL(request.url);

    // Clerk 认证中间件
    const auth = await clerkClient.authenticateRequest({ request });
    if (!auth.isAuthenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 简单的路由逻辑
    const method = request.method;
    
    if (pathname === '/api/rooms') {
      if (method === 'GET') return apiRouter.GET_rooms(request, env);
      if (method === 'POST') return apiRouter.POST_rooms(request, env, auth);
    }
    
    const roomMatch = pathname.match(/^\/api\/room\/([a-zA-Z0-9-]+)$/);
    if (roomMatch && method === 'GET') {
      return apiRouter.GET_room(request, env, { id: roomMatch[1] });
    }

    return apiRouter.NOT_FOUND();
  },
};

import { createClerkClient } from "@clerk/backend";

// CORS 预检请求的响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 在生产环境中您可能希望限制为您的实际域名
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 您的完整游戏逻辑
async function handleApiRequest(request, env, auth) {
    const { pathname } = new URL(request.url);
    const { userId, user } = auth; // 从安全的 auth 对象中获取用户信息

    const responseHeaders = {
        ...corsHeaders,
        'Content-Type': 'application/json'
    };

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
        ).bind(newRoomId, body.room_name, body.room_code, body.rounds, userId, user.fullName).run();
        
        const newRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(newRoomId).first();
        return new Response(JSON.stringify(newRoom), { status: 201, headers: responseHeaders });
    }

    // 通过房间代码加入房间
    if (pathname === '/api/join-by-code' && request.method === 'POST') {
        const { room_code } = await request.json();
        const room = await env.DB.prepare(
            "SELECT * FROM GameRooms WHERE room_code = ? AND status = 'waiting'"
        ).bind(room_code.toUpperCase()).first();

        if (!room) {
            return new Response(JSON.stringify({ error: 'Room not found or already in progress.' }), { status: 404, headers: responseHeaders });
        }
        
        if (room.player1_id === userId) {
            return new Response(JSON.stringify(room), { headers: responseHeaders });
        }

        await env.DB.prepare(
            "UPDATE GameRooms SET player2_id = ?, player2_full_name = ?, status = 'in_progress' WHERE id = ?"
        ).bind(userId, user.fullName, room.id).run();
        
        const updatedRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(room.id).first();
        return new Response(JSON.stringify(updatedRoom), { headers: responseHeaders });
    }

    // 玩家提交数字
    const submitMatch = pathname.match(/^\/api\/room\/([a-zA-Z0-9-]+)\/submit$/);
    if (submitMatch && request.method === 'POST') {
        const id = submitMatch[1];
        const { number } = await request.json();

        const room = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: responseHeaders });
        
        const isPlayer1 = room.player1_id === userId;
        const currentNumbersStr = isPlayer1 ? room.player1_numbers : room.player2_numbers;
        const currentNumbers = JSON.parse(currentNumbersStr || '[]');
        
        const sumOfNumbers = currentNumbers.reduce((sum, num) => sum + num, 0);
        if (sumOfNumbers + number > 100) {
            return new Response(JSON.stringify({ error: `Invalid number. Your total points cannot exceed 100. You have ${100 - sumOfNumbers} points remaining.` }), { status: 400, headers: responseHeaders });
        }

        currentNumbers.push(number);

        const sql = isPlayer1 
            ? "UPDATE GameRooms SET player1_numbers = ? WHERE id = ?"
            : "UPDATE GameRooms SET player2_numbers = ? WHERE id = ?";
        
        await env.DB.prepare(sql).bind(JSON.stringify(currentNumbers), id).run();

        const updatedRoom = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify(updatedRoom), { headers: responseHeaders });
    }
      
    // 检查回合是否结束并结算分数
    const processMatch = pathname.match(/^\/api\/room\/([a-zA-Z0-9-]+)\/process-round$/);
    if (processMatch && request.method === 'POST') {
        const id = processMatch[1];
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
                else if (newP2Score > newP1Score) winnerId = player2_id;
                else winnerId = "tie";
            }
              
            await env.DB.prepare(
                `UPDATE GameRooms SET player1_score = ?, player2_score = ?, current_round = ?, status = ?, winner_id = ? WHERE id = ?`
            ).bind(newP1Score, newP2Score, newRound, newStatus, winnerId === "tie" ? null : winnerId, id).run();
        }

        const finalRoomState = await env.DB.prepare('SELECT * FROM GameRooms WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify(finalRoomState), { headers: responseHeaders });
    }

    // 如果没有匹配的路由
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: responseHeaders });
}

// ==========[ 修改部分开始 ]==========
// Cloudflare Pages 的新入口点
export const onRequest = async ({ request, env }) => {
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (!env.CLERK_SECRET_KEY || !env.VITE_CLERK_PUBLISHABLE_KEY) {
        return new Response(JSON.stringify({ error: "Server configuration error: Clerk keys are not set." }), { status: 500, headers: corsHeaders });
    }
    
    const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    
    try {
        const auth = await clerkClient.authenticateRequest({
            request,
            secretKey: env.CLERK_SECRET_KEY,
            publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
        });

        if (!auth.isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }
        
        // 将请求传递给您的游戏逻辑API
        return await handleApiRequest(request, env, auth);

    } catch (e) {
        console.error("Authentication error:", e);
        return new Response(JSON.stringify({ error: "Authentication failed: " + e.message }), { status: 401, headers: corsHeaders });
    }
};
// ==========[ 修改部分结束 ]==========

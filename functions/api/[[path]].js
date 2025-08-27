// --- 调试专用代码 ---
// 这个文件的唯一目的就是检查环境变量

export const onRequest = async ({ request, env }) => {
    const responseHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: responseHeaders });
    }

    // 构建一个包含所有关键环境变量状态的调试对象
    const debugInfo = {
        message: "这是一个用来检查Cloudflare环境变量的调试响应。",
        
        CLERK_SECRET_KEY: {
            is_defined: env.CLERK_SECRET_KEY !== undefined && env.CLERK_SECRET_KEY !== null,
            is_string: typeof env.CLERK_SECRET_KEY === 'string',
            is_not_empty: typeof env.CLERK_SECRET_KEY === 'string' && env.CLERK_SECRET_KEY.trim() !== '',
            // 为了安全，我们只显示密钥的前5个字符
            partial_value: typeof env.CLERK_SECRET_KEY === 'string' ? `${env.CLERK_SECRET_KEY.substring(0, 5)}...` : null,
        },

        CLERK_ISSUER_URL: {
            is_defined: env.CLERK_ISSUER_URL !== undefined && env.CLERK_ISSUER_URL !== null,
            is_string: typeof env.CLERK_ISSUER_URL === 'string',
            is_not_empty: typeof env.CLERK_ISSUER_URL === 'string' && env.CLERK_ISSUER_URL.trim() !== '',
            value: env.CLERK_ISSUER_URL || null,
        },

        DB_BINDING: {
            is_defined: env.DB !== undefined && env.DB !== null,
        }
    };

    // 将调试信息作为JSON返回
    return new Response(JSON.stringify(debugInfo, null, 2), {
        status: 200, // 我们期望这次请求是成功的 (200 OK)
        headers: responseHeaders
    });
};

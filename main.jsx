import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';

// 从Vite的环境变量中读取Clerk Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your Cloudflare Pages environment variables.");
}

// ！！！ 这是最重要的部分 ！！！
// 您需要登录 Clerk Dashboard, 找到您的【主应用】(Primary Application),
// 然后复制它的 "Frontend API" URL 粘贴到这里。
// 它看起来应该类似于 "clerk.your-primary-domain.com" (不带 https://)。
// 我根据您的域名结构猜测它可能是 'clerk.zhusuan.dpdns.org'，但请务必核实！
const CLERK_FRONTEND_API = "clerk.zhusuan.dpdns.org"; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      frontendApi={CLERK_FRONTEND_API}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);

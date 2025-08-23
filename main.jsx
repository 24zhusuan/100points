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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      domain="100points.zhusuan.dpdns.org"
      isSatellite
      // 如果这是一个卫星应用，请取消下面一行的注释，并填入您的主应用 URL
      // proxyUrl="<YOUR_PRIMARY_APP_URL>"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);


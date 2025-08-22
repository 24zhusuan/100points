import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';

// 从 Clerk 官网获取你的 Publishable Key
const PUBLISHABLE_KEY = 'VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZW5hYmxlZC1nZWxkaW5nLTc3LmNsZXJrLmFjY291bnRzLmRldiQ'; // 替换成你自己的 Key

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
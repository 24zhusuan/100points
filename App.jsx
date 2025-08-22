import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import GameRoom from './GameRoom';
import './styles/global.css'; // 引入全局样式

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/GameRoom" element={<GameRoom />} />
        {/* 默认路由或404页面可以添加在这里 */}
      </Routes>
    </Layout>
  );
}

export default App;
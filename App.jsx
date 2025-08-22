import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.jsx';       // 从 .js 修改为 .jsx
import Dashboard from './Dashboard.jsx';   // 从 .js 修改为 .jsx
import GameRoom from './GameRoom.jsx';     // 从 .js 修改为 .jsx
import './styles/global.css';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/GameRoom" element={<GameRoom />} />
      </Routes>
    </Layout>
  );
}

export default App;
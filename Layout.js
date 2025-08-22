import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Users, Home, LogOut, User as UserIcon } from "lucide-react"; // 重命名 User 为 UserIcon 避免冲突
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
// 新增: 导入 Clerk 组件和钩子
import { useUser, UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  // 更改点: 暂时移除直接访问 GameRoom 的链接，因为需要 room id
  // {
  //   title: "Game Room",
  //   url: createPageUrl("GameRoom"),
  //   icon: Trophy,
  // },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  // 新增: 使用 Clerk 的 useUser 钩子获取用户信息
  const { user } = useUser();

  // 更改点: 删除了旧的 useEffect 和 handleLogout 方法，Clerk 会自动处理

  return (
    <SidebarProvider>
      <style>{`
        /* CSS 样式保持不变 */
        :root { --primary: #3B82F6; --primary-dark: #1E40AF; --background: #0F172A; --surface: #1E293B; --surface-light: #334155; --text-primary: #F8FAFC; --text-secondary: #CBD5E1; --accent: #06B6D4; --success: #10B981; --warning: #F59E0B; --danger: #EF4444; }
        body { background: linear-gradient(135deg, var(--background) 0%, #1E293B 100%); color: var(--text-primary); }
        .glass-effect { backdrop-filter: blur(20px); background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.2); }
        .game-glow { box-shadow: 0 0 30px rgba(59, 130, 246, 0.3); }
      `}</style>
      <div className="min-h-screen flex w-full bg-slate-900">
        <Sidebar className="border-r border-slate-700 bg-slate-900">
          <SidebarHeader className="border-b border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center game-glow">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-slate-100">NumberDuel</h2>
                <p className="text-xs text-slate-400">Competitive Gaming Platform</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2 bg-slate-900">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2">
                Game Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' : 'text-slate-300'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-2">
                Quick Stats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300">Active Rooms</span>
                    <span className="ml-auto font-bold text-cyan-400">Live</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-slate-300">Your Rank</span>
                    <span className="ml-auto font-bold text-yellow-400">#1</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* 更改点: 使用 Clerk 的 SignedIn 和 SignedOut 组件来控制显示内容 */}
          <SidebarFooter className="border-t border-slate-700 p-4 bg-slate-900">
            <SignedIn>
              <div className="flex items-center gap-3">
                {/* UserButton 会显示用户头像，并提供登出等操作 */}
                <UserButton afterSignOutUrl="/" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 text-sm truncate">{user?.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">Ready to compete</p>
                </div>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                  Sign In to Play
                </Button>
              </SignInButton>
            </SignedOut>
          </SidebarFooter>

        </Sidebar>
        <main className="flex-1 flex flex-col bg-slate-900">
          <header className="bg-slate-800/50 border-b border-slate-700 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-700 p-2 rounded-lg transition-colors duration-200 text-slate-300" />
              <h1 className="text-xl font-bold text-slate-100">NumberDuel</h1>
            </div>
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
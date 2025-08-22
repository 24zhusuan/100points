import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// 这个函数被用来生成页面URL，确保路由一致性
export function createPageUrl(pageName) {
    // 对于简单的路由，可以直接返回路径
    // 如果您的路由变复杂，可以在这里统一管理
    if (pageName === "Dashboard") {
        return "/";
    }
    if (pageName === "GameRoom") {
        return "/GameRoom";
    }
    return "/";
}
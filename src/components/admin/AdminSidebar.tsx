"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  FileText, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  ExternalLink,
  ChevronLeft,
  PlusCircle,
  BarChart2
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { signOut } from "next-auth/react";

const menuItems = [
  { icon: LayoutDashboard, label: "Admin Home", href: "/admin" },
  { icon: BarChart2, label: "Analytics", href: "/admin/stats" },
  { icon: FileText, label: "Blog Posts", href: "/admin/blog" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export default function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-white/5 bg-zinc-950/50 backdrop-blur-xl transition-all duration-300 z-50 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Image 
                src="/favicon.svg" 
                alt="Logo" 
                width={32} 
                height={32} 
                className="object-contain" 
              />
            </div>
            <span className="font-bold text-xl tracking-tight">GitPulse</span>
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${
                isActive
                  ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${
                  isActive ? "text-purple-400" : "group-hover:text-purple-400 transition-colors"
                }`}
              />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span className="font-medium">{item.label}</span>
                </div>
              )}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-white/5">
            <Link
              href="/blog"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group"
            >
              <ExternalLink className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
              {!isCollapsed && <span className="font-medium">View Public Blog</span>}
            </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

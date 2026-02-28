"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TerminalSquare,
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  ClipboardCheck,
  Layers,
  Bot,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Study",
    href: "/dashboard/study",
    icon: BookOpen,
  },
  {
    label: "Labs",
    href: "/dashboard/labs",
    icon: FlaskConical,
  },
  {
    label: "Practice Exams",
    href: "/dashboard/practice",
    icon: ClipboardCheck,
  },
  {
    label: "Flashcards",
    href: "/dashboard/flashcards",
    icon: Layers,
  },
  {
    label: "AI Tutor",
    href: "/dashboard/tutor",
    icon: Bot,
  },
];

interface SidebarProps {
  pathname: string;
}

export function Sidebar({ pathname }: SidebarProps) {
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "Student";
  const userEmail = session?.user?.email ?? "student@devnet.lab";
  const initials = userName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <TerminalSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-zinc-50 tracking-tight">
            DevNet StudyLab
          </h1>
          <p className="text-[11px] text-zinc-500 font-medium">200-901 Exam Prep</p>
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <TooltipProvider>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-emerald-500" : "text-zinc-500"
                      )}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      <Separator className="bg-zinc-800" />

      {/* Bottom section */}
      <div className="px-3 py-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            pathname === "/dashboard/settings"
              ? "bg-emerald-500/10 text-emerald-500"
              : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
          )}
        >
          <Settings className="h-[18px] w-[18px] text-zinc-500" />
          <span>Settings</span>
        </Link>

        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <Avatar size="sm">
            <AvatarFallback className="bg-emerald-500/10 text-emerald-500 text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-300 truncate">{userName}</p>
            <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
          </div>
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

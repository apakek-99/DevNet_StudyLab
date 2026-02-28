"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-[80%]">
      <Avatar size="sm" className="mt-1 shrink-0">
        <AvatarFallback className="bg-emerald-500/10 text-emerald-500">
          <Bot className="h-3.5 w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="sr-only">AI is typing</span>
          <span
            className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "600ms" }}
          />
          <span
            className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "600ms" }}
          />
          <span
            className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "600ms" }}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bot, User, Copy, Check } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ParsedSegment {
  type: "text" | "code-block" | "inline-code";
  content: string;
  language?: string;
}

function parseContent(raw: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  // Match fenced code blocks: ```lang\n...\n```
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(raw)) !== null) {
    // Text before this code block
    if (match.index > lastIndex) {
      const textBefore = raw.slice(lastIndex, match.index);
      segments.push(...parseInlineCode(textBefore));
    }
    segments.push({
      type: "code-block",
      language: match[1] || undefined,
      content: match[2].replace(/\n$/, ""),
    });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < raw.length) {
    segments.push(...parseInlineCode(raw.slice(lastIndex)));
  }

  return segments;
}

function parseInlineCode(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const inlineRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "inline-code", content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

function renderTextWithFormatting(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split into lines for list detection
  const lines = text.split("\n");

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      nodes.push(<br key={`br-${lineIndex}`} />);
    }

    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        nodes.push(
          <strong key={`b-${lineIndex}-${partIndex}`} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      } else if (part.match(/^(\s*)[-*]\s+(.+)$/)) {
        const m = part.match(/^(\s*)[-*]\s+(.+)$/);
        if (m) {
          const indent = m[1].length > 0 ? "ml-4" : "ml-0";
          nodes.push(
            <span key={`li-${lineIndex}-${partIndex}`} className={cn("flex items-start gap-2", indent)}>
              <span className="text-emerald-500 mt-0.5 shrink-0">&#x2022;</span>
              <span>{m[2]}</span>
            </span>
          );
        }
      } else if (part.match(/^(\d+)\.\s+(.+)$/)) {
        const m = part.match(/^(\d+)\.\s+(.+)$/);
        if (m) {
          nodes.push(
            <span key={`ol-${lineIndex}-${partIndex}`} className="flex items-start gap-2">
              <span className="text-emerald-500 shrink-0 font-medium">{m[1]}.</span>
              <span>{m[2]}</span>
            </span>
          );
        }
      } else {
        nodes.push(
          <span key={`t-${lineIndex}-${partIndex}`}>{part}</span>
        );
      }
    });
  });

  return nodes;
}

function CodeBlock({ content, language }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [content]);

  return (
    <div className="my-2 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-700/50">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-700/50">
        <span className="text-xs text-zinc-400 font-mono">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          className="text-zinc-400 hover:text-zinc-200"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-sm">
        <code className="font-mono text-zinc-200 leading-relaxed">{content}</code>
      </pre>
    </div>
  );
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  const parsed = useMemo(() => parseContent(content), [content]);

  const formattedTime = useMemo(() => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [timestamp]);

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar size="sm" className="mt-1 shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-emerald-500/10 text-emerald-500"
          )}
        >
          {isUser ? (
            <User className="h-3.5 w-3.5" />
          ) : (
            <Bot className="h-3.5 w-3.5" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-emerald-600 text-white rounded-tr-sm"
              : "bg-zinc-800 text-zinc-100 rounded-tl-sm"
          )}
        >
          {parsed.map((segment, i) => {
            if (segment.type === "code-block") {
              return (
                <CodeBlock
                  key={i}
                  content={segment.content}
                  language={segment.language}
                />
              );
            }
            if (segment.type === "inline-code") {
              return (
                <code
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-zinc-700 font-mono text-xs text-emerald-300"
                >
                  {segment.content}
                </code>
              );
            }
            return (
              <span key={i}>{renderTextWithFormatting(segment.content)}</span>
            );
          })}
        </div>
        <span
          className={cn(
            "text-[11px] text-zinc-500 px-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}

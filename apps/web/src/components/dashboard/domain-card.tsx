"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Layers, FlaskConical, ChevronRight } from "lucide-react";

export interface DomainData {
  number: number;
  name: string;
  slug: string;
  weight: number;
  progress: number;
  stats: {
    objectivesCompleted: number;
    objectivesTotal: number;
    flashcardsDue: number;
    labsDone: number;
    labsTotal: number;
  };
}

interface DomainCardProps {
  domain: DomainData;
}

export function DomainCard({ domain }: DomainCardProps) {
  return (
    <Link href={`/dashboard/study/${domain.slug}`}>
      <Card className="group border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-xs font-bold text-emerald-500">
                {domain.number}
              </span>
              <CardTitle className="text-sm font-semibold text-zinc-200 leading-tight">
                {domain.name}
              </CardTitle>
            </div>
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] font-semibold shrink-0"
            >
              {domain.weight}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Progress</span>
              <span className="font-medium text-emerald-400">
                {domain.progress}%
              </span>
            </div>
            <Progress
              value={domain.progress}
              className="h-1.5 bg-zinc-800 [&>[data-slot=progress-indicator]]:bg-emerald-500"
            />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <BookOpen className="h-3 w-3 text-zinc-500" />
              <span>
                {domain.stats.objectivesCompleted}/{domain.stats.objectivesTotal}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Layers className="h-3 w-3 text-zinc-500" />
              <span>{domain.stats.flashcardsDue} due</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <FlaskConical className="h-3 w-3 text-zinc-500" />
              <span>
                {domain.stats.labsDone}/{domain.stats.labsTotal}
              </span>
            </div>
          </div>

          {/* Go arrow */}
          <div className="flex items-center justify-end text-xs text-zinc-500 group-hover:text-emerald-400 transition-colors">
            <span className="mr-1">Study</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

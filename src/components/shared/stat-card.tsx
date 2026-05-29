import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTrend = {
  value: number;
  label?: string;
};

export type StatAccent =
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "fuchsia";

const accentStyles: Record<
  StatAccent,
  { glow: string; icon: string; bar: string }
> = {
  violet: {
    glow: "from-violet-500/20 via-violet-400/5 to-transparent",
    icon: "bg-violet-500/15 text-violet-600 ring-violet-500/20 dark:text-violet-300",
    bar: "bg-violet-500",
  },
  emerald: {
    glow: "from-emerald-500/20 via-emerald-400/5 to-transparent",
    icon: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  amber: {
    glow: "from-amber-500/25 via-amber-400/5 to-transparent",
    icon: "bg-amber-500/15 text-amber-700 ring-amber-500/20 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  rose: {
    glow: "from-rose-500/20 via-rose-400/5 to-transparent",
    icon: "bg-rose-500/15 text-rose-600 ring-rose-500/20 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  sky: {
    glow: "from-sky-500/20 via-sky-400/5 to-transparent",
    icon: "bg-sky-500/15 text-sky-600 ring-sky-500/20 dark:text-sky-300",
    bar: "bg-sky-500",
  },
  fuchsia: {
    glow: "from-fuchsia-500/20 via-fuchsia-400/5 to-transparent",
    icon: "bg-fuchsia-500/15 text-fuchsia-600 ring-fuchsia-500/20 dark:text-fuchsia-300",
    bar: "bg-fuchsia-500",
  },
};

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: StatTrend;
  accent?: StatAccent;
  className?: string;
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  accent = "violet",
  className,
}: StatCardProps) {
  const isPositive = trend ? trend.value >= 0 : undefined;
  const styles = accentStyles[accent];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-md",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-br opacity-80",
          styles.glow
        )}
      />
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1 rounded-l-2xl opacity-80",
          styles.bar
        )}
      />
      <div className="relative flex items-start justify-between gap-4 pl-2">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 text-xs">
              {isPositive ? (
                <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="size-3.5 text-rose-600 dark:text-rose-400" />
              )}
              <span
                className={cn(
                  "font-medium",
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {isPositive ? "+" : ""}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
            styles.icon
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

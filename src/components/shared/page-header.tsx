import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="hidden h-8 w-1 rounded-full bg-linear-to-b from-primary via-brand-fuchsia to-brand-emerald sm:block" />
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="gradient-text">{title}</span>
          </h1>
        </div>
        {description && (
          <p className="max-w-2xl pl-0 text-sm text-muted-foreground sm:pl-4">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

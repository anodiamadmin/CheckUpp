import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatePanelProps {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
}

export const EmptyStatePanel = ({
  title,
  description,
  icon = <Inbox className="size-5 text-muted-foreground" />,
  className,
}: StatePanelProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center",
        className
      )}
    >
      <div className="rounded-full bg-background p-2">{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-lg text-xs text-muted-foreground">{description}</p>
    </div>
  );
};

export const ErrorStatePanel = ({
  title,
  description,
  icon = <AlertTriangle className="size-5 text-destructive" />,
  className,
}: StatePanelProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center",
        className
      )}
    >
      <div className="rounded-full bg-background p-2">{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-lg text-xs text-muted-foreground">{description}</p>
    </div>
  );
};

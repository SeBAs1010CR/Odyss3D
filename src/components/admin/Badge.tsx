import type { ReactNode } from "react";
import { cn } from "@/lib/admin/utils";

type Tone = "slate" | "green" | "blue" | "amber" | "red" | "yellow" | "orange";

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cn("badge", `badge-${tone}`, className)}>{children}</span>;
}
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type MeshBackgroundProps = {
  className?: string;
};

export function MeshBackground({ className }: MeshBackgroundProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background",
        className
      )}
      aria-hidden
    >
      <motion.div
        className="absolute -left-1/4 top-0 size-[65vw] rounded-full bg-violet-500/30 blur-[100px] dark:bg-violet-500/20"
        animate={{ x: [0, 50, 0], y: [0, 35, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 top-1/4 size-[55vw] rounded-full bg-fuchsia-500/25 blur-[100px] dark:bg-fuchsia-500/15"
        animate={{ x: [0, -40, 0], y: [0, 45, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/4 size-[50vw] rounded-full bg-emerald-400/25 blur-[100px] dark:bg-emerald-500/15"
        animate={{ x: [0, 30, 0], y: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 size-[40vw] rounded-full bg-amber-400/20 blur-[90px] dark:bg-amber-500/10"
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] dark:bg-background/60" />
    </div>
  );
}

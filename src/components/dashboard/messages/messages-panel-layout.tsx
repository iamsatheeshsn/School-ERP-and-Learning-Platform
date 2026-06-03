"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MessagesPanelLayoutProps = {
  threadList: React.ReactNode;
  detail: React.ReactNode;
  showDetail: boolean;
  onBack?: () => void;
};

export function MessagesPanelLayout({
  threadList,
  detail,
  showDetail,
  onBack,
}: MessagesPanelLayoutProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className={cn(!showDetail ? "block" : "hidden lg:block")}>
        {threadList}
      </div>
      <div className={cn("lg:col-span-2", showDetail ? "block" : "hidden lg:block")}>
        {showDetail && onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 lg:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
        )}
        {detail}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/Button";

interface PrintButtonProps {
  className?: string;
}

// Client-only Print trigger. Guards against SSR by checking `window`.
export function PrintButton({ className }: PrintButtonProps) {
  const handleClick = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      onClick={handleClick}
      className={className ? `no-print ${className}` : "no-print"}
      aria-label="Print this submission"
    >
      Print
    </Button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  enabled: boolean;
}

export function AdminLogoutButton({ enabled }: Props) {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  if (!enabled) return null;

  const onClick = async () => {
    setWorking(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Button size="sm" variant="secondary" onClick={onClick} disabled={working}>
      {working ? "Выход..." : "Выйти"}
    </Button>
  );
}

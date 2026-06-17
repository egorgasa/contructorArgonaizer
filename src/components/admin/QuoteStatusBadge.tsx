import { QUOTE_STATUSES } from "@/lib/constants";

export function QuoteStatusBadge({ status }: { status: string }) {
  const def = QUOTE_STATUSES.find((s) => s.value === status);
  const color = def?.color ?? "bg-gray-100 text-gray-700";
  const label = def?.label ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}

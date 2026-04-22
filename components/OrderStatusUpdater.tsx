"use client";

import { updateOrderStatus } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/types";
import { useState } from "react";

const ALL_STATUSES: OrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export function OrderStatusUpdater({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as OrderStatus;
    setStatus(newStatus);
    setSaving(true);
    setSaved(false);
    await updateOrderStatus(orderId, newStatus);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white disabled:opacity-60"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-zinc-500">Saving…</span>}
      {saved && <span className="text-xs text-green-600">Saved</span>}
    </div>
  );
}

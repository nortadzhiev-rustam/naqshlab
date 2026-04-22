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
        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-60 transition-all"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-zinc-400">Saving…</span>}
      {saved && <span className="text-xs font-semibold text-emerald-500">Saved ✓</span>}
    </div>
  );
}

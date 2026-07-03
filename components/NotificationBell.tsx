"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, CheckCheck, ArrowDownCircle, ArrowUpCircle, ShieldCheck, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, typeof Bell> = {
  deposit: ArrowDownCircle,
  withdrawal: ArrowUpCircle,
  verification: ShieldCheck,
  account: Wallet,
};

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PATCH", credentials: "include" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="rounded-lg relative w-9 h-9 flex items-center justify-center transition-all"
        style={{ color: "rgba(255,255,255,0.55)" }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#C8963E,#E4B86A)", color: "#0B1D3A" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden rounded-2xl border z-50 flex flex-col"
          style={{
            background: "#122549",
            borderColor: "rgba(200,150,62,0.22)",
            boxShadow: "0 16px 48px rgba(11,29,58,0.75)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "rgba(200,150,62,0.12)" }}
          >
            <span className="text-sm font-bold text-white">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] flex items-center gap-1 font-semibold"
                style={{ color: "#E4B86A" }}
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                No notifications yet
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <div
                    key={n._id}
                    className="flex gap-3 px-4 py-3 border-b"
                    style={{
                      borderColor: "rgba(200,150,62,0.08)",
                      background: n.read ? "transparent" : "rgba(200,150,62,0.06)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(200,150,62,0.15)" }}
                    >
                      <Icon className="w-4 h-4" style={{ color: "#E4B86A" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{n.title}</p>
                      <p className="text-[11px] leading-snug mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                        {n.message}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

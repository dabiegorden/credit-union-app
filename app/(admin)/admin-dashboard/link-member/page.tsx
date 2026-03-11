"use client";

/**
 * PLACE THIS FILE AT: src/app/admin/members/link/page.tsx
 *
 * This page solves the ROOT CAUSE of the "Member profile not found" error:
 * A User account (role: member) exists in the User collection but has NO
 * corresponding Member document — not even one with a matching email.
 *
 * This happens when:
 *   1. Admin creates a Member record manually with one email
 *   2. The actual person registers a User account with a different email
 *   → No link can be established via email fallback
 *
 * This admin page lets you:
 *   A) Link an existing User → existing Member (they have different emails)
 *   B) See which User accounts are already linked
 *   C) Spot unlinked Users and take action
 */

import { useEffect, useState, useCallback } from "react";
import {
  User,
  Link,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  ChevronDown,
  X,
  Loader2,
  ArrowRight,
  Unlink,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ── */
interface UserDoc {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}
interface MemberDoc {
  _id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  userId?: string;
}
interface LinkStatus {
  user: UserDoc;
  linked: boolean;
  member: MemberDoc | null;
}

/* ─── Helpers ── */
const inputCls =
  "w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-200";
const inputStyle: React.CSSProperties = {
  background: "rgba(11,29,58,0.70)",
  border: "1px solid rgba(200,150,62,0.20)",
};
const inputFocus = (e: React.FocusEvent<any>) => {
  e.currentTarget.style.borderColor = "rgba(200,150,62,0.55)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,150,62,0.10)";
};
const inputBlur = (e: React.FocusEvent<any>) => {
  e.currentTarget.style.borderColor = "rgba(200,150,62,0.20)";
  e.currentTarget.style.boxShadow = "none";
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[10px] font-black uppercase tracking-widest mb-2"
        style={{ color: "rgba(228,184,106,0.55)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,17,34,0.82)", backdropFilter: "blur(10px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl"
        style={{
          background: "#0e1f3d",
          border: "1px solid rgba(200,150,62,0.22)",
          boxShadow: "0 28px 70px rgba(7,17,34,0.85)",
        }}
      >
        <div
          className="h-0.75"
          style={{
            background: "linear-gradient(90deg,#C8963E,#E4B86A,#C8963E)",
          }}
        />
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(200,150,62,0.1)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: "linear-gradient(180deg,#C8963E,#E4B86A)" }}
            />
            <h2 className="font-serif font-black text-white text-lg">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main ── */
export default function AdminLinkAccountsPage() {
  const [memberUsers, setMemberUsers] = useState<UserDoc[]>([]);
  const [allMembers, setAllMembers] = useState<MemberDoc[]>([]);
  const [linkStatuses, setLinkStatuses] = useState<LinkStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLinked, setFilterLinked] = useState<
    "all" | "linked" | "unlinked"
  >("all");

  /* Link modal state */
  const [linkModal, setLinkModal] = useState<{ user: UserDoc } | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberDoc | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [linking, setLinking] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      /* Fetch all Users with role=member + all Member documents */
      const [usersRes, membersRes] = await Promise.all([
        fetch("/api/users?role=member&limit=200", {
          credentials: "include",
        }),
        fetch("/api/members?limit=200", { credentials: "include" }),
      ]);
      const [usersJson, membersJson] = await Promise.all([
        usersRes.json(),
        membersRes.json(),
      ]);

      const users: UserDoc[] = usersJson.users ?? [];
      const members: MemberDoc[] = membersJson.members ?? [];
      setMemberUsers(users);
      setAllMembers(members);

      /* Compute link status for each user */
      const statuses: LinkStatus[] = users.map((u) => {
        /* Check if any member is linked to this user (by userId or email) */
        const linked =
          members.find(
            (m) => (m.userId && m.userId === u._id) || m.email === u.email,
          ) ?? null;
        return { user: u, linked: !!linked, member: linked ?? null };
      });
      setLinkStatuses(statuses);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleLink() {
    if (!linkModal || !selectedMember) return;
    setLinking(true);
    try {
      const res = await fetch("/api/admin/members/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: linkModal.user._id,
          memberId: selectedMember._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message);
      setLinkModal(null);
      setSelectedMember(null);
      setMemberSearch("");
      fetchAll();
    } catch {
      toast.error("Network error");
    } finally {
      setLinking(false);
    }
  }

  const displayed = linkStatuses.filter((s) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      s.user.name.toLowerCase().includes(q) ||
      s.user.email.toLowerCase().includes(q) ||
      (s.member?.memberId?.toLowerCase().includes(q) ?? false);
    const matchFilter =
      filterLinked === "all" ||
      (filterLinked === "linked" ? s.linked : !s.linked);
    return matchQ && matchFilter;
  });

  const unlinkedCount = linkStatuses.filter((s) => !s.linked).length;
  const linkedCount = linkStatuses.filter((s) => s.linked).length;

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ background: "#0B1D3A" }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-2"
            style={{
              background: "rgba(200,150,62,0.12)",
              border: "1px solid rgba(200,150,62,0.25)",
              color: "#E4B86A",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8963E] animate-pulse" />
            Admin · Account Management
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl leading-tight">
            Link <span style={{ color: "#E4B86A" }}>Accounts</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Connect User login accounts to Member profiles
          </p>
        </div>
        <button
          onClick={() => {
            setSpinning(true);
            fetchAll();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all"
          style={{
            background: "rgba(200,150,62,0.08)",
            border: "1px solid rgba(200,150,62,0.18)",
            color: "#E4B86A",
          }}
        >
          <RefreshCw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />{" "}
          Refresh
        </button>
      </div>

      {/* Explainer banner */}
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{
          background: "rgba(200,150,62,0.07)",
          border: "1px solid rgba(200,150,62,0.2)",
        }}
      >
        <AlertTriangle
          className="w-5 h-5 shrink-0 mt-0.5"
          style={{ color: "#E4B86A" }}
        />
        <div>
          <p className="text-sm font-bold text-white">
            Why are some accounts unlinked?
          </p>
          <p
            className="text-xs mt-1 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            A User account (login) and a Member profile are separate records.
            When a member registers themselves or uses a different email than
            the one on their Member record, the link breaks. Use the{" "}
            <strong className="text-white">Link →</strong> button to connect
            them manually.
          </p>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Member Users",
            val: linkStatuses.length,
            gradient: "linear-gradient(135deg,#C8963E,#E4B86A)",
          },
          {
            label: "Linked",
            val: linkedCount,
            gradient: "linear-gradient(135deg,#14532d,#4ade80)",
          },
          {
            label: "⚠ Unlinked",
            val: unlinkedCount,
            gradient: "linear-gradient(135deg,#7f1d1d,#f87171)",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border p-4"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {s.label}
            </p>
            <div className="flex items-end gap-2">
              <p className="font-serif font-black text-white text-2xl">
                {s.val}
              </p>
              <div
                className="w-2 h-5 rounded-full mb-0.5"
                style={{ background: s.gradient }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <input
            placeholder="Search by name, email, member ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + " pl-10"}
            style={inputStyle}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
        </div>
        <div className="relative shrink-0">
          <select
            value={filterLinked}
            onChange={(e) => setFilterLinked(e.target.value as any)}
            className={inputCls + " pl-4 pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 150 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="all">All Users</option>
            <option value="linked">Linked Only</option>
            <option value="unlinked">Unlinked Only</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.45)" }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
      >
        <div
          className="grid gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{
            gridTemplateColumns: "1.4fr 1.4fr 100px auto",
            background: "rgba(200,150,62,0.06)",
            borderBottom: "1px solid rgba(200,150,62,0.1)",
            color: "rgba(228,184,106,0.5)",
          }}
        >
          <span>User Account</span>
          <span>Linked Member Profile</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div
                  className="h-12 rounded-xl animate-pulse"
                  style={{ background: "rgba(200,150,62,0.05)" }}
                />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <User
              className="w-8 h-8"
              style={{ color: "rgba(200,150,62,0.22)" }}
            />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>
              No users found
            </p>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "rgba(200,150,62,0.07)" }}
          >
            {displayed.map((s, i) => (
              <motion.div
                key={s.user._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid gap-4 px-5 py-4 items-center group transition-colors duration-100"
                style={{ gridTemplateColumns: "1.4fr 1.4fr 100px auto" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(200,150,62,0.04)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                {/* User */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                    style={{
                      background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                      color: "#0B1D3A",
                    }}
                  >
                    {s.user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {s.user.name}
                    </p>
                    <p
                      className="text-[11px] truncate"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {s.user.email}
                    </p>
                  </div>
                </div>

                {/* Member */}
                {s.linked && s.member ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                      style={{
                        background: "rgba(34,197,94,0.15)",
                        border: "1px solid rgba(34,197,94,0.3)",
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {s.member.firstName} {s.member.lastName}
                      </p>
                      <p className="text-[11px]" style={{ color: "#E4B86A" }}>
                        {s.member.memberId}
                      </p>
                      {s.member.email !== s.user.email && (
                        <p
                          className="text-[10px]"
                          style={{ color: "rgba(245,158,11,0.7)" }}
                        >
                          ⚠ Different email: {s.member.email}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <Unlink className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-300">
                        Not linked
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        No matching Member found
                      </p>
                    </div>
                  </div>
                )}

                {/* Status badge */}
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full w-fit ${s.linked ? "text-emerald-400" : "text-red-400"}`}
                  style={
                    s.linked
                      ? {
                          background: "rgba(34,197,94,0.12)",
                          border: "1px solid rgba(34,197,94,0.28)",
                        }
                      : {
                          background: "rgba(239,68,68,0.12)",
                          border: "1px solid rgba(239,68,68,0.28)",
                        }
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${s.linked ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`}
                  />
                  {s.linked ? "Linked" : "Unlinked"}
                </span>

                {/* Action */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setLinkModal({ user: s.user });
                      setSelectedMember(s.member ?? null);
                      setMemberSearch("");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:-translate-y-0.5"
                    style={
                      s.linked
                        ? {
                            background: "rgba(200,150,62,0.1)",
                            border: "1px solid rgba(200,150,62,0.22)",
                            color: "#E4B86A",
                          }
                        : {
                            background:
                              "linear-gradient(135deg,#C8963E,#E4B86A)",
                            color: "#0B1D3A",
                            boxShadow: "0 4px 12px rgba(200,150,62,0.3)",
                          }
                    }
                  >
                    <Link className="w-3.5 h-3.5" />
                    {s.linked ? "Re-link" : "Link →"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Link Modal ── */}
      <AnimatePresence>
        {linkModal && (
          <Modal
            title={`Link User to Member`}
            onClose={() => {
              setLinkModal(null);
              setSelectedMember(null);
              setMemberSearch("");
            }}
          >
            <div className="space-y-5">
              {/* User card */}
              <Field label="User Account (Login)">
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: "rgba(200,150,62,0.10)",
                    border: "1px solid rgba(200,150,62,0.28)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                    style={{
                      background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                      color: "#0B1D3A",
                    }}
                  >
                    {linkModal.user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {linkModal.user.name}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {linkModal.user.email}
                    </p>
                  </div>
                </div>
              </Field>

              {/* Arrow */}
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 h-px"
                  style={{ background: "rgba(200,150,62,0.15)" }}
                />
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                  }}
                >
                  <ArrowRight className="w-4 h-4 text-[#0B1D3A]" />
                </div>
                <div
                  className="flex-1 h-px"
                  style={{ background: "rgba(200,150,62,0.15)" }}
                />
              </div>

              {/* Member picker */}
              <Field label="Select Member Profile to Link">
                {selectedMember ? (
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: "rgba(34,197,94,0.08)",
                      border: "1px solid rgba(34,197,94,0.25)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                      style={{ background: "rgba(34,197,94,0.2)" }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">
                        {selectedMember.firstName} {selectedMember.lastName}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {selectedMember.memberId} · {selectedMember.email}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                      <X
                        className="w-3.5 h-3.5"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      />
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: "1px solid rgba(200,150,62,0.2)",
                      background: "rgba(11,29,58,0.70)",
                    }}
                  >
                    <div
                      className="relative"
                      style={{
                        borderBottom: "1px solid rgba(200,150,62,0.12)",
                      }}
                    >
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                        style={{ color: "rgba(200,150,62,0.5)" }}
                      />
                      <input
                        placeholder="Search member name or ID…"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full bg-transparent pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 outline-none"
                      />
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                      {(() => {
                        const q = memberSearch.toLowerCase();
                        const filtered = allMembers.filter(
                          (m) =>
                            !q ||
                            `${m.firstName} ${m.lastName}`
                              .toLowerCase()
                              .includes(q) ||
                            m.memberId.toLowerCase().includes(q) ||
                            m.email.toLowerCase().includes(q),
                        );
                        return filtered.length === 0 ? (
                          <p
                            className="text-center text-sm py-8"
                            style={{ color: "rgba(255,255,255,0.25)" }}
                          >
                            No members found
                          </p>
                        ) : (
                          filtered.map((m, i) => (
                            <button
                              key={m._id}
                              type="button"
                              onClick={() => setSelectedMember(m)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                              style={{
                                borderBottom:
                                  i < filtered.length - 1
                                    ? "1px solid rgba(200,150,62,0.07)"
                                    : "none",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(200,150,62,0.07)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "")
                              }
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0"
                                style={{
                                  background:
                                    "linear-gradient(135deg,#C8963E,#E4B86A)",
                                  color: "#0B1D3A",
                                }}
                              >
                                {(m.firstName[0] + m.lastName[0]).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                  {m.firstName} {m.lastName}
                                </p>
                                <p
                                  className="text-[11px] truncate"
                                  style={{ color: "rgba(255,255,255,0.38)" }}
                                >
                                  {m.memberId} · {m.email}
                                </p>
                              </div>
                              <span
                                className="text-[10px] font-bold shrink-0"
                                style={{ color: "#4ade80" }}
                              >
                                Select →
                              </span>
                            </button>
                          ))
                        );
                      })()}
                    </div>
                  </div>
                )}
              </Field>

              {selectedMember &&
                linkModal.user.email !== selectedMember.email && (
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-xl"
                    style={{
                      background: "rgba(245,158,11,0.07)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200 leading-relaxed">
                      The User email (<strong>{linkModal.user.email}</strong>)
                      and Member email (<strong>{selectedMember.email}</strong>)
                      are different. This is the likely cause of the login
                      issue. Linking will resolve it.
                    </p>
                  </div>
                )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setLinkModal(null);
                    setSelectedMember(null);
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLink}
                  disabled={linking || !selectedMember}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                    boxShadow: "0 6px 20px rgba(200,150,62,0.35)",
                  }}
                >
                  {linking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Link className="w-4 h-4" /> Confirm Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

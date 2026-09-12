"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useProfile } from "@/hooks/useProfile";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
}

const HUB_URL = process.env.NEXT_PUBLIC_PROFILE_API_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || "#";

function formatDate(s: string | null): string {
  if (!s) return "N/A";
  try {
    return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return s;
  }
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const statusColors = (status: string) =>
  status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400";

const orgKindColors = (kind: string) =>
  kind === "PERSONAL" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400";

function getSubscriptionPrice(p: { monthly?: { amount: number }; yearly?: { amount: number } } | undefined): string {
  if (!p) return "—";
  if (p.monthly?.amount === 0) return "Free";
  if (p.monthly) return `$${p.monthly.amount}/mo`;
  if (p.yearly) return `$${p.yearly.amount}/yr`;
  return "—";
}

export function ProfileModal({ isOpen, onClose, theme = "dark" }: ProfileModalProps) {
  const { profile, loading, error, fetchProfile } = useProfile();
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (isOpen && !profile && !loading && !error) fetchProfile();
  }, [isOpen, profile, loading, error, fetchProfile]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleClose]);

  if (!isOpen || !mounted || typeof document === "undefined" || !document.body) return null;

  const dark = theme === "dark";
  const overlayCls = `fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? "opacity-0 pointer-events-none" : "opacity-100"}`;
  const containerCls = `relative w-full max-w-xl max-h-[90vh] rounded-2xl overflow-hidden transition-all duration-300 ${dark ? "bg-slate-900 border border-slate-700/50" : "bg-white border border-slate-200"} shadow-xl ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`;
  const cardCls = dark ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50/80 border-slate-200";

  const content = (
    <div className={dark ? "dark" : ""}>
      <div className={overlayCls} onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div className={containerCls} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {!loading && !error && profile && (
            <header className={`border-b px-4 py-3 ${dark ? "border-slate-700/50" : "border-slate-200"}`}>
              <div className="flex items-start gap-3 pr-10">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-violet-500 to-cyan-500 flex-shrink-0">
                  {getInitials(profile.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{profile.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{profile.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">username: {profile.userName || "—"}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusColors(profile.status)}`}>
                      <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                      {profile.status.replace("_", " ")}
                    </span>
                    {profile.emailVerified && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Verified
                      </span>
                    )}
                    {profile.isOnboarded && (
                      <>
                        <span className="text-slate-400 dark:text-slate-500">·</span>
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Onboarded</span>
                      </>
                    )}
                    <span className="flex-1" />
                    <a
                      href="/auth/logout"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Log out
                    </a>
                  </div>
                </div>
              </div>
            </header>
          )}

          <div className="p-4 overflow-auto max-h-[calc(90vh-6rem)]">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-600 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading...</p>
              </div>
            )}

            {error && (
              <div className={`p-4 rounded-xl border text-center ${dark ? "border-red-500/20 bg-red-500/5" : "border-red-200 bg-red-50"}`}>
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
                <button type="button" onClick={fetchProfile} className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors">
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && profile && (
              <div className="flex flex-col gap-3">
                {profile.lastLogin && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Last login {formatDate(profile.lastLogin)}</p>
                )}
                <a
                  href={HUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 transition-opacity"
                >
                  Manage profile on Hub
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Organizations</h3>
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                    {profile.memberships?.length ? (
                      profile.memberships.map((m) => {
                        const sub = m.organization.orgSubscription;
                        const subSub = sub?.subscription;
                        const price = getSubscriptionPrice(subSub?.prices);
                        return (
                          <div key={m.id} className={`rounded-lg border p-2.5 ${cardCls}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-semibold flex-shrink-0 ${orgKindColors(m.organization.kind)}`}>
                                  {m.organization.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{m.organization.name}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Joined {formatDate(m.joinedAt)}
                                    {subSub && ` · ${subSub.title} · ${price}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-shrink-0 gap-1">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${orgKindColors(m.organization.kind)}`}>
                                  {m.organization.kind}
                                </span>
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/15 text-violet-600 dark:text-violet-400`}>
                                  {m.role.name}
                                </span>
                                {sub && (
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${statusColors(sub.status)}`}>
                                    {sub.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className={`py-8 text-center rounded-lg border ${cardCls}`}>
                        <p className="text-xs text-slate-500 dark:text-slate-400">No organizations yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

"use client";
import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    subMessage?: string;
    confirmLabel?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open, title, message, subMessage,
    confirmLabel = "Delete", danger = true, loading = false,
    onConfirm, onCancel,
}: ConfirmDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Focus cancel button when opened (safe default)
    useEffect(() => {
        if (open) setTimeout(() => cancelRef.current?.focus(), 50);
    }, [open]);

    // Esc to cancel
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onCancel(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 500,
                background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "16px",
            }}
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 22,
                    padding: "28px 28px 24px",
                    width: 400, maxWidth: "100%",
                    boxShadow: "0 32px 72px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
                    animation: "dialogIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                }}
            >
                {/* Icon + header */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                        background: danger ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                        border: `1px solid ${danger ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        {danger
                            ? <Trash2 size={20} color="#f87171" />
                            : <AlertTriangle size={20} color="#fbbf24" />
                        }
                    </div>
                    <div style={{ flex: 1, paddingTop: 2 }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px", marginBottom: 4 }}>
                            {title}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                            {message}
                        </div>
                        {subMessage && (
                            <div style={{
                                marginTop: 10, background: danger ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
                                border: `1px solid ${danger ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)"}`,
                                borderRadius: 9, padding: "8px 12px",
                                fontSize: 12, color: danger ? "#f87171" : "#fbbf24",
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                                <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                                {subMessage}
                            </div>
                        )}
                    </div>
                    <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex", marginTop: -2 }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        ref={cancelRef}
                        className="btn btn-ghost"
                        style={{ flex: 1, fontWeight: 700, fontSize: 13 }}
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        style={{
                            flex: 1.5, fontWeight: 800, fontSize: 13,
                            background: danger ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#f59e0b,#d97706)",
                            color: "#fff", border: "none",
                            boxShadow: danger ? "0 4px 16px rgba(239,68,68,0.35)" : "0 4px 16px rgba(245,158,11,0.35)",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                        }}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading
                            ? <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                            : <Trash2 size={13} />
                        }
                        {confirmLabel}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes dialogIn {
                    from { opacity: 0; transform: scale(0.9) translateY(10px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}

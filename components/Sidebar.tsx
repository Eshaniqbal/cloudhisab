"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, getUser } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import {
    LayoutDashboard, Package, Receipt, Layers,
    TrendingUp, Wallet, LogOut, FileText, Sun, Moon, Users, Settings, ChevronUp, CreditCard, RotateCcw,
} from "lucide-react";

const ROLE_LEVEL: Record<string, number> = {
    ACCOUNTANT: 1, CASHIER: 2, MANAGER: 3, SUPER_ADMIN: 4,
};

const ROLE_COLOR: Record<string, string> = {
    SUPER_ADMIN: "var(--indigo-l)",
    MANAGER: "var(--green)",
    ACCOUNTANT: "var(--yellow)",
    CASHIER: "var(--muted)",
};

const NAV_ITEMS = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", minRole: "CASHIER" },
    { href: "/billing", icon: Receipt, label: "Billing/POS", minRole: "CASHIER" },
    { href: "/invoices", icon: FileText, label: "Invoices", minRole: "ACCOUNTANT" },
    { href: "/products", icon: Package, label: "Products", minRole: "MANAGER" },
    { href: "/stock", icon: Layers, label: "Stock", minRole: "MANAGER" },
    { href: "/returns", icon: RotateCcw, label: "Returns", minRole: "MANAGER" },
    { href: "/expenses", icon: Wallet, label: "Expenses", minRole: "ACCOUNTANT" },
    { href: "/customers", icon: Users, label: "Customers", minRole: "CASHIER" },
    { href: "/reports", icon: TrendingUp, label: "Reports", minRole: "ACCOUNTANT" },
    { href: "/reports/gstr1", icon: FileText, label: "GSTR-1 Summary", minRole: "ACCOUNTANT" },
    { href: "/settings", icon: Settings, label: "Settings", minRole: "SUPER_ADMIN" },
];

// ── Sign-out confirmation modal ──────────────────────────────────────────────
function SignOutConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={onCancel}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 18, padding: "30px 28px", width: 340,
                    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                    animation: "fadeInScale 0.18s ease",
                }}
            >
                {/* Icon */}
                <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: "var(--bg-input)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
                }}>
                    <LogOut size={22} color="var(--red)" />
                </div>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
                        Sign out?
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                        You will be signed out of CloudHisaab and redirected to the login page.
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13.5,
                            fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)",
                            background: "var(--bg-input)", color: "var(--muted)", transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--text)"; (e.currentTarget as any).style.background = "var(--bg-card2)"; }}
                        onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--muted)"; (e.currentTarget as any).style.background = "var(--bg-input)"; }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13.5,
                            fontWeight: 700, cursor: "pointer", border: "none",
                            background: "var(--red)",
                            color: "#fff", boxShadow: "0 4px 14px rgba(239,68,68,0.2)",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as any).style.transform = "translateY(-1px)"; }}
                        onMouseLeave={e => { (e.currentTarget as any).style.transform = "none"; }}
                    >
                        Yes, Sign out
                    </button>
                </div>
            </div>

            <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }`}</style>
        </div>
    );
}

export function Sidebar() {
    const path = usePathname();
    const [user, setUser] = useState<any>(null);
    const { theme, toggle } = useTheme();
    const [showSignOutModal, setShowSignOutModal] = useState(false);

    useEffect(() => {
        setUser(getUser());
        const onUserUpdated = (e: Event) => setUser((e as CustomEvent).detail);
        window.addEventListener("ch:user-updated", onUserUpdated);
        return () => window.removeEventListener("ch:user-updated", onUserUpdated);
    }, []);

    const initials = user?.businessName?.charAt(0)?.toUpperCase() || "?";
    const roleColor = ROLE_COLOR[user?.role] || "#94a3b8";

    return (
        <>
            {showSignOutModal && (
                <SignOutConfirmModal
                    onConfirm={() => { setShowSignOutModal(false); logout(); }}
                    onCancel={() => setShowSignOutModal(false)}
                />
            )}

            <aside className="sidebar no-print">
                {/* ── Logo ── */}
                <div style={{ padding: "8px 12px 16px", display: "flex", justifyContent: "center" }}>
                    <img
                        src={theme === "dark" ? "/logo.png" : "/logo1.png"}
                        alt="CloudHisaab Logo"
                        style={{ width: "90%", height: "auto", maxHeight: 60, objectFit: "contain" }}
                    />
                </div>

                {/* ── Nav links ── */}
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    {NAV_ITEMS.filter(item => {
                        const userLevel = ROLE_LEVEL[user?.role || "CASHIER"] || 0;
                        const minLevel = ROLE_LEVEL[item.minRole] || 0;
                        return userLevel >= minLevel;
                    }).map(({ href, icon: Icon, label }) => {
                        const active = path === href || path.startsWith(href + "/");
                        return (
                            <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
                                <Icon size={15} style={{ flexShrink: 0 }} />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                {/* ── Bottom: Theme + Profile + Sign out ── */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>

                    {/* Theme toggle */}
                    <button
                        onClick={toggle}
                        title={theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
                        style={{
                            display: "flex", alignItems: "center", gap: 10, width: "100%",
                            padding: "9px 12px", borderRadius: 10, fontSize: 13.5, fontWeight: 500,
                            color: "var(--muted)", background: "none", border: "none", cursor: "pointer",
                            transition: "all 0.15s", marginBottom: 6,
                        }}
                        onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--text)"; (e.currentTarget as any).style.background = "var(--bg-input)"; }}
                        onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--muted)"; (e.currentTarget as any).style.background = "none"; }}
                    >
                        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>

                    {/* Profile + Sign out card */}
                    {user && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px", borderRadius: 12,
                            background: "var(--bg-card2)", border: "1px solid var(--border)",
                            cursor: "pointer", transition: "all 0.15s", position: "relative",
                        }}
                            onMouseEnter={e => { (e.currentTarget as any).style.borderColor = "rgba(239,68,68,0.3)"; (e.currentTarget as any).style.background = "rgba(239,68,68,0.04)"; }}
                            onMouseLeave={e => { (e.currentTarget as any).style.borderColor = "var(--border)"; (e.currentTarget as any).style.background = "var(--bg-card2)"; }}
                            onClick={() => setShowSignOutModal(true)}
                            title="Sign out"
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 32, height: 32, borderRadius: 99, flexShrink: 0,
                                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, fontWeight: 800, color: "#fff",
                                boxShadow: "0 2px 8px rgba(79,70,229,0.4)",
                            }}>
                                {initials}
                            </div>

                            {/* Name + role */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: 12.5, fontWeight: 700, color: "var(--text)",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                    {user.businessName}
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: roleColor, marginTop: 1 }}>
                                    {user.role}
                                </div>
                            </div>

                            {/* LogOut icon hint */}
                            <LogOut size={14} style={{ color: "var(--red)", opacity: 0.7, flexShrink: 0 }} />
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}

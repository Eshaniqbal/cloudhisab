"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, getUser } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import {
    LayoutDashboard, Package, Receipt, Layers,
    TrendingUp, Wallet, LogOut, Zap, FileText, Sun, Moon, Users,
} from "lucide-react";

const nav = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/billing", icon: Receipt, label: "Billing / POS" },
    { href: "/invoices", icon: FileText, label: "Invoices" },
    { href: "/products", icon: Package, label: "Products" },
    { href: "/stock", icon: Layers, label: "Stock" },
    { href: "/expenses", icon: Wallet, label: "Expenses" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/reports", icon: TrendingUp, label: "Reports" },
];

export function Sidebar() {
    const path = usePathname();
    const [user, setUser] = useState<any>(null);
    const { theme, toggle } = useTheme();

    useEffect(() => {
        setUser(getUser());
    }, []);

    return (
        <aside className="sidebar no-print">
            {/* Logo */}
            <div style={{ padding: "4px 4px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px" }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 14px rgba(79,70,229,0.4)",
                        flexShrink: 0,
                    }}>
                        <Zap size={16} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.2px" }}>CloudHisaab</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>Billing SaaS</div>
                    </div>
                </div>

                {user && (
                    <div style={{
                        marginTop: 4, padding: "8px 12px", borderRadius: 10,
                        background: "rgba(79,70,229,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.businessName}
                        </div>
                        <div style={{ fontSize: 10, color: "#818cf8", marginTop: 2 }}>{user.role}</div>
                    </div>
                )}
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                {nav.map(({ href, icon: Icon, label }) => {
                    const active = path === href || path.startsWith(href + "/");
                    return (
                        <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
                            <Icon size={15} style={{ flexShrink: 0 }} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Theme toggle + Logout */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                {/* Theme toggle */}
                <button
                    onClick={toggle}
                    title={theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
                    style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 12px", borderRadius: 10, fontSize: 13.5, fontWeight: 500,
                        color: "var(--muted)", background: "none", border: "none", cursor: "pointer",
                        transition: "all 0.15s", marginBottom: 4,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-input)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                >
                    {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>

                {/* Logout */}
                <button
                    onClick={logout}
                    style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 12px", borderRadius: 10, fontSize: 13.5, fontWeight: 500,
                        color: "var(--muted)", background: "none", border: "none", cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                >
                    <LogOut size={15} />
                    Sign out
                </button>
            </div>
        </aside>
    );
}

"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { useSubscription } from "@/lib/useSubscription";
import { Zap, Lock, CreditCard, Loader2, Menu } from "lucide-react";

const ROLE_HIERARCHY: Record<string, number> = {
    ACCOUNTANT: 1,
    CASHIER: 2,
    MANAGER: 3,
    SUPER_ADMIN: 4,
};

interface Props {
    children: React.ReactNode;
    /** Optional: minimum role required. Defaults to any authenticated user. */
    requiredRole?: "SUPER_ADMIN" | "MANAGER" | "CASHIER" | "ACCOUNTANT";
}

export function AuthGuard({ children, requiredRole }: Props) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);
    const [allowed, setAllowed] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { status, loading: subLoading } = useSubscription();

    useEffect(() => {
        const ok = isLoggedIn();
        const user = getUser();
        setLoggedIn(ok);
        setMounted(true);

        if (!ok) {
            router.replace("/login");
            return;
        }

        if (requiredRole && user) {
            const userLevel = ROLE_HIERARCHY[user.role] || 0;
            const requiredLevel = ROLE_HIERARCHY[requiredRole] || 99;
            if (userLevel < requiredLevel) {
                setAllowed(false);
            }
        }
    }, [router, requiredRole]);

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [router]);

    // SSR: render nothing (prevents hydration mismatch)
    if (!mounted) return null;
    if (!loggedIn) return null;

    // Show loading while checking subscription (only on first mount)
    if (subLoading && !status) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-app)" }}>
                <Loader2 className="animate-spin" color="#4f46e5" size={32} />
            </div>
        );
    }

    const FloatingToggle = () => (
        <button 
            className="mobile-only toggle-btn"
            onClick={() => setIsSidebarOpen(true)}
            style={{
                position: "fixed", top: 12, left: 12, width: 40, height: 40,
                borderRadius: 10, background: "var(--glass-bg)", 
                backdropFilter: "blur(12px)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 80, color: "var(--text)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
        >
            <Menu size={20} />
        </button>
    );

    // Subscription Gate Rule:
    const isSettings = typeof window !== "undefined" && window.location.pathname === "/settings";
    const isPricing = typeof window !== "undefined" && window.location.pathname === "/pricing";
    const isGated = status && !status.isActive && !isSettings && !isPricing;

    if (isGated) {
        return (
            <div className="app-layout">
                <FloatingToggle />
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <main className="main-content">
                    <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", height: "70vh", padding: 24, textAlign: "center",
                    }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 24,
                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24
                        }}>
                            <CreditCard size={32} color="#ef4444" />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", marginBottom: 8 }}>
                            Subscription Required
                        </h2>
                        <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
                            Your {status.plan !== "NONE" ? `${status.plan} plan` : "trial"} is not active.
                            Please choose a plan in Settings to continue using CloudHisaab and access your business data.
                        </p>

                        <div style={{ display: "flex", gap: 12 }}>
                            <button
                                onClick={() => router.push("/settings")}
                                style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "12px 24px",
                                    borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                                    color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                                    boxShadow: "0 4px 14px rgba(79,70,229,0.4)"
                                }}
                            >
                                <Zap size={16} /> Go to Settings & Plans
                            </button>
                            <button
                                onClick={() => router.push("/login")}
                                style={{
                                    padding: "12px 24px", borderRadius: 12, background: "var(--bg-input)",
                                    color: "var(--text)", fontSize: 14, fontWeight: 600,
                                    border: "1px solid var(--border)", cursor: "pointer"
                                }}
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!allowed) {
        return (
            <div className="app-layout">
                <FloatingToggle />
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <main className="main-content">
                    <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", height: "60vh", gap: 16, textAlign: "center",
                    }}>
                        <div style={{ fontSize: 48 }}>🔒</div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                            Access Denied
                        </h2>
                        <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 340, lineHeight: 1.6 }}>
                            You don't have permission to view this page.
                            Contact your business owner to request access.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <FloatingToggle />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="main-content">{children}</main>
        </div>
    );
}

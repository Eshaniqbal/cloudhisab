"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

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

    // SSR: render nothing (prevents hydration mismatch)
    if (!mounted) return null;
    if (!loggedIn) return null;

    if (!allowed) {
        return (
            <div className="app-layout">
                <Sidebar />
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
            <Sidebar />
            <main className="main-content">{children}</main>
        </div>
    );
}

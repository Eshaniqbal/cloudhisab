"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    // Start as `null` (unknown) — never `false` on server — to avoid hydration mismatch.
    // Once mounted on client we know the real login state.
    const [mounted, setMounted] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        const ok = isLoggedIn();
        setLoggedIn(ok);
        setMounted(true);
        if (!ok) router.replace("/login");
    }, [router]);

    // On first render (SSR + client hydration pass) render nothing —
    // both server and client agree on this, so no mismatch.
    if (!mounted) return null;

    // After mount: if not logged in, redirect is already triggered above.
    if (!loggedIn) return null;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">{children}</main>
        </div>
    );
}

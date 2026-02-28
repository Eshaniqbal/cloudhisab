"use client";
import { useEffect, useState } from "react";

export function useTheme() {
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        // Read saved preference on mount
        const saved = localStorage.getItem("ch-theme") as "dark" | "light" | null;
        const initial = saved || "dark";
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
    }, []);

    const toggle = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("ch-theme", next);
        document.documentElement.setAttribute("data-theme", next);
    };

    return { theme, toggle };
}

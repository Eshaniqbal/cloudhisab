"use client";

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";

export function UpgradePrompt({
  title = "Upgrade required",
  message,
  ctaLabel = "Upgrade to unlock",
  href = "/pricing",
}: {
  title?: string;
  message: string;
  ctaLabel?: string;
  href?: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(99,102,241,0.25)",
        borderRadius: 18,
        padding: "26px 22px",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "rgba(99,102,241,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Lock size={18} color="#818cf8" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.55 }}>
            {message}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={href}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              {ctaLabel} <ArrowRight size={14} />
            </Link>
            <Link
              href="/dashboard"
              className="btn btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


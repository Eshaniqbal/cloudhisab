"use client";

/**
 * app/pricing/page.tsx
 * ---------------------
 * CloudHisaab Pricing page with 7-day free trial + Razorpay checkout.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isLoggedIn } from "@/lib/auth";
import { useSubscription } from "@/lib/useSubscription";
import Script from "next/script";

import { PLANS } from "@/components/Subscription/plans";
import { PlanCard } from "@/components/Subscription/PlanCard";

/* ── Countdown helper ────────────────────────────────────────────── */
function TrialBadge({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="trial-banner">
      <span className="trial-icon">🎉</span>
      <span>
        <strong>7-day free trial</strong> on all plans — no credit card required to start
      </span>
    </div>
  );
}

/* ── Subscription status banner ──────────────────────────────────── */
function StatusBanner({ status }: { status: ReturnType<typeof useSubscription>["status"] }) {
  if (!status || status.plan === "NONE") return null;

  const trialEnd = status.trialEndsAt
    ? new Date(status.trialEndsAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : null;

  const periodEnd = status.currentPeriodEnd
    ? new Date(status.currentPeriodEnd).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : null;

  const statusColor =
    status.status === "active" || status.status === "trialing"
      ? "var(--green)"
      : "var(--yellow)";

  return (
    <div className="sub-status-banner" style={{ borderColor: statusColor }}>
      <div className="sub-status-dot" style={{ background: statusColor }} />
      <div>
        <strong style={{ color: statusColor }}>
          {status.status === "trialing"
            ? `🎉 Free Trial — expires ${trialEnd ?? ""}`
            : status.status === "active"
              ? `✅ ${status.plan} Plan Active`
              : status.status === "cancelled"
                ? "⚠️ Subscription Cancelled"
                : `⚠️ ${status.status}`}
        </strong>
        {periodEnd && status.status === "active" && (
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
            Next billing: {periodEnd}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function PricingPage() {
  const router = useRouter();
  const [selectingPlan, setSelectingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  const { status, loading: statusLoading, creating, subscribe, refetch } = useSubscription();

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  async function handleSelect(planKey: string) {
    if (!loggedIn) {
      router.push("/register");
      return;
    }

    setSelectingPlan(planKey);
    setMessage(null);
    try {
      await subscribe(planKey, () => {
        router.push("/dashboard");
      });
      setMessage("🎉 Subscription started! Your 7-day free trial is active.");
      await refetch();
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (e: any) {
      setMessage(`❌ ${e.message ?? "Something went wrong"}`);
    } finally {
      setSelectingPlan(null);
    }
  }

  return (
    <>
      {/* Razorpay JS SDK */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="pricing-page">
        {/* ── Hero ── */}
        <div className="pricing-hero">
          <div className="pricing-hero-pill">Subscription Plans</div>
          <h1 className="pricing-hero-title">
            Simple, transparent{" "}
            <span className="gradient-text">pricing</span>
          </h1>
          <p className="pricing-hero-sub">
            Everything you need to run your business — invoicing, inventory,
            <br />
            GST reports, and more. {(!status || status.plan === "NONE") ? "Try free for 7 days." : "Choose the plan that fits you."}
          </p>

          <TrialBadge hidden={!!(status && status.plan !== "NONE")} />
        </div>

        {/* ── Status banner (shown if logged in and has subscription) ── */}
        {status && <StatusBanner status={status} />}

        {/* ── Feedback message ── */}
        {message && (
          <div
            className={`pricing-message ${message.startsWith("❌") ? "pricing-message--error" : "pricing-message--success"}`}
          >
            {message}
          </div>
        )}

        <div className="plans-grid">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              onSelect={handleSelect}
              loading={creating && selectingPlan === plan.key}
              isCurrent={status?.plan === plan.key}
              hideTrial={!!(status && status.plan !== "NONE")}
            />
          ))}
        </div>

        {/* ── Value table ── */}
        <div className="pricing-compare">
          <h2 className="pricing-compare-title">Compare plans</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Monthly</th>
                  <th>6-Month</th>
                  <th style={{ color: "var(--green)" }}>Yearly ✨</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Price", "₹99/mo", "₹279/mo", "₹250/mo"],
                  ["Billed as", "₹99 monthly", "₹1,674 once", "₹3,000 once"],
                  ["Saving", "—", "Save ₹120", "Save ₹588"],
                  ["Free trial", "7 days ✓", "7 days ✓", "7 days ✓"],
                  ["Invoices", "Unlimited", "Unlimited", "Unlimited"],
                  ["Users", "Up to 3", "Up to 5", "Unlimited"],
                  ["Priority support", "—", "✓", "✓"],
                  ["Account manager", "—", "—", "✓"],
                ].map(([feat, ...vals]) => (
                  <tr key={feat}>
                    <td style={{ color: "var(--muted)", fontWeight: 600 }}>{feat}</td>
                    {vals.map((v, i) => (
                      <td
                        key={i}
                        style={
                          i === 2
                            ? { color: "var(--green)", fontWeight: 600 }
                            : undefined
                        }
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="pricing-faq">
          <h2 className="pricing-compare-title">Frequently asked questions</h2>
          <div className="faq-grid">
            {[
              {
                q: "Do I need a credit card for the trial?",
                a: "No. You only need to add a payment method before your 7-day trial ends. During the trial you have full access.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. You can cancel from your settings page at any time. Your plan remains active until the end of the current billing period.",
              },
              {
                q: "What happens after my trial ends?",
                a: "If you have added a payment method, you will be charged for the plan you selected. Otherwise, your account will revert to read-only until you subscribe.",
              },
              {
                q: "Can I switch plans?",
                a: "Yes. Cancel your current plan and subscribe to a new one — the billing will start fresh.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="faq-item">
                <h4 className="faq-q">{q}</h4>
                <p className="faq-a">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA bottom ── */}
        <div className="pricing-cta-bottom">
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Questions? Email us at{" "}
            <a href="mailto:support@cloudhisaab.in" style={{ color: "var(--indigo-l)" }}>
              support@cloudhisaab.in
            </a>
          </p>
        </div>
      </div>

      <style>{`
        /* ── Pricing page layout ── */
        .pricing-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        /* ── Hero ── */
        .pricing-hero {
          text-align: center;
          margin-bottom: 48px;
        }

        .pricing-hero-pill {
          display: inline-block;
          background: rgba(99,102,241,0.12);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.22);
          padding: 4px 16px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .pricing-hero-title {
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1.1;
          margin-bottom: 14px;
        }

        .pricing-hero-sub {
          font-size: 16px;
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        /* ── Trial banner ── */
        .trial-banner {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 14px;
          color: #34d399;
          margin-top: 8px;
        }

        .trial-icon { font-size: 20px; }

        /* ── Status banner ── */
        .sub-status-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-card);
          border: 1px solid;
          border-radius: 14px;
          padding: 14px 20px;
          margin-bottom: 28px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .sub-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          animation: pulse-dot 2s ease infinite;
        }

        /* ── Feedback message ── */
        .pricing-message {
          text-align: center;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 24px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .pricing-message--success {
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          color: #34d399;
        }

        .pricing-message--error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
        }

        /* ── Plans grid ── */
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
          gap: 24px;
          margin-bottom: 72px;
          align-items: stretch;
        }

        /* ── Plan card ── */
        .plan-card {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          overflow: hidden;
        }

        .plan-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--plan-color);
          border-radius: 24px 24px 0 0;
        }

        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 48px var(--plan-glow);
          border-color: var(--plan-color);
        }

        .plan-card--highlighted {
          border-color: var(--green);
          box-shadow: 0 0 32px rgba(16,185,129,0.15);
        }

        .plan-card--active {
          border-color: var(--plan-color);
        }

        /* ── Badges ── */
        .plan-badge {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(16,185,129,0.12);
          color: #34d399;
          border: 1px solid rgba(16,185,129,0.25);
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .plan-current-badge {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(99,102,241,0.12);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.25);
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        /* ── Plan header ── */
        .plan-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .plan-name {
          font-size: 18px;
          font-weight: 800;
          color: var(--text);
        }

        .plan-price-row {
          display: flex;
          align-items: baseline;
          gap: 3px;
          margin-top: 8px;
        }

        .plan-currency {
          font-size: 22px;
          font-weight: 700;
          color: var(--plan-color);
        }

        .plan-price {
          font-size: 52px;
          font-weight: 900;
          line-height: 1;
          color: var(--text);
          font-variant-numeric: tabular-nums;
        }

        .plan-period {
          font-size: 14px;
          color: var(--muted);
          margin-left: 4px;
        }

        .plan-billed-as {
          font-size: 12px;
          color: var(--muted);
        }

        .plan-saving {
          display: inline-block;
          background: rgba(16,185,129,0.1);
          color: #34d399;
          border: 1px solid rgba(16,185,129,0.2);
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          margin-top: 4px;
        }

        /* ── Features list ── */
        .plan-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .plan-feature {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          font-size: 13.5px;
          color: var(--text);
          line-height: 1.4;
        }

        .plan-check {
          color: var(--plan-color);
          font-weight: 900;
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* ── Plan button ── */
        .plan-btn {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.2px;
          margin-top: auto;
        }

        .plan-btn--primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          box-shadow: 0 6px 20px rgba(16,185,129,0.35);
        }

        .plan-btn--primary:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(16,185,129,0.45);
        }

        .plan-btn--secondary {
          background: var(--bg-input);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .plan-btn--secondary:not(:disabled):hover {
          background: var(--bg-card2);
          border-color: var(--plan-color);
          color: var(--plan-color);
        }

        .plan-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .plan-btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Compare table ── */
        .pricing-compare {
          margin-bottom: 64px;
        }

        .pricing-compare-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin-bottom: 20px;
          text-align: center;
        }

        /* ── FAQ ── */
        .pricing-faq {
          margin-bottom: 48px;
        }

        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .faq-item {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
        }

        .faq-q {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }

        .faq-a {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.6;
        }

        /* ── Bottom CTA ── */
        .pricing-cta-bottom {
          text-align: center;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </>
  );
}

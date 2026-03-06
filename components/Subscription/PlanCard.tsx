/**
 * components/Subscription/PlanCard.tsx
 */

import React from "react";
import { PLANS } from "./plans";

export type Plan = (typeof PLANS)[0];

interface Props {
    plan: Plan;
    onSelect: (key: string) => void;
    loading: boolean;
    isCurrent: boolean;
    hideCTA?: boolean;
    hideTrial?: boolean;
}

export function PlanCard({
    plan,
    onSelect,
    loading,
    isCurrent,
    hideCTA = false,
    hideTrial = false,
}: Props) {
    return (
        <div
            className={`plan-card ${plan.highlight ? "plan-card--highlighted" : ""} ${isCurrent ? "plan-card--active" : ""}`}
            style={
                {
                    "--plan-color": plan.color,
                    "--plan-glow": plan.glow,
                } as React.CSSProperties
            }
        >
            {/* Top badge */}
            {plan.badge && (
                <div className="plan-badge">{plan.badge}</div>
            )}
            {isCurrent && (
                <div className="plan-current-badge">✓ Current Plan</div>
            )}

            {/* Header */}
            <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price-row">
                    <span className="plan-currency">₹</span>
                    <span className="plan-price">{plan.price}</span>
                    <span className="plan-period">{plan.period}</span>
                </div>
                <p className="plan-billed-as">{plan.billedAs}</p>
                {plan.saving && (
                    <span className="plan-saving">{plan.saving}</span>
                )}
            </div>

            {/* Features */}
            <ul className="plan-features">
                {plan.features
                    .filter(f => !hideTrial || !f.toLowerCase().includes("trial"))
                    .map((f) => (
                        <li key={f} className="plan-feature">
                            <span className="plan-check">✓</span>
                            {f}
                        </li>
                    ))}
            </ul>

            {/* CTA */}
            {!hideCTA && (
                <button
                    className={`btn plan-btn ${plan.highlight ? "plan-btn--primary" : "plan-btn--secondary"}`}
                    onClick={() => onSelect(plan.key)}
                    disabled={loading || isCurrent}
                    style={{ width: "100%", marginTop: "auto" }}
                >
                    {loading ? (
                        <span className="plan-btn-spinner" />
                    ) : isCurrent ? (
                        "Active Plan"
                    ) : (
                        hideTrial ? "Subscribe Now →" : "Start 7-Day Free Trial →"
                    )}
                </button>
            )}
        </div>
    );
}

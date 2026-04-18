"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_TENANT_PROFILE } from "@/lib/graphql/queries";
import { UPDATE_TENANT_PROFILE } from "@/lib/graphql/mutations";
import { patchUser } from "@/lib/auth";
import {
    Building2, Phone, MapPin, FileText, Zap, Loader2,
    CheckCircle2, AlertTriangle, Save, RefreshCw, User,
    Hash, Globe, Mail, ShieldCheck, ArrowRight, Users, CreditCard, ExternalLink,
} from "lucide-react";
import { useSubscription } from "@/lib/useSubscription";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { PLANS } from "@/components/Subscription/plans";
import { PlanCard } from "@/components/Subscription/PlanCard";

interface Field {
    key: string; label: string; icon: any; placeholder: string;
    type?: string; maxLength?: number; hint?: string; span?: boolean;
}

const FIELDS: Field[] = [
    { key: "businessName", label: "Business Name", icon: Building2, placeholder: "Your Shop Name" },
    { key: "ownerName", label: "Owner Name", icon: User, placeholder: "Full Name" },
    { key: "phone", label: "Phone", icon: Phone, placeholder: "10-digit mobile number", type: "tel" },
    { key: "gstin", label: "GSTIN", icon: ShieldCheck, placeholder: "e.g. 27AAPFU0939F1ZV", maxLength: 15, hint: "Leave blank if not GST-registered" },
    { key: "address", label: "Address", icon: MapPin, placeholder: "Shop / Building, Street", span: true },
    { key: "city", label: "City", icon: Globe, placeholder: "City" },
    { key: "state", label: "State", icon: MapPin, placeholder: "State" },
    { key: "pincode", label: "Pincode", icon: Hash, placeholder: "6 digits", maxLength: 6 },
];

// ── Plan metadata lookup ──────────────────────────────────────
const PLAN_META: Record<string, { label: string; price: string; period: string; color: string }> = {
    MONTHLY_99: { label: "Monthly",    price: "₹99",   period: "/month", color: "#6366f1" },
    MONTHLY:    { label: "Monthly",    price: "₹299",  period: "/month", color: "#6366f1" },
    BIANNUAL:   { label: "6-Month",    price: "₹279",  period: "/month", color: "#f59e0b" },
    YEARLY:     { label: "Yearly",     price: "₹250",  period: "/month", color: "#10b981" },
    NONE:       { label: "No Plan",    price: "₹0",    period: "",       color: "#6b7280" },
    FREE:       { label: "Free",       price: "₹0",    period: "",       color: "#6b7280" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    active:        { label: "Active",        color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    trialing:      { label: "Free Trial",    color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    authenticated: { label: "Authenticated", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    cancelled:     { label: "Cancelled",     color: "#f87171", bg: "rgba(239,68,68,0.12)" },
    halted:        { label: "Halted",        color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    inactive:      { label: "Inactive",      color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
    completed:     { label: "Completed",     color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function daysLeft(iso?: string): number | null {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
}

function BillingDashboard({ profile, onChangePlan, onCancel, cancelling }: {
    profile: any;
    onChangePlan: () => void;
    onCancel: () => void;
    cancelling: boolean;
}) {
    const plan   = PLAN_META[profile.plan] ?? PLAN_META.NONE;
    const status = STATUS_META[profile.subStatus] ?? STATUS_META.inactive;
    const isActive = ["active", "trialing", "authenticated"].includes(profile.subStatus);
    const isTrialing = profile.subStatus === "trialing";
    const trialDays  = daysLeft(profile.trialEndsAt);
    const nextBillDays = isTrialing ? null : daysLeft(profile.currentPeriodEnd);

    const card: React.CSSProperties = {
        padding: "18px 20px", borderRadius: 16,
        background: "var(--bg-card2)", border: "1px solid var(--border)",
        display: "flex", flexDirection: "column", gap: 6,
    };
    const label: React.CSSProperties = {
        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 2,
    };
    const val: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "var(--text)" };
    const sub: React.CSSProperties = { fontSize: 11, color: "var(--muted)", marginTop: 1 };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── Hero plan card ── */}
            <div style={{
                borderRadius: 18, border: `1px solid ${plan.color}33`,
                background: `linear-gradient(135deg, ${plan.color}0d 0%, transparent 60%)`,
                padding: "24px 28px",
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20,
                position: "relative", overflow: "hidden",
            }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${plan.color}22 0%, transparent 70%)`, pointerEvents: "none" }} />
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Current Plan</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 36, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{plan.label}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: plan.color }}>{plan.price}</span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{plan.period}</span>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: status.bg, border: `1px solid ${status.color}33` }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: status.color, boxShadow: `0 0 6px ${status.color}` }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={onChangePlan} style={{
                        padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                        background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                        color: "#fff", border: "none", cursor: "pointer",
                        boxShadow: `0 4px 14px ${plan.color}44`,
                    }}>
                        <Zap size={13} style={{ display: "inline", marginRight: 6 }} />
                        {profile.plan === "NONE" ? "Choose a Plan" : "Change Plan"}
                    </button>
                    {isActive && (
                        <button onClick={onCancel} disabled={cancelling} style={{
                            padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                            background: "var(--bg-input)", color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer",
                        }}>
                            {cancelling ? "Cancelling…" : "Cancel"}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Stat grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>

                {/* Next Billing / Trial Ends */}
                <div style={card}>
                    <div style={label}>{isTrialing ? "Trial Ends" : "Next Billing Date"}</div>
                    <div style={val}>{fmtDate(isTrialing ? profile.trialEndsAt : profile.currentPeriodEnd)}</div>
                    {isTrialing && trialDays !== null && (
                        <div style={{ ...sub, color: trialDays <= 2 ? "#f87171" : trialDays <= 5 ? "#f59e0b" : "#10b981", fontWeight: 700 }}>
                            {trialDays === 0 ? "Expires today!" : `${trialDays} day${trialDays !== 1 ? "s" : ""} left`}
                        </div>
                    )}
                    {!isTrialing && nextBillDays !== null && (
                        <div style={sub}>in {nextBillDays} day{nextBillDays !== 1 ? "s" : ""}</div>
                    )}
                </div>

                {/* Trial end date (if active after trial) */}
                {!isTrialing && profile.trialEndsAt && (
                    <div style={card}>
                        <div style={label}>Trial Ended On</div>
                        <div style={val}>{fmtDate(profile.trialEndsAt)}</div>
                        <div style={sub}>7-day free trial period</div>
                    </div>
                )}

                {/* Billing Amount */}
                <div style={card}>
                    <div style={label}>Billing Amount</div>
                    <div style={{ ...val, color: plan.color }}>{plan.price}</div>
                    <div style={sub}>{plan.period ? `Charged ${plan.period}` : "No active charge"}</div>
                </div>

                {/* Member Since */}
                <div style={card}>
                    <div style={label}>Member Since</div>
                    <div style={val}>{fmtDate(profile.createdAt)}</div>
                    <div style={sub}>Account created</div>
                </div>

                {/* Subscription activated */}
                {profile.subUpdatedAt && (
                    <div style={card}>
                        <div style={label}>Subscription Updated</div>
                        <div style={val}>{fmtDate(profile.subUpdatedAt)}</div>
                        <div style={sub}>Last status change</div>
                    </div>
                )}

                {/* Subscription ID */}
                {profile.razorpaySubId && (
                    <div style={{ ...card, gridColumn: "span 2" }}>
                        <div style={label}>Subscription ID</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "monospace", wordBreak: "break-all" }}>
                            {profile.razorpaySubId}
                        </div>
                        <div style={sub}>Razorpay reference — use this for billing disputes</div>
                    </div>
                )}
            </div>

            {/* ── Trial countdown bar (if trialing) ── */}
            {isTrialing && trialDays !== null && (
                <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>🎉 Free Trial Progress</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>{7 - trialDays}/7 days used</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: "var(--bg-input)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, ((7 - trialDays) / 7) * 100)}%`, background: "linear-gradient(90deg,#6366f1,#818cf8)", borderRadius: 99, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                        Your free trial ends on <strong style={{ color: "var(--text)" }}>{fmtDate(profile.trialEndsAt)}</strong>. Add a payment method before it expires to avoid interruption.
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SettingsPage() {
    const { data, loading, error, refetch } = useQuery<any>(GET_TENANT_PROFILE, { fetchPolicy: "cache-and-network" });
    const [updateProfile, { loading: saving }] = useMutation<any, any>(UPDATE_TENANT_PROFILE);

    const router = useRouter();
    const [form, setForm] = useState<Record<string, string>>({});
    const [showGstOnInvoice, setShowGstOnInvoice] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveErr, setSaveErr] = useState("");
    const [activeTab, setActiveTab] = useState<"profile" | "billing">("profile");
    const [showPlans, setShowPlans] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const { cancel, cancelling, subscribe, creating } = useSubscription();

    const profile = data?.getTenantProfile;

    useEffect(() => {
        if (profile) {
            setForm({
                businessName: profile.businessName || "",
                ownerName: profile.ownerName || "",
                phone: profile.phone || "",
                gstin: profile.gstin || "",
                address: profile.address || "",
                city: profile.city || "",
                state: profile.state || "",
                pincode: profile.pincode || "",
            });
            setShowGstOnInvoice(profile.showGstOnInvoice !== false);
            setDirty(false);

            // Auto-switch to billing if no plan selected
            if (profile.plan === "NONE") {
                setActiveTab("billing");
                setShowPlans(true);
            }
        }
    }, [profile]);

    const handleChange = (key: string, val: string) => {
        setForm(f => ({ ...f, [key]: val }));
        setDirty(true);
        setSaved(false);
        setSaveErr("");
    };

    const handleSave = async () => {
        setSaveErr("");
        try {
            const businessName = form.businessName?.trim() || "";
            const ownerName = form.ownerName?.trim() || "";
            const phone = form.phone?.trim() || "";
            const gstin = form.gstin?.trim() || "";
            const address = form.address?.trim() || "";
            const city = form.city?.trim() || "";
            const state = form.state?.trim() || "";
            const pincode = form.pincode?.trim() || "";
            await updateProfile({
                variables: {
                    input: {
                        businessName,
                        ownerName,
                        phone,
                        gstin,
                        address,
                        city,
                        state,
                        pincode,
                        showGstOnInvoice: gstin ? showGstOnInvoice : false,
                    },
                },
            } as any);
            if (businessName) patchUser({ businessName });
            setSaved(true);
            setDirty(false);
            refetch();
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            setSaveErr(e.message || "Failed to save");
        }
    };

    return (
        <AuthGuard>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
                .settings-tab { padding: 9px 18px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 99px; transition: all 0.15s; }
                .settings-tab.active { background: rgba(99,102,241,0.15); color: #818cf8; }
                .settings-tab:not(.active) { color: var(--muted); }
                .settings-tab:not(.active):hover { color: var(--text); background: var(--bg-input); }
                .settings-field { display: flex; flex-direction: column; gap: 6px; }
                .settings-field label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
                .field-wrap { position: relative; }
                .field-wrap .field-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
                .field-wrap input { padding-left: 36px !important; }
            `}</style>

            {/* ── Tab bar ── */}
            <div style={{ display: "flex", gap: 6, marginBottom: 28, padding: "4px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>
                <button
                    onClick={() => setActiveTab("profile")}
                    className={`settings-tab ${activeTab === "profile" ? "active" : ""}`}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                    🏢 Business Profile
                </button>
                <a href="/settings/users" className="settings-tab">
                    👥 Team Members
                </a>
                <button
                    onClick={() => setActiveTab("billing")}
                    className={`settings-tab ${activeTab === "billing" ? "active" : ""}`}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                    💳 Billing & Plans
                </button>
            </div>

            {/* ── Top header card ── */}
            <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "20px", marginBottom: 24,
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
                position: "relative", overflow: "hidden",
            }}>
                {/* Gradient orb */}
                <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(79,70,229,0.4)", flexShrink: 0,
                    }}>
                        <Building2 size={24} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>
                            Business Settings
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                            Appears on all your invoices and GST filings
                        </div>
                    </div>
                </div>

                {/* Right actions */}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {profile && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 99,
                            background: "rgba(79,70,229,0.1)", border: "1px solid rgba(99,102,241,0.2)"
                        }}>
                            <Zap size={12} color="#818cf8" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>{profile.plan} Plan</span>
                        </div>
                    )}
                    <button
                        onClick={() => refetch()}
                        style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                            background: "var(--bg-input)", border: "1px solid var(--border)",
                            color: "var(--muted)", transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--text)"; (e.currentTarget as any).style.background = "var(--bg-card2)"; }}
                        onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--muted)"; (e.currentTarget as any).style.background = "var(--bg-input)"; }}
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!dirty || saving}
                        style={{
                            display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
                            borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: dirty ? "pointer" : "not-allowed",
                            background: dirty ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "var(--bg-input)",
                            color: dirty ? "#fff" : "var(--muted)",
                            border: "none",
                            boxShadow: dirty ? "0 4px 16px rgba(79,70,229,0.4)" : "none",
                            opacity: (!dirty && !saving) ? 0.5 : 1,
                            transition: "all 0.2s",
                        }}
                    >
                        {saving
                            ? <><Loader2 size={13} style={{ animation: "spin 0.7s linear infinite" }} /> Saving…</>
                            : saved
                                ? <><CheckCircle2 size={13} /> Saved!</>
                                : <><Save size={13} /> Save Changes</>
                        }
                    </button>
                </div>
            </div>

            {/* ── Info row: email + tenant ── */}
            {profile && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 20, marginBottom: 24,
                    padding: "12px 20px", borderRadius: 12,
                    background: "var(--bg-card2)", border: "1px solid var(--border)",
                    flexWrap: "wrap"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--muted)" }}>
                        <Mail size={13} color="#818cf8" />
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>{profile.email}</span>
                    </div>
                    <div style={{ width: 1, height: 16, background: "var(--border)" }} />
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Tenant ID: <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text)", background: "var(--bg-input)", padding: "2px 8px", borderRadius: 6 }}>{profile.tenantId}</span>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                        <a href="/forgot-password" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            Change password <ArrowRight size={11} />
                        </a>
                    </div>
                </div>
            )}

            {/* ── Alerts ── */}
            {saveErr && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 20, color: "#f87171", fontSize: 13, animation: "slideDown 0.2s ease" }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {saveErr}
                </div>
            )}
            {saved && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", marginBottom: 20, color: "#10b981", fontSize: 13, animation: "slideDown 0.2s ease" }}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> Business profile updated successfully!
                </div>
            )}

            {/* ── Loading skeleton ── */}
            {loading && !profile && (
                <div className="grid-2-1" style={{ gap: 16 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="skeleton" style={{ height: 68, borderRadius: 14 }} />
                    ))}
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div style={{ padding: "40px 0", textAlign: "center", color: "#f87171", fontSize: 13 }}>
                    Failed to load profile. {error.message}
                </div>
            )}

            {/* ── Form card ── */}
            {profile && activeTab === "profile" && (
                <div style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 20, overflow: "hidden",
                }}>
                    {/* Card header */}
                    <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-card2)", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(79,70,229,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <FileText size={14} color="#6366f1" />
                        </div>
                        <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>Profile Details</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Printed on every invoice header</div>
                        </div>
                    </div>

                    {/* Fields grid */}
                    <div style={{ padding: "24px", display: "grid", gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 1024 ? "1fr" : "1fr 1fr", gap: "20px 24px" }}>
                        {FIELDS.map(f => {
                            const Icon = f.icon;
                            return (
                                <div key={f.key} className="settings-field" style={f.span ? { gridColumn: "1 / -1" } : {}}>
                                    <label>
                                        <Icon size={11} /> {f.label}
                                    </label>
                                    <div className="field-wrap">
                                        <Icon size={14} className="field-icon" />
                                        <input
                                            className="input"
                                            type={f.type || "text"}
                                            placeholder={f.placeholder}
                                            maxLength={f.maxLength}
                                            value={form[f.key] || ""}
                                            onChange={e => handleChange(f.key, e.target.value)}
                                            style={{ paddingRight: f.maxLength ? 44 : undefined }}
                                        />
                                        {f.maxLength && (
                                            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>
                                                {(form[f.key] || "").length}/{f.maxLength}
                                            </span>
                                        )}
                                    </div>
                                    {f.hint && <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{f.hint}</span>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom notice */}
                    <div style={{
                        margin: "0 24px 24px", padding: "14px 18px", borderRadius: 14,
                        background: "rgba(79,70,229,0.05)", border: "1px solid rgba(99,102,241,0.15)",
                        display: "flex", gap: 12, alignItems: "flex-start",
                    }}>
                        <ShieldCheck size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>GST Compliance</div>
                            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                                Your business name, address and phone are printed on every invoice header. Keep them accurate for GST filing.
                            </div>
                            {/* GST on Invoice toggle */}
                            <div style={{
                                marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "10px 14px", borderRadius: 10,
                                background: "var(--bg-input)", border: "1px solid var(--border)",
                            }}>
                                <div>
                                    <div style={{ fontSize: 12.5, fontWeight: 700, color: form.gstin ? "var(--text)" : "var(--muted)" }}>
                                        Print GST No. on Invoice
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                        {form.gstin
                                            ? "Show your GSTIN in the invoice header"
                                            : "Add a GSTIN above to enable this option"}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!form.gstin) return;
                                        setShowGstOnInvoice(v => !v);
                                        setDirty(true);
                                    }}
                                    style={{
                                        position: "relative", width: 44, height: 24, borderRadius: 99,
                                        border: "none", cursor: form.gstin ? "pointer" : "not-allowed",
                                        background: (!form.gstin || !showGstOnInvoice) ? "var(--border)" : "#6366f1",
                                        transition: "background 0.2s", flexShrink: 0,
                                        opacity: form.gstin ? 1 : 0.5,
                                    }}
                                    title={!form.gstin ? "Enter a GSTIN first" : undefined}
                                >
                                    <span style={{
                                        position: "absolute", top: 3, left: (!form.gstin || !showGstOnInvoice) ? 3 : 23,
                                        width: 18, height: 18, borderRadius: "50%",
                                        background: "#fff", transition: "left 0.2s",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                                    }} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Billing Section ── */}
            {profile && activeTab === "billing" && (
                <div style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 20, overflow: "hidden", animation: "slideDown 0.2s ease"
                }}>
                    <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-card2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CreditCard size={14} color="#10b981" />
                            </div>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>Subscription Details</div>
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Manage your billing and plan</div>
                            </div>
                        </div>
                        {showPlans && (
                            <button
                                onClick={() => setShowPlans(false)}
                                style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                            >
                                ← Back to Billing
                            </button>
                        )}
                    </div>

                    <div style={{ padding: "28px" }}>
                        {message && (
                            <div style={{
                                padding: "12px 16px", borderRadius: 12, marginBottom: 20,
                                background: message.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                border: "1px solid", borderColor: message.startsWith("✅") ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                                color: message.startsWith("✅") ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 600
                            }}>
                                {message}
                            </div>
                        )}

                        {!showPlans ? (
                            <BillingDashboard
                                profile={profile}
                                onChangePlan={() => setShowPlans(true)}
                                onCancel={async () => {
                                    if (confirm("Are you sure you want to cancel? Your plan stays active until the billing period ends.")) {
                                        try { await cancel(); refetch(); } catch (e: any) { alert(e.message); }
                                    }
                                }}
                                cancelling={cancelling}
                            />
                        ) : (
                            <div className="pricing-grid-settings">
                                {PLANS.map(plan => (
                                    <PlanCard
                                        key={plan.key}
                                        plan={plan}
                                        isCurrent={profile.plan === plan.key}
                                        hideTrial={profile.plan !== "NONE"}
                                        loading={creating}
                                        onSelect={async (key) => {
                                            setMessage(null);
                                            try {
                                                await subscribe(key, () => {
                                                    // On Success callback
                                                    router.push("/dashboard");
                                                });
                                                setMessage("✅ Subscription started! Your 7-day free trial is active.");
                                                refetch();
                                                setTimeout(() => router.push("/dashboard"), 1500);
                                            } catch (e: any) {
                                                setMessage(`❌ ${e.message}`);
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Customer Support Notice */}
                        <div style={{ marginTop: 32, padding: "16px 20px", borderRadius: 14, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", display: "flex", gap: 12 }}>
                            <Zap size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Need help with billing?</div>
                                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                                    If you have any questions about your invoices, payments, or need custom business plans, reach out to our billing team at <a href="mailto:support@cloudhisaab.in" style={{ color: "#818cf8", fontWeight: 600 }}>support@cloudhisaab.in</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Razorpay JS SDK */}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <style>{`
                .pricing-grid-settings {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .plan-card {
                    position: relative;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 18px;
                    padding: 24px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    transition: all 0.2s ease;
                    overflow: hidden;
                }
                .plan-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 3px;
                    background: var(--plan-color);
                }
                .plan-card--highlighted {
                    border-color: #10b981;
                    box-shadow: 0 0 24px rgba(16,185,129,0.1);
                }
                .plan-card--active {
                    border-color: var(--plan-color);
                    background: var(--bg-card2);
                }
                .plan-badge {
                    position: absolute;
                    top: 12px; right: 12px;
                    background: rgba(16,185,129,0.1);
                    color: #10b981;
                    padding: 2px 8px;
                    border-radius: 99px;
                    font-size: 10px;
                    font-weight: 800;
                }
                .plan-current-badge {
                    position: absolute;
                    top: 12px; right: 12px;
                    background: rgba(99,102,241,0.1);
                    color: #818cf8;
                    padding: 2px 8px;
                    border-radius: 99px;
                    font-size: 10px;
                    font-weight: 800;
                }
                .plan-name { font-size: 16px; font-weight: 800; color: var(--text); }
                .plan-price-row { display: flex; align-items: baseline; gap: 2px; }
                .plan-currency { font-size: 16px; font-weight: 700; color: var(--plan-color); }
                .plan-price { font-size: 32px; font-weight: 900; color: var(--text); }
                .plan-period { font-size: 12px; color: var(--muted); }
                .plan-billed-as { font-size: 11px; color: var(--muted); }
                .plan-saving { font-size: 10px; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.1); padding: 1px 6px; border-radius: 4px; }
                .plan-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; flex: 1; }
                .plan-feature { display: flex; gap: 8px; font-size: 12px; color: var(--text); line-height: 1.4; }
                .plan-check { color: var(--plan-color); font-weight: 900; }
                .plan-btn { width: 100%; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s ease; }
                .plan-btn--primary { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
                .plan-btn--secondary { background: var(--bg-input); color: var(--text); border: 1px solid var(--border); }
                .plan-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </AuthGuard>
    );
}

"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_TENANT_PROFILE } from "@/lib/graphql/queries";
import { UPDATE_TENANT_PROFILE } from "@/lib/graphql/mutations";
import { patchUser } from "@/lib/auth";
import {
    Building2, Phone, MapPin, FileText, Zap, Loader2,
    CheckCircle2, AlertTriangle, Save, RefreshCw, User,
    Hash, Globe, Mail, ShieldCheck, ArrowRight, Users,
} from "lucide-react";

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

export default function SettingsPage() {
    const { data, loading, error, refetch } = useQuery<any>(GET_TENANT_PROFILE, { fetchPolicy: "cache-and-network" });
    const [updateProfile, { loading: saving }] = useMutation<any, any>(UPDATE_TENANT_PROFILE);

    const [form, setForm] = useState<Record<string, string>>({});
    const [dirty, setDirty] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveErr, setSaveErr] = useState("");

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
            setDirty(false);
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
            await updateProfile({
                variables: {
                    input: {
                        businessName: form.businessName || null,
                        ownerName: form.ownerName || null,
                        phone: form.phone || null,
                        gstin: form.gstin || null,
                        address: form.address || null,
                        city: form.city || null,
                        state: form.state || null,
                        pincode: form.pincode || null,
                    },
                },
            } as any);
            if (form.businessName) patchUser({ businessName: form.businessName });
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
            <div style={{ display: "flex", gap: 6, marginBottom: 28, padding: "4px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", width: "fit-content" }}>
                <a href="/settings" className="settings-tab active">
                    🏢 Business Profile
                </a>
                <a href="/settings/users" className="settings-tab">
                    👥 Team Members
                </a>
            </div>

            {/* ── Top header card ── */}
            <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "24px 28px", marginBottom: 24,
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
            {profile && (
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
                    <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" }}>
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
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>GST Compliance</div>
                            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                                Your business name, GSTIN, address and phone are printed on every invoice header. Keep them accurate for GST filing.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthGuard>
    );
}

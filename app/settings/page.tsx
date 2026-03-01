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
    Hash, Globe, Mail,
} from "lucide-react";

interface Field {
    key: string; label: string; icon: any; placeholder: string;
    type?: string; maxLength?: number; hint?: string;
}

const FIELDS: Field[] = [
    { key: "businessName", label: "Business Name", icon: Building2, placeholder: "Your Shop Name" },
    { key: "ownerName", label: "Owner Name", icon: User, placeholder: "Full Name" },
    { key: "phone", label: "Phone", icon: Phone, placeholder: "10-digit mobile number", type: "tel" },
    { key: "gstin", label: "GSTIN", icon: Hash, placeholder: "e.g. 27AAPFU0939F1ZV", maxLength: 15, hint: "Leave blank if not GST-registered" },
    { key: "address", label: "Address", icon: MapPin, placeholder: "Shop / Building, Street" },
    { key: "city", label: "City", icon: Globe, placeholder: "City" },
    { key: "state", label: "State", icon: MapPin, placeholder: "State" },
    { key: "pincode", label: "Pincode", icon: Hash, placeholder: "6 digits", maxLength: 6 },
];

export default function SettingsPage() {
    const { data, loading, error, refetch } = useQuery<any>(GET_TENANT_PROFILE, {
        fetchPolicy: "cache-and-network",
    });

    const [updateProfile, { loading: saving }] = useMutation<any, any>(UPDATE_TENANT_PROFILE);

    const [form, setForm] = useState<Record<string, string>>({});
    const [dirty, setDirty] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveErr, setSaveErr] = useState("");

    const profile = data?.getTenantProfile;

    // Populate form once data loads
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
            // ── Update localStorage so Sidebar reflects the new name immediately ──
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
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* ── Sub-nav tabs ── */}
            <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
                {[
                    { href: "/settings", label: "Business Profile" },
                    { href: "/settings/users", label: "👥 Team Members" },
                ].map(tab => (
                    <a key={tab.href} href={tab.href} style={{
                        padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none",
                        color: tab.href === "/settings" ? "#818cf8" : "var(--muted)",
                        borderBottom: tab.href === "/settings" ? "2px solid #818cf8" : "2px solid transparent",
                        marginBottom: -1, transition: "all 0.15s",
                    }}>
                        {tab.label}
                    </a>
                ))}
            </div>

            {/* ── Page header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Business Settings</h1>
                    <p className="page-subtitle">Update your business profile — appears on all invoices</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => refetch()}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={!dirty || saving}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, boxShadow: dirty ? "0 4px 14px rgba(79,70,229,0.3)" : "none" }}>
                        {saving
                            ? <><Loader2 size={13} style={{ animation: "spin 0.7s linear infinite" }} /> Saving…</>
                            : saved
                                ? <><CheckCircle2 size={13} /> Saved!</>
                                : <><Save size={13} /> Save Changes</>
                        }
                    </button>
                </div>
            </div>

            {/* ── Plan badge ── */}
            {profile && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 20, background: "rgba(79,70,229,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                        <Zap size={12} color="#818cf8" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>{profile.plan} Plan</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                        <Mail size={11} /> {profile.email}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Tenant: <span style={{ fontFamily: "monospace", fontSize: 11 }}>{profile.tenantId}</span>
                    </div>
                </div>
            )}

            {/* ── Alerts ── */}
            {saveErr && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 20, color: "#f87171", fontSize: 13 }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {saveErr}
                </div>
            )}
            {saved && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", marginBottom: 20, color: "#10b981", fontSize: 13 }}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> Business profile updated successfully!
                </div>
            )}

            {/* ── Loading skeleton ── */}
            {loading && !profile && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12 }} />
                    ))}
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div style={{ padding: "40px 0", textAlign: "center", color: "#f87171", fontSize: 13 }}>
                    Failed to load profile. {error.message}
                </div>
            )}

            {/* ── Form ── */}
            {profile && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 820 }}>
                    {FIELDS.map(f => {
                        const Icon = f.icon;
                        return (
                            <div key={f.key} className="form-group">
                                <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <Icon size={11} style={{ flexShrink: 0 }} /> {f.label}
                                </label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        className="input"
                                        type={f.type || "text"}
                                        placeholder={f.placeholder}
                                        maxLength={f.maxLength}
                                        value={form[f.key] || ""}
                                        onChange={e => handleChange(f.key, e.target.value)}
                                        style={{ paddingRight: f.maxLength ? 40 : undefined }}
                                    />
                                    {f.maxLength && (
                                        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--muted)" }}>
                                            {(form[f.key] || "").length}/{f.maxLength}
                                        </span>
                                    )}
                                </div>
                                {f.hint && <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{f.hint}</span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Invoice preview notice ── */}
            {profile && (
                <div style={{ marginTop: 28, maxWidth: 820, padding: "16px 20px", borderRadius: 14, background: "rgba(79,70,229,0.06)", border: "1px solid rgba(99,102,241,0.18)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <FileText size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>Appears on your invoices</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                            Your business name, GSTIN, address and phone will be printed on every invoice header. Make sure they are accurate for GST compliance.
                        </div>
                    </div>
                </div>
            )}

            {/* ── Password change link ── */}
            {profile && (
                <div style={{ marginTop: 24, maxWidth: 820, display: "flex", justifyContent: "flex-end" }}>
                    <a href="/forgot-password" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        Change password →
                    </a>
                </div>
            )}
        </AuthGuard>
    );
}

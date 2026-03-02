"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_USERS } from "@/lib/graphql/queries";
import {
    INVITE_USER, UPDATE_USER_ROLE,
    TOGGLE_USER_ACTIVE, REMOVE_USER,
} from "@/lib/graphql/mutations";
import { getUser } from "@/lib/auth";
import {
    Users, UserPlus, Mail, Shield, ShieldCheck, ShieldOff,
    Loader2, CheckCircle2, AlertTriangle, Trash2, ToggleLeft,
    ToggleRight, ChevronDown, X, Crown,
} from "lucide-react";

// ── Role config ──────────────────────────────────────────────
const ROLES = ["MANAGER", "CASHIER", "ACCOUNTANT"] as const;
type Role = typeof ROLES[number];

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: any; perms: string[] }> = {
    SUPER_ADMIN: {
        label: "Super Admin", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)",
        icon: Crown,
        perms: ["Full access to everything"],
    },
    MANAGER: {
        label: "Manager", color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(99,102,241,0.25)",
        icon: ShieldCheck,
        perms: ["Billing & Invoices", "Products & Stock", "Expenses", "Reports (with profit)", "Customers"],
    },
    CASHIER: {
        label: "Cashier", color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(16,185,129,0.25)",
        icon: Shield,
        perms: ["Billing & Invoices only", "View customers", "Cannot see profit/margin", "No product management", "No reports"],
    },
    ACCOUNTANT: {
        label: "Accountant", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(59,130,246,0.25)",
        icon: ShieldOff,
        perms: ["Reports & Expenses (read)", "View invoices", "No billing/POS", "No product management"],
    },
};

function RoleBadge({ role }: { role: string }) {
    const m = ROLE_META[role] || ROLE_META.CASHIER;
    const Icon = m.icon;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: m.color, background: m.bg, border: `1px solid ${m.border}`,
        }}>
            <Icon size={12} /> {m.label}
        </span>
    );
}

// ── Invite Modal ─────────────────────────────────────────────
function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [form, setForm] = useState({ name: "", email: "", role: "CASHIER" as Role });
    const [err, setErr] = useState("");
    const [ok, setOk] = useState(false);
    const [invite, { loading }] = useMutation<any, any>(INVITE_USER);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setErr("");
        if (!form.name || !form.email) return setErr("Please fill all details");
        try {
            await invite({ variables: { input: form } } as any);
            setOk(true);
            setTimeout(() => { onDone(); onClose(); }, 2000);
        } catch (e: any) { setErr(e.message || "Failed to invite"); }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={onClose}>
            <div style={{ width: "100%", maxWidth: 440, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "fadeInScale 0.2s ease" }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 8, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-input)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <X size={18} />
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(79,70,229,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(99,102,241,0.2)" }}>
                        <UserPlus size={20} color="#818cf8" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>Invite Member</h2>
                        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>They'll receive login instructions</p>
                    </div>
                </div>

                {ok ? (
                    <div style={{ textAlign: "center", padding: "30px 0 10px" }}>
                        <div style={{ width: 64, height: 64, borderRadius: 32, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <CheckCircle2 size={32} color="#10b981" />
                        </div>
                        <div style={{ fontSize: 18, color: "#10b981", fontWeight: 800 }}>Invite sent successfully!</div>
                        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                            <span style={{ color: "var(--text)", fontWeight: 600 }}>{form.email}</span> will receive an email with their temporary password.
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {err && (
                            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: 13 }}>
                                <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {err}
                            </div>
                        )}

                        <div className="form-group">
                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Full Name</label>
                            <input className="input" placeholder="Rahul Sharma" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Email Address</label>
                            <div style={{ position: "relative" }}>
                                <Mail size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                                <input className="input" type="email" placeholder="staff@yourshop.com"
                                    style={{ paddingLeft: 40 }}
                                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Assign Role</label>
                            <div style={{ position: "relative" }}>
                                <select className="input" value={form.role}
                                    onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                                    style={{ appearance: "none", cursor: "pointer" }}>
                                    {ROLES.map(r => (
                                        <option key={r} value={r}>{ROLE_META[r].label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                            </div>

                            {/* Role permissions preview */}
                            <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 12, background: ROLE_META[form.role].bg, border: `1px solid ${ROLE_META[form.role].border}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: ROLE_META[form.role].color, marginBottom: 8 }}>
                                    {(() => { const I = ROLE_META[form.role].icon; return <I size={14} />; })()}
                                    {ROLE_META[form.role].label} Permissions:
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {ROLE_META[form.role].perms.map(p => (
                                        <div key={p} style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                                            <span style={{ color: ROLE_META[form.role].color, marginTop: -1 }}>•</span> <span style={{ lineHeight: 1.4 }}>{p}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={loading}>
                                {loading ? <Loader2 size={15} className="spin" /> : <Mail size={15} />}
                                {loading ? "Sending invite…" : "Send Invite"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
        </div>
    );
}

// ── Main page ────────────────────────────────────────────────
export default function UsersPage() {
    const currentUser = getUser();
    const { data, loading, error, refetch } = useQuery<any>(LIST_USERS, { fetchPolicy: "cache-and-network" });
    const [showInvite, setShowInvite] = useState(false);
    const [actionErr, setActionErr] = useState("");

    const [updateRole] = useMutation<any, any>(UPDATE_USER_ROLE);
    const [toggleActive] = useMutation<any, any>(TOGGLE_USER_ACTIVE);
    const [removeUser] = useMutation<any, any>(REMOVE_USER);

    const users: any[] = data?.listUsers || [];

    const handleRoleChange = async (userId: string, role: string) => {
        setActionErr("");
        try { await updateRole({ variables: { input: { userId, role } } } as any); refetch(); }
        catch (e: any) { setActionErr(e.message); }
    };

    const handleToggle = async (userId: string, active: boolean) => {
        setActionErr("");
        try { await toggleActive({ variables: { userId, active } } as any); refetch(); }
        catch (e: any) { setActionErr(e.message); }
    };

    const handleRemove = async (userId: string, name: string) => {
        if (!confirm(`Remove ${name} from your team? This cannot be undone.`)) return;
        setActionErr("");
        try { await removeUser({ variables: { userId } } as any); refetch(); }
        catch (e: any) { setActionErr(e.message); }
    };

    return (
        <AuthGuard requiredRole="SUPER_ADMIN">
            <style>{`
                .spin { animation: spin 0.7s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
                .settings-tab { padding: 9px 18px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 99px; transition: all 0.15s; }
                .settings-tab.active { background: rgba(99,102,241,0.15); color: #818cf8; }
                .settings-tab:not(.active) { color: var(--muted); }
                .settings-tab:not(.active):hover { color: var(--text); background: var(--bg-input); }
                select option { background: #1e1b4b; color: #f1f5f9; }
            `}</style>

            {showInvite && (
                <InviteModal onClose={() => setShowInvite(false)} onDone={refetch} />
            )}

            {/* ── Tab bar ── */}
            <div style={{ display: "flex", gap: 6, marginBottom: 28, padding: "4px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", width: "fit-content" }}>
                <a href="/settings" className="settings-tab">
                    🏢 Business Profile
                </a>
                <a href="/settings/users" className="settings-tab active">
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
                <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(79,70,229,0.4)", flexShrink: 0,
                    }}>
                        <Users size={24} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>
                            Team Members
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                            Manage who has access to your CloudHisaab account
                        </div>
                    </div>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowInvite(true)}
                    style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                        borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                        background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                        boxShadow: "0 4px 16px rgba(79,70,229,0.4)", border: "none", zIndex: 1,
                    }}
                >
                    <UserPlus size={15} /> Invite Member
                </button>
            </div>

            {/* ── Role legend ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                {Object.entries(ROLE_META).map(([role, m]) => {
                    const Icon = m.icon;
                    return (
                        <div key={role} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 99, background: m.bg, border: `1px solid ${m.border}`, fontSize: 12 }}>
                            <Icon size={14} color={m.color} />
                            <span style={{ color: m.color, fontWeight: 800 }}>{m.label}</span>
                            <span style={{ color: "var(--muted)", opacity: 0.8 }}>— {m.perms[0]}</span>
                        </div>
                    );
                })}
            </div>

            {actionErr && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "14px 18px", color: "#f87171", fontSize: 13, marginBottom: 20, animation: "slideDown 0.2s ease" }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {actionErr}
                </div>
            )}

            {/* ── Users table ── */}
            <div className="table-wrapper">
                {loading && !data && (
                    <div style={{ padding: 60, textAlign: "center" }}>
                        <Loader2 size={24} color="#818cf8" className="spin" style={{ margin: "0 auto" }} />
                    </div>
                )}
                {error && (
                    <div style={{ padding: 40, textAlign: "center", color: "#f87171", fontSize: 13 }}>
                        Failed to load team: {error.message}
                    </div>
                )}

                {!loading && !error && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: 24 }}>Member</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th style={{ textAlign: "right", paddingRight: 24 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Current user (you) always shown first */}
                            <tr style={{ background: "transparent" }}>
                                <td style={{ paddingLeft: 24 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff", flexShrink: 0, boxShadow: "0 4px 12px rgba(79,70,229,0.3)" }}>
                                            {(currentUser?.email || "?")[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                                                {currentUser?.email} <span style={{ fontSize: 10, fontWeight: 800, color: "#818cf8", background: "rgba(99,102,241,0.15)", padding: "2px 6px", borderRadius: 6 }}>YOU</span>
                                            </div>
                                            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Owner</div>
                                        </div>
                                    </div>
                                </td>
                                <td><RoleBadge role="SUPER_ADMIN" /></td>
                                <td><span style={{ fontSize: 12, color: "#10b981", fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} /> Active</span></td>
                                <td style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>—</td>
                                <td style={{ paddingRight: 24 }} />
                            </tr>

                            {users.map((u: any) => (
                                <tr key={u.userId} style={{ opacity: u.isActive ? 1 : 0.6 }}>
                                    <td style={{ paddingLeft: 24 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 12, background: u.isActive ? "rgba(99,102,241,0.15)" : "rgba(100,116,139,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: u.isActive ? "#818cf8" : "var(--muted)", flexShrink: 0 }}>
                                                {(u.name || u.email)[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{u.name}</div>
                                                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ position: "relative", display: "inline-block" }}>
                                            <select
                                                value={u.role}
                                                onChange={e => handleRoleChange(u.userId, e.target.value)}
                                                style={{
                                                    appearance: "none", background: ROLE_META[u.role]?.bg || "transparent",
                                                    border: `1px solid ${ROLE_META[u.role]?.border || "var(--border)"}`,
                                                    color: ROLE_META[u.role]?.color || "var(--text)",
                                                    borderRadius: 20, padding: "5px 32px 5px 12px",
                                                    fontSize: 12, fontWeight: 800, cursor: "pointer", transition: "all 0.15s",
                                                }}>
                                                {ROLES.map(r => (
                                                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: ROLE_META[u.role]?.color || "var(--muted)" }} />
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: u.isActive ? "#10b981" : "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: u.isActive ? "#10b981" : "#64748b" }} />
                                            {u.isActive ? "Active" : "Suspended"}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                                    </td>
                                    <td style={{ paddingRight: 24 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                            <button
                                                title={u.isActive ? "Suspend Access" : "Restore Access"}
                                                onClick={() => handleToggle(u.userId, !u.isActive)}
                                                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", padding: 7, borderRadius: 10, transition: "all 0.15s" }}
                                                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-card2)"; e.currentTarget.style.color = "var(--text)"; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-input)"; e.currentTarget.style.color = "var(--muted)"; }}>
                                                {u.isActive ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} />}
                                            </button>
                                            <button
                                                title="Remove Team Member"
                                                onClick={() => handleRemove(u.userId, u.name)}
                                                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", padding: 7, borderRadius: 10, transition: "all 0.15s" }}
                                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "#ef4444"; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-input)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 13 }}>
                                        <Users size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>No team members yet</div>
                                        <div style={{ marginTop: 4 }}>Add cashiers and managers to help run your business</div>
                                        <div style={{ marginTop: 16 }}>
                                            <button className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px", borderRadius: 99 }} onClick={() => setShowInvite(true)}>
                                                <UserPlus size={14} /> Invite your first member
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </AuthGuard>
    );
}

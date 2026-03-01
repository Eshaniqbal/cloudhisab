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
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: m.color, background: m.bg, border: `1px solid ${m.border}`,
        }}>
            <Icon size={10} /> {m.label}
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
        try {
            await invite({ variables: { input: form } } as any);
            setOk(true);
            setTimeout(() => { onDone(); onClose(); }, 2000);
        } catch (e: any) { setErr(e.message || "Failed to invite"); }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div className="glass" style={{ width: "100%", maxWidth: 460, padding: "32px", position: "relative" }}>
                <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                    <X size={18} />
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(79,70,229,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <UserPlus size={18} color="#818cf8" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Invite Team Member</h2>
                        <p style={{ fontSize: 12, color: "var(--muted)" }}>They'll receive an email with login instructions</p>
                    </div>
                </div>

                {ok ? (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <CheckCircle2 size={40} color="#10b981" style={{ margin: "0 auto 12px" }} />
                        <div style={{ color: "#10b981", fontWeight: 700 }}>Invite sent! ✅</div>
                        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                            {form.email} will receive an email with a temporary password.
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {err && (
                            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
                                <AlertTriangle size={14} /> {err}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Full Name</label>
                            <input className="input" placeholder="Rahul Sharma" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <div style={{ position: "relative" }}>
                                <Mail size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                                <input className="input" type="email" placeholder="cashier@yourshop.com"
                                    style={{ paddingLeft: 34 }}
                                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select className="input" value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                                style={{ appearance: "none" }}>
                                {ROLES.map(r => (
                                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                                ))}
                            </select>

                            {/* Role permissions preview */}
                            <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: ROLE_META[form.role].bg, border: `1px solid ${ROLE_META[form.role].border}` }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: ROLE_META[form.role].color, marginBottom: 6 }}>
                                    {ROLE_META[form.role].label} can:
                                </div>
                                {ROLE_META[form.role].perms.map(p => (
                                    <div key={p} style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 5, alignItems: "center" }}>
                                        <span style={{ color: ROLE_META[form.role].color }}>•</span> {p}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} disabled={loading}>
                                {loading ? <Loader2 size={14} style={{ animation: "spin 0.75s linear infinite" }} /> : <Mail size={14} />}
                                {loading ? "Sending invite…" : "Send Invite"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
            {showInvite && (
                <InviteModal onClose={() => setShowInvite(false)} onDone={refetch} />
            )}

            {/* Sub-nav tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
                {[
                    { href: "/settings", label: "Business Profile" },
                    { href: "/settings/users", label: "👥 Team Members" },
                ].map(tab => (
                    <a key={tab.href} href={tab.href} style={{
                        padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none",
                        color: tab.href === "/settings/users" ? "#818cf8" : "var(--muted)",
                        borderBottom: tab.href === "/settings/users" ? "2px solid #818cf8" : "2px solid transparent",
                        marginBottom: -1, transition: "all 0.15s",
                    }}>
                        {tab.label}
                    </a>
                ))}
            </div>

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Team Members</h1>
                    <p className="page-subtitle">Manage who has access to your CloudHisaab account</p>
                </div>
                <button className="btn btn-primary"
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                    onClick={() => setShowInvite(true)}>
                    <UserPlus size={14} /> Invite Member
                </button>
            </div>

            {/* Role legend */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                {Object.entries(ROLE_META).map(([role, m]) => {
                    const Icon = m.icon;
                    return (
                        <div key={role} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: m.bg, border: `1px solid ${m.border}`, fontSize: 11 }}>
                            <Icon size={10} color={m.color} />
                            <span style={{ color: m.color, fontWeight: 700 }}>{m.label}</span>
                            <span style={{ color: "var(--muted)" }}>— {m.perms[0]}</span>
                        </div>
                    );
                })}
            </div>

            {actionErr && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
                    <AlertTriangle size={14} /> {actionErr}
                </div>
            )}

            {/* Users table */}
            <div className="card" style={{ overflow: "hidden", padding: 0 }}>
                {loading && !data && (
                    <div style={{ padding: 40, textAlign: "center" }}>
                        <Loader2 size={22} color="#818cf8" style={{ animation: "spin 0.75s linear infinite" }} />
                    </div>
                )}
                {error && (
                    <div style={{ padding: 40, textAlign: "center", color: "#f87171", fontSize: 13 }}>
                        Failed to load users: {error.message}
                    </div>
                )}

                {!loading && !error && (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Current user (you) always shown first */}
                            <tr style={{ opacity: 0.75 }}>
                                <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                                            {(currentUser?.email || "?")[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{currentUser?.email}</div>
                                            <div style={{ fontSize: 11, color: "var(--muted)" }}>You (owner)</div>
                                        </div>
                                    </div>
                                </td>
                                <td><RoleBadge role="SUPER_ADMIN" /></td>
                                <td><span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>● Active</span></td>
                                <td style={{ fontSize: 12, color: "var(--muted)" }}>—</td>
                                <td />
                            </tr>

                            {users.map((u: any) => (
                                <tr key={u.userId}>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: 10, background: u.isActive ? "rgba(99,102,241,0.15)" : "rgba(100,116,139,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: u.isActive ? "#818cf8" : "var(--muted)", flexShrink: 0 }}>
                                                {(u.name || u.email)[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                                                <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {/* Role change dropdown */}
                                        <div style={{ position: "relative", display: "inline-block" }}>
                                            <select
                                                value={u.role}
                                                onChange={e => handleRoleChange(u.userId, e.target.value)}
                                                style={{
                                                    appearance: "none", background: ROLE_META[u.role]?.bg || "transparent",
                                                    border: `1px solid ${ROLE_META[u.role]?.border || "var(--border)"}`,
                                                    color: ROLE_META[u.role]?.color || "var(--text)",
                                                    borderRadius: 20, padding: "3px 28px 3px 10px",
                                                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                                                }}>
                                                {ROLES.map(r => (
                                                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={10} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: ROLE_META[u.role]?.color || "var(--muted)" }} />
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: u.isActive ? "#10b981" : "#64748b" }}>
                                            {u.isActive ? "● Active" : "○ Inactive"}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--muted)" }}>
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                            <button
                                                title={u.isActive ? "Suspend" : "Activate"}
                                                onClick={() => handleToggle(u.userId, !u.isActive)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", padding: 6, borderRadius: 8, transition: "all 0.15s" }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-input)")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                                {u.isActive ? <ToggleRight size={17} color="#10b981" /> : <ToggleLeft size={17} />}
                                            </button>
                                            <button
                                                title="Remove from team"
                                                onClick={() => handleRemove(u.userId, u.name)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", padding: 6, borderRadius: 8, transition: "all 0.15s" }}
                                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#f87171"; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--muted)"; }}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>
                                        <Users size={28} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                                        <div>No team members yet.</div>
                                        <div style={{ marginTop: 6 }}>
                                            <button className="btn btn-primary" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => setShowInvite(true)}>
                                                + Invite your first member
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                select option { background: #1e1b4b; color: #f1f5f9; }
            `}</style>
        </AuthGuard>
    );
}

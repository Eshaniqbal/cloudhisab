"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@apollo/client";
import { LOGIN, RESPOND_TO_NEW_PASSWORD_CHALLENGE } from "@/lib/graphql/mutations";
import { saveAuth } from "@/lib/auth";
import { Zap, Eye, EyeOff, Loader2, ShieldCheck, KeyRound, Lock } from "lucide-react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const verifiedEmail = searchParams.get("email") || "";
    const justVerified = searchParams.get("verified") === "1";

    const [form, setForm] = useState({ email: verifiedEmail, password: "" });
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState("");

    // NEW_PASSWORD_REQUIRED challenge state
    const [challenge, setChallenge] = useState<{ session: string; email: string } | null>(null);
    const [newPwd, setNewPwd] = useState("");
    const [showNew, setShowNew] = useState(false);

    const [login, { loading }] = useMutation<any, any>(LOGIN);
    const [respond, { loading: rLoading }] = useMutation<any, any>(RESPOND_TO_NEW_PASSWORD_CHALLENGE);

    // ── Helper: save tokens and go to dashboard ──────────────
    const finishLogin = (p: any) => {
        saveAuth(
            p.accessToken,
            { tenantId: p.tenantId, userId: p.userId, email: p.email, role: p.role, businessName: p.tenant?.businessName || "" },
            p.refreshToken,
            p.expiresIn,
        );
        router.push("/dashboard");
    };

    // ── Step 1: normal login ─────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("");
        try {
            const { data } = await login({ variables: { input: form } } as any);
            const p = data.login;

            if (p.challengeName === "NEW_PASSWORD_REQUIRED") {
                // Cognito requires a new password — show the set-password form
                setChallenge({ session: p.session, email: form.email });
                return;
            }
            finishLogin(p);
        } catch (err: any) {
            setError(err.message || "Login failed");
        }
    };

    // ── Step 2: set new password ─────────────────────────────
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault(); setError("");
        if (newPwd.length < 8) { setError("Password must be at least 8 characters."); return; }
        try {
            const { data } = await respond({
                variables: { email: challenge!.email, session: challenge!.session, newPassword: newPwd },
            } as any);
            finishLogin(data.respondToNewPasswordChallenge);
        } catch (err: any) {
            setError(err.message || "Failed to set password");
        }
    };

    return (
        <div className="auth-bg">
            <div className="glass" style={{ width: "100%", maxWidth: 420, padding: "40px 36px" }}>

                {/* Logo */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: challenge
                            ? "linear-gradient(135deg,#10b981,#059669)"
                            : "linear-gradient(135deg,#4f46e5,#6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 14, boxShadow: challenge
                            ? "0 8px 24px rgba(16,185,129,0.4)"
                            : "0 8px 24px rgba(79,70,229,0.4)",
                        transition: "all 0.4s ease",
                    }}>
                        {challenge ? <KeyRound size={24} color="#fff" /> : <Zap size={24} color="#fff" />}
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
                        {challenge ? "Set Your Password" : "CloudHisaab"}
                    </h1>
                    <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        {challenge
                            ? "Your account is ready — choose a permanent password"
                            : "Sign in to your business"}
                    </p>
                </div>

                {/* Verified banner */}
                {justVerified && !challenge && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#10b981", fontSize: 13 }}>
                        <ShieldCheck size={16} style={{ flexShrink: 0 }} /> Email verified! Sign in to continue.
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
                        {error}
                    </div>
                )}

                {/* ── LOGIN FORM ── */}
                {!challenge && (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" className="input" placeholder="owner@business.com"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <div style={{ position: "relative" }}>
                                <input type={showPwd ? "text" : "password"} className="input"
                                    style={{ paddingRight: 42 }} placeholder="••••••••"
                                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary"
                            style={{ width: "100%", marginTop: 4, padding: "11px 20px", fontSize: 14 }} disabled={loading}>
                            {loading && <Loader2 size={15} style={{ animation: "spin 0.75s linear infinite" }} />}
                            {loading ? "Signing in…" : "Sign In"}
                        </button>
                    </form>
                )}

                {/* ── SET NEW PASSWORD FORM (challenge) ── */}
                {challenge && (
                    <form onSubmit={handleSetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {/* Info box */}
                        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(79,70,229,0.08)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 13, color: "var(--muted)", alignItems: "flex-start" }}>
                            <Lock size={14} style={{ marginTop: 2, flexShrink: 0, color: "#818cf8" }} />
                            <span>You were invited by an admin. Set a permanent password to activate your account.</span>
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <div style={{ position: "relative" }}>
                                <input type={showNew ? "text" : "password"} className="input"
                                    style={{ paddingRight: 42 }} placeholder="Min. 8 characters"
                                    value={newPwd} onChange={e => setNewPwd(e.target.value)} required autoFocus />
                                <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
                                {newPwd.length === 0 ? "Must be 8+ characters" :
                                    newPwd.length < 8 ? `${8 - newPwd.length} more characters needed` :
                                        newPwd.match(/[A-Z]/) && newPwd.match(/[0-9]/) ? "✅ Strong password" :
                                            "⚠️ Add uppercase + numbers for stronger password"}
                            </span>
                        </div>

                        <button type="submit" className="btn btn-primary"
                            style={{ width: "100%", padding: "11px 20px", fontSize: 14, background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 14px rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                            disabled={rLoading}>
                            {rLoading ? <Loader2 size={15} style={{ animation: "spin 0.75s linear infinite" }} /> : <ShieldCheck size={15} />}
                            {rLoading ? "Activating…" : "Set Password & Sign In"}
                        </button>
                    </form>
                )}

                {!challenge && (
                    <>
                        <div style={{ textAlign: "center", marginTop: 16 }}>
                            <Link href="/forgot-password" style={{ fontSize: 13, color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>
                                Forgot password?
                            </Link>
                        </div>
                        <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 16 }}>
                            New business?{" "}
                            <Link href="/register" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>Register free →</Link>
                        </p>
                    </>
                )}

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return <Suspense><LoginForm /></Suspense>;
}

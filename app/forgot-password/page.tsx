"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@apollo/client";
import { FORGOT_PASSWORD, CONFIRM_FORGOT_PASSWORD } from "@/lib/graphql/mutations";
import { useTheme } from "@/lib/useTheme";
import { Mail, Key, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Lock } from "lucide-react";

type Step = "email" | "code" | "done";

export default function ForgotPasswordPage() {
    const { theme } = useTheme();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [err, setErr] = useState("");
    const [msg, setMsg] = useState("");

    const [sendCode, { loading: sendLoading }] = useMutation<any, any>(FORGOT_PASSWORD);
    const [confirmReset, { loading: confirmLoading }] = useMutation<any, any>(CONFIRM_FORGOT_PASSWORD);

    const loading = sendLoading || confirmLoading;

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(""); setMsg("");
        if (!email.trim()) { setErr("Please enter your email address."); return; }
        try {
            const { data } = await sendCode({ variables: { email: email.trim() } } as any);
            setMsg(data?.forgotPassword || "Code sent!");
            setStep("code");
        } catch (e: any) { setErr(e.message || "Failed to send code"); }
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(""); setMsg("");
        if (!code.trim()) { setErr("Enter the 6-digit code from your email."); return; }
        if (newPwd.length < 8) { setErr("Password must be at least 8 characters."); return; }
        try {
            const { data } = await confirmReset({
                variables: { email: email.trim(), code: code.trim(), newPassword: newPwd },
            } as any);
            setMsg(data?.confirmForgotPassword || "Password reset!");
            setStep("done");
        } catch (e: any) { setErr(e.message || "Failed to reset password"); }
    };

    return (
        <div className="auth-bg">
            <div className="glass" style={{ width: "100%", maxWidth: 420, padding: "40px 36px" }}>

                {/* Logo */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
                    <img
                        src={theme === "dark" ? "/logo.png" : "/logo1.png"}
                        alt="Logo"
                        style={{ height: 60, width: "auto", marginBottom: 14, objectFit: "contain" }}
                    />
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
                        {step === "done" ? "Password Reset!" : "Forgot Password"}
                    </h1>
                    <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        {step === "email" && "Enter your email to receive a reset code"}
                        {step === "code" && `Code sent to ${email}`}
                        {step === "done" && "Your password has been updated"}
                    </p>
                </div>

                {/* Progress dots */}
                {step !== "done" && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
                        {(["email", "code"] as Step[]).map((s, i) => (
                            <div key={s} style={{
                                width: step === s ? 24 : 8, height: 8, borderRadius: 99,
                                background: step === s ? "#4f46e5" : (i < ["email", "code"].indexOf(step) ? "#10b981" : "rgba(255,255,255,0.12)"),
                                transition: "all 0.3s ease",
                            }} />
                        ))}
                    </div>
                )}

                {/* Error */}
                {err && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {err}
                    </div>
                )}

                {/* Success (non-final) */}
                {msg && step === "code" && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#10b981", fontSize: 13 }}>
                        <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> {msg}
                    </div>
                )}

                {/* ── STEP 1: Email ── */}
                {step === "email" && (
                    <form onSubmit={handleSendCode} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <div style={{ position: "relative" }}>
                                <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                                <input className="input" type="email" placeholder="owner@business.com"
                                    style={{ paddingLeft: 36 }}
                                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "11px 20px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 4 }} disabled={loading}>
                            {loading ? <Loader2 size={15} style={{ animation: "spin 0.75s linear infinite" }} /> : <Mail size={15} />}
                            {loading ? "Sending…" : "Send Reset Code"}
                        </button>
                    </form>
                )}

                {/* ── STEP 2: Code + new password ── */}
                {step === "code" && (
                    <form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="form-group">
                            <label>6-digit Code from Email</label>
                            <div style={{ position: "relative" }}>
                                <Key size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                                <input className="input" type="text" placeholder="e.g. 123456"
                                    style={{ paddingLeft: 36, letterSpacing: 4, fontSize: 18, textAlign: "center", fontWeight: 700 }}
                                    maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <div style={{ position: "relative" }}>
                                <input className="input" type={showPwd ? "text" : "password"}
                                    style={{ paddingRight: 42 }} placeholder="Minimum 8 characters"
                                    value={newPwd} onChange={e => setNewPwd(e.target.value)} required />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                                    position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
                                    background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex",
                                }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <span style={{ fontSize: 10, color: "#64748b" }}>Strength: {newPwd.length < 8 ? "too short" : newPwd.match(/[A-Z]/) && newPwd.match(/[0-9]/) ? "✅ strong" : "⚠️ add uppercase & numbers"}</span>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "11px 20px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }} disabled={loading}>
                            {loading ? <Loader2 size={15} style={{ animation: "spin 0.75s linear infinite" }} /> : <Lock size={15} />}
                            {loading ? "Resetting…" : "Reset Password"}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setStep("email")} style={{ fontSize: 13 }}>
                            ← Change email
                        </button>
                    </form>
                )}

                {/* ── STEP 3: Done ── */}
                {step === "done" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CheckCircle2 size={32} color="#10b981" />
                        </div>
                        <div style={{ textAlign: "center", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                            {msg || "Your password has been reset successfully."}
                        </div>
                        <Link href="/login" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", padding: "11px 20px", fontSize: 14 }}>
                            <img
                                src={theme === "dark" ? "/logo.png" : "/logo1.png"}
                                alt="Logo"
                                style={{ width: 16, height: 16, objectFit: "contain" }}
                            /> Sign In Now
                        </Link>
                    </div>
                )}

                {/* Back to login */}
                {step !== "done" && (
                    <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 24 }}>
                        <Link href="/login" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <ArrowLeft size={12} /> Back to Sign In
                        </Link>
                    </p>
                )}

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}

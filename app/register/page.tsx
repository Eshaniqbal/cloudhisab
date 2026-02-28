"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@apollo/client";
import { REGISTER_TENANT, VERIFY_OTP, RESEND_OTP } from "@/lib/graphql/mutations";
import { saveAuth } from "@/lib/auth";
import { Zap, Loader2, Mail, CheckCircle, RefreshCw } from "lucide-react";

const GST_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Jammu & Kashmir", "Ladakh",
];

const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none",
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "16px",
    paddingRight: 36,
    backgroundBlendMode: "normal",
};

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: info, 2: business, 3: otp
    const [pending, setPending] = useState<{ email: string; tenantId: string; userId: string } | null>(null);
    const [otp, setOtp] = useState("");
    const [resent, setResent] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        businessName: "", ownerName: "", email: "", phone: "",
        password: "", confirmPassword: "",
        gstin: "", address: "", city: "", state: "", pincode: "",
    });

    const [register, { loading: regLoading }] = useMutation<any, any>(REGISTER_TENANT);
    const [verifyOtp, { loading: verifyLoading }] = useMutation<any, any>(VERIFY_OTP);
    const [resendOtp, { loading: resendLoading }] = useMutation<any, any>(RESEND_OTP);

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const goToStep2 = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
        if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
        setError(""); setStep(2);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const { data } = await register({
                variables: {
                    input: {
                        businessName: form.businessName, ownerName: form.ownerName,
                        email: form.email, phone: form.phone, password: form.password,
                        gstin: form.gstin || null, address: form.address || null,
                        city: form.city || null, state: form.state || null, pincode: form.pincode || null,
                    }
                }
            } as any) as any;
            const p = data.registerTenant;
            setPending({ email: p.email, tenantId: p.tenantId, userId: p.userId });
            setStep(3);
        } catch (err: any) { setError(err.message || "Registration failed"); }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!otp || otp.length < 4) { setError("Please enter the OTP from your email"); return; }
        try {
            const { data } = await verifyOtp({ variables: { input: { email: pending!.email, otp } } } as any) as any;
            const p = data.verifyOtp;
            saveAuth(p.accessToken, {
                tenantId: p.tenantId, userId: p.userId,
                email: p.email, role: p.role,
                businessName: p.tenant.businessName,
            });
            router.push("/dashboard");
        } catch (err: any) { setError(err.message || "OTP verification failed"); }
    };

    const handleResend = async () => {
        setError(""); setResent(false);
        try {
            await resendOtp({ variables: { email: pending!.email } } as any);
            setResent(true);
        } catch (err: any) { setError(err.message); }
    };

    return (
        <div className="auth-bg">
            <div className="glass" style={{ width: "100%", maxWidth: 460, padding: "36px 32px" }}>

                {/* Logo */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, boxShadow: "0 8px 24px rgba(79,70,229,0.4)" }}>
                        <Zap size={20} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>
                        {step === 3 ? "Verify Your Email" : "Register Your Business"}
                    </h1>
                    <p style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                        {step === 3 ? `We sent a code to ${pending?.email}` : "Start billing free on CloudHisaab"}
                    </p>
                </div>

                {/* Step bar */}
                <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1, height: 3, borderRadius: 99,
                            background: s <= step ? "#4f46e5" : "rgba(255,255,255,0.08)",
                            transition: "background 0.35s ease",
                        }} />
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#f87171", fontSize: 13 }}>
                        {error}
                    </div>
                )}

                {/* ─── Step 1: Personal Info ─── */}
                {step === 1 && (
                    <form onSubmit={goToStep2} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div className="form-group">
                            <label>Business Name</label>
                            <input style={inputStyle} className="input" placeholder="My Shop Pvt Ltd" value={form.businessName} onChange={e => set("businessName", e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Owner Name</label>
                            <input style={inputStyle} className="input" placeholder="Rahul Sharma" value={form.ownerName} onChange={e => set("ownerName", e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" style={inputStyle} className="input" placeholder="owner@business.com" value={form.email} onChange={e => set("email", e.target.value)} required />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="tel" style={inputStyle} className="input" placeholder="9876543210" value={form.phone} onChange={e => set("phone", e.target.value)} required />
                            </div>
                            <div className="form-group" />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" style={inputStyle} className="input" placeholder="Min. 8 characters" value={form.password} onChange={e => set("password", e.target.value)} required minLength={8} />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input type="password" style={inputStyle} className="input" placeholder="Repeat password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "11px", marginTop: 4 }}>
                            Next → Business Details
                        </button>
                    </form>
                )}

                {/* ─── Step 2: Business Details ─── */}
                {step === 2 && (
                    <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div className="form-group">
                            <label>GSTIN <span style={{ color: "#475569", textTransform: "none" }}>(optional)</span></label>
                            <input style={inputStyle} className="input" placeholder="22AAAAA0000A1Z5" maxLength={15}
                                value={form.gstin} onChange={e => set("gstin", e.target.value.toUpperCase())} />
                        </div>
                        <div className="form-group">
                            <label>Business Address</label>
                            <input style={inputStyle} className="input" placeholder="Shop No. 12, Market Road" value={form.address} onChange={e => set("address", e.target.value)} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div className="form-group">
                                <label>City</label>
                                <input style={inputStyle} className="input" placeholder="Mumbai" value={form.city} onChange={e => set("city", e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Pincode</label>
                                <input style={inputStyle} className="input" placeholder="400001" maxLength={6} value={form.pincode} onChange={e => set("pincode", e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>State</label>
                            {/* Native select with forced dark style via JS */}
                            <select
                                value={form.state}
                                onChange={e => set("state", e.target.value)}
                                style={{
                                    ...selectStyle,
                                    colorScheme: "dark",
                                }}
                            >
                                <option value="" style={{ background: "#1a1a2e", color: "#94a3b8" }}>— Select State —</option>
                                {GST_STATES.map(s => (
                                    <option key={s} value={s} style={{ background: "#1a1a2e", color: "#f1f5f9" }}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: "11px" }} disabled={regLoading}>
                                {regLoading && <Loader2 size={14} style={{ animation: "spin 0.75s linear infinite" }} />}
                                {regLoading ? "Creating account…" : "Send Verification OTP"}
                            </button>
                        </div>
                    </form>
                )}

                {/* ─── Step 3: OTP Verification ─── */}
                {step === 3 && (
                    <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ textAlign: "center", padding: "16px 0" }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(79,70,229,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                                <Mail size={24} color="#818cf8" />
                            </div>
                            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
                                Enter the 6-digit verification code sent to<br />
                                <strong style={{ color: "#a5b4fc" }}>{pending?.email}</strong>
                            </p>
                        </div>

                        {resent && (
                            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", color: "#34d399", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                <CheckCircle size={14} /> OTP resent! Check your inbox.
                            </div>
                        )}

                        {/* OTP input boxes */}
                        <div>
                            <label style={{ fontSize: 11, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.6px", fontWeight: 700, display: "block", marginBottom: 8 }}>Verification Code</label>
                            <input
                                style={{ ...inputStyle, textAlign: "center", fontSize: 28, fontWeight: 800, letterSpacing: 16, fontVariantNumeric: "tabular-nums" as const }}
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="• • • • • •"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                                autoFocus
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", fontSize: 14 }} disabled={verifyLoading}>
                            {verifyLoading && <Loader2 size={14} style={{ animation: "spin 0.75s linear infinite" }} />}
                            {verifyLoading ? "Verifying…" : "Verify & Continue"}
                        </button>

                        <div style={{ textAlign: "center" }}>
                            <button type="button" onClick={handleResend} disabled={resendLoading}
                                style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
                                {resendLoading ? <Loader2 size={12} style={{ animation: "spin 0.75s linear infinite" }} /> : <RefreshCw size={12} />}
                                Resend OTP
                            </button>
                        </div>
                    </form>
                )}

                <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 20 }}>
                    Already registered?{" "}
                    <Link href="/login" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}

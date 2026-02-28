"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@apollo/client";
import { LOGIN } from "@/lib/graphql/mutations";
import { saveAuth } from "@/lib/auth";
import { Zap, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState("");
    const [login, { loading }] = useMutation<any, any>(LOGIN);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const { data } = await login({ variables: { input: form } } as any);
            const p = data.login;
            saveAuth(p.accessToken, {
                tenantId: p.tenantId, userId: p.userId,
                email: p.email, role: p.role,
                businessName: p.tenant.businessName,
            });
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Login failed");
        }
    };

    return (
        <div className="auth-bg">
            <div className="glass" style={{ width: "100%", maxWidth: 420, padding: "40px 36px" }}>
                {/* Logo */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 14, boxShadow: "0 8px 24px rgba(79,70,229,0.4)",
                    }}>
                        <Zap size={24} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>CloudHisaab</h1>
                    <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Sign in to your business</p>
                </div>

                {error && (
                    <div style={{
                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                        color: "#f87171", fontSize: 13,
                    }}>{error}</div>
                )}

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
                            <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                                position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
                                background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex",
                            }}>
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 4, padding: "11px 20px", fontSize: 14 }} disabled={loading}>
                        {loading && <Loader2 size={15} style={{ animation: "spin 0.75s linear infinite" }} />}
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                </form>

                <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 24 }}>
                    New business?{" "}
                    <Link href="/register" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>
                        Register free →
                    </Link>
                </p>
            </div>
        </div>
    );
}

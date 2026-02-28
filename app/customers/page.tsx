"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LIST_CUSTOMERS, GET_CUSTOMER_LEDGER } from "@/lib/graphql/queries";
import { RECORD_CUSTOMER_PAYMENT, RECORD_ADVANCE, DELETE_CUSTOMER } from "@/lib/graphql/mutations";
import {
    Users, Search, X, Phone, CreditCard, Wallet, CheckCircle2,
    Loader2, Receipt, AlertTriangle, Clock, IndianRupee,
    ArrowDownLeft, Sparkles, Trash2,
} from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtK = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${fmt(n)}`;

const fmtDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const avatarGrad = (name: string) => {
    const g = ["linear-gradient(135deg,#4f46e5,#818cf8)", "linear-gradient(135deg,#10b981,#34d399)",
        "linear-gradient(135deg,#f59e0b,#fbbf24)", "linear-gradient(135deg,#ef4444,#f87171)",
        "linear-gradient(135deg,#06b6d4,#67e8f9)", "linear-gradient(135deg,#8b5cf6,#c084fc)"];
    return g[name.charCodeAt(0) % g.length];
};

const ENTRY_CFG: Record<string, { color: string; bg: string; label: string; icon: any; sign: string }> = {
    INVOICE: { color: "#818cf8", bg: "rgba(99,102,241,0.1)", label: "Invoice", icon: Receipt, sign: "−" },
    PAYMENT: { color: "#10b981", bg: "rgba(16,185,129,0.1)", label: "Payment", icon: CheckCircle2, sign: "+" },
    ADVANCE: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "Advance", icon: Wallet, sign: "+" },
};

export default function CustomersPage() {
    const [search, setSearch] = useState("");
    const [selPhone, setSelPhone] = useState<string | null>(null);
    const [payModal, setPayModal] = useState<"payment" | "advance" | null>(null);
    const [modalAmt, setModalAmt] = useState("");
    const [modalNotes, setModalNotes] = useState("");
    const [modalErr, setModalErr] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<{ phone: string; name: string } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const { data: listData, loading: listLoading, refetch: refetchList } =
        useQuery(LIST_CUSTOMERS, { variables: { search: search || null }, fetchPolicy: "cache-and-network" } as any);

    const { data: ledgerData, loading: ledgerLoading, refetch: refetchLedger } =
        useQuery(GET_CUSTOMER_LEDGER, { variables: { phone: selPhone }, skip: !selPhone, fetchPolicy: "cache-and-network" } as any);

    const [recordPayment, { loading: payLoading }] = useMutation(RECORD_CUSTOMER_PAYMENT);
    const [recordAdvance, { loading: advLoading }] = useMutation(RECORD_ADVANCE);
    const [deleteCustomerMut] = useMutation(DELETE_CUSTOMER);

    const customers = listData?.listCustomers?.items || [];
    const ledger = ledgerData?.getCustomerLedger;
    const customer = ledger?.customer;
    const entries = ledger?.entries || [];

    const handleDeleteCustomer = async (phone: string, name: string) => {
        setDeleteTarget({ phone, name });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await (deleteCustomerMut as any)({ variables: { phone: deleteTarget.phone } });
            if (selPhone === deleteTarget.phone) setSelPhone(null);
            refetchList();
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    };

    // aggregate stats across all customers
    const totalOutstanding = customers.reduce((s: number, c: any) => s + (c.outstanding || 0), 0);
    const totalInvoiced = customers.reduce((s: number, c: any) => s + (c.totalInvoiced || 0), 0);
    const overdueCount = customers.filter((c: any) => c.outstanding > 0).length;

    const submitModal = async () => {
        setModalErr("");
        const amt = +modalAmt;
        if (!amt || amt <= 0) { setModalErr("Enter a valid amount"); return; }
        try {
            if (payModal === "payment") {
                await recordPayment({ variables: { input: { phone: selPhone, amount: amt, notes: modalNotes || null } } } as any);
            } else {
                await recordAdvance({ variables: { input: { phone: selPhone, name: customer?.name || "", amount: amt, notes: modalNotes || null } } } as any);
            }
            setPayModal(null); setModalAmt(""); setModalNotes("");
            refetchLedger(); refetchList();
        } catch (e: any) { setModalErr(e.message || "Failed"); }
    };

    return (
        <AuthGuard>
            {/* ═══ Delete Confirm Dialog ═══ */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Customer"
                message={`Permanently delete "${deleteTarget?.name}" and all their invoices & ledger history?`}
                subMessage="This cannot be undone."
                confirmLabel="Yes, Delete"
                loading={deleteLoading}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* ═══ Payment / Advance Modal ═══ */}
            {payModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 24, padding: "32px", width: 400, maxWidth: "90vw", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
                        {/* Modal header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                                background: payModal === "payment" ? "linear-gradient(135deg,#10b981,#34d399)" : "linear-gradient(135deg,#f59e0b,#fbbf24)",
                                boxShadow: payModal === "payment" ? "0 8px 24px rgba(16,185,129,0.35)" : "0 8px 24px rgba(245,158,11,0.35)",
                            }}>
                                {payModal === "payment" ? <CheckCircle2 size={22} color="#fff" /> : <Wallet size={22} color="#fff" />}
                            </div>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>
                                    {payModal === "payment" ? "Record Payment" : "Record Advance"}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>for <strong style={{ color: "var(--text)" }}>{customer?.name}</strong></div>
                            </div>
                        </div>

                        {/* Outstanding info */}
                        {customer && payModal === "payment" && customer.outstanding > 0 && (
                            <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: "var(--muted)" }}>Outstanding balance</span>
                                <span style={{ fontSize: 16, fontWeight: 900, color: "#f87171", fontVariantNumeric: "tabular-nums" }}>₹{fmt(customer.outstanding)}</span>
                            </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: 6 }}>Amount (₹)</label>
                                <input className="input" type="number" min={1} step={1}
                                    style={{ fontSize: 20, fontWeight: 900, textAlign: "center", letterSpacing: "-0.5px" }}
                                    placeholder="0.00" value={modalAmt} autoFocus
                                    onChange={e => setModalAmt(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && submitModal()} />
                            </div>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: 6 }}>Notes (optional)</label>
                                <input className="input" style={{ fontSize: 13 }} placeholder="e.g. Cash, UPI, cheque…"
                                    value={modalNotes} onChange={e => setModalNotes(e.target.value)} />
                            </div>
                            {modalErr && (
                                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f87171" }}>
                                    {modalErr}
                                </div>
                            )}
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, fontWeight: 700 }}
                                    onClick={() => { setPayModal(null); setModalAmt(""); setModalErr(""); }}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}
                                    onClick={submitModal} disabled={payLoading || advLoading}>
                                    {(payLoading || advLoading) ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> : null}
                                    {payModal === "payment" ? "Record Payment" : "Save Advance"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", gap: 16, height: "calc(100vh - 64px)", overflow: "hidden" }}>

                {/* ═══════════════════════════════════════════
                    LEFT — Customer panel
                ═══════════════════════════════════════════ */}
                <div style={{ width: 310, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", gap: 12 }}>

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(79,70,229,0.4)" }}>
                            <Users size={16} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>Customers</h1>
                            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{listData?.listCustomers?.total || 0} registered</p>
                        </div>
                    </div>

                    {/* Summary strip */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flexShrink: 0 }}>
                        {[
                            { label: "Total Billed", val: fmtK(totalInvoiced), color: "#818cf8", icon: "📊" },
                            { label: "Outstanding", val: fmtK(totalOutstanding), color: totalOutstanding > 0 ? "#f87171" : "#10b981", icon: totalOutstanding > 0 ? "⚠️" : "✅" },
                        ].map(s => (
                            <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px" }}>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{s.icon} {s.label}</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Search */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                        <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                        <input className="input" style={{ paddingLeft: 34, fontSize: 13, height: 38 }}
                            placeholder="Search name or phone…" value={search}
                            onChange={e => setSearch(e.target.value)} />
                        {search && (
                            <button onClick={() => setSearch("")}
                                style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center" }}>
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Customer list */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                        {listLoading && (
                            <div style={{ padding: "30px 0", textAlign: "center" }}>
                                <Loader2 size={20} color="#4f46e5" style={{ animation: "spin 0.7s linear infinite" }} />
                            </div>
                        )}
                        {!listLoading && customers.length === 0 && (
                            <div style={{ padding: "50px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Users size={24} color="var(--muted)" strokeWidth={1.2} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>No customers yet</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>Customers are created automatically when you add a phone number to an invoice</div>
                                </div>
                            </div>
                        )}
                        {customers.map((c: any) => {
                            const active = selPhone === c.phone;
                            const hasDebt = c.outstanding > 0;
                            const paidPct = c.totalInvoiced > 0 ? Math.min(100, ((c.totalPaid + c.advance) / c.totalInvoiced) * 100) : 100;
                            return (
                                <div key={c.phone}
                                    role="button" tabIndex={0}
                                    onClick={() => setSelPhone(c.phone)}
                                    onKeyDown={e => e.key === "Enter" && setSelPhone(c.phone)}
                                    style={{
                                        background: active ? "rgba(79,70,229,0.08)" : "var(--bg-card)",
                                        border: active ? "1.5px solid rgba(99,102,241,0.45)" : "1px solid var(--border)",
                                        borderRadius: 13, padding: "13px 14px", cursor: "pointer", textAlign: "left",
                                        width: "100%", transition: "all 0.12s", flexShrink: 0,
                                    }}
                                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,0.3)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(79,70,229,0.03)"; } }}
                                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card)"; } }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                                        {/* Avatar */}
                                        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: avatarGrad(c.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff", boxShadow: `0 3px 10px rgba(0,0,0,0.2)` }}>
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                                            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                                <Phone size={9} /> {c.phone}
                                                <span style={{ color: "var(--border)" }}>·</span>
                                                <span>{c.invoiceCount} inv.</span>
                                            </div>
                                        </div>
                                        {/* Balance */}
                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                            {hasDebt ? (
                                                <div style={{ fontSize: 13, fontWeight: 900, color: "#f87171", fontVariantNumeric: "tabular-nums" }}>₹{fmt(c.outstanding)}</div>
                                            ) : (
                                                <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "3px 8px", borderRadius: 20 }}>
                                                    <CheckCircle2 size={9} /> Settled
                                                </div>
                                            )}
                                            {hasDebt && <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}>outstanding</div>}
                                        </div>
                                        {/* Delete button — valid because parent is now a div, not button */}
                                        <button
                                            onClick={ev => { ev.stopPropagation(); handleDeleteCustomer(c.phone, c.name); }}
                                            title="Delete customer"
                                            style={{ flexShrink: 0, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center", color: "#f87171", transition: "all 0.12s" }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.18)"; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{ marginTop: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5, height: 3, overflow: "hidden" }}>
                                        <div style={{
                                            height: "100%", borderRadius: 5, transition: "width 0.5s ease",
                                            background: "linear-gradient(90deg,#10b981,#34d399)",
                                            width: `${paidPct}%`,
                                        }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                        <span style={{ fontSize: 9, color: "var(--muted)" }}>Paid {paidPct.toFixed(0)}%</span>
                                        <span style={{ fontSize: 9, color: "var(--muted)" }}>of ₹{fmt(c.totalInvoiced)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    RIGHT — Ledger panel
                ═══════════════════════════════════════════ */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

                    {/* Empty state */}
                    {!selPhone && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20 }}>
                            <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,rgba(79,70,229,0.15),rgba(99,102,241,0.08))", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Users size={34} color="#818cf8" strokeWidth={1.5} />
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>Select a customer</div>
                                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>View full ledger history, record payments,<br />add advances and track outstanding balances</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--muted)", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px" }}>
                                <Sparkles size={12} color="#818cf8" /> {customers.length} customer{customers.length !== 1 ? "s" : ""} · {overdueCount} with outstanding balance
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {selPhone && ledgerLoading && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                            <Loader2 size={24} color="#4f46e5" style={{ animation: "spin 0.7s linear infinite" }} />
                            <span style={{ color: "var(--muted)", fontSize: 13 }}>Loading ledger…</span>
                        </div>
                    )}

                    {/* Error */}
                    {selPhone && !ledgerLoading && !ledger && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                            <AlertTriangle size={20} color="#f59e0b" />
                            <span style={{ color: "var(--muted)", fontSize: 13 }}>Could not load ledger</span>
                        </div>
                    )}

                    {/* Ledger content */}
                    {selPhone && !ledgerLoading && ledger && (
                        <>
                            {/* ── Customer hero header ─────────── */}
                            <div style={{ flexShrink: 0, marginBottom: 16 }}>
                                {/* Name row */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                        <div style={{
                                            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                                            background: avatarGrad(customer.name),
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 22, fontWeight: 900, color: "#fff",
                                            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                                        }}>
                                            {customer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.4px" }}>{customer.name}</h2>
                                            <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={10} />{customer.phone}</span>
                                                {customer.gstin && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CreditCard size={10} />{customer.gstin}</span>}
                                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Receipt size={10} />{customer.invoiceCount} invoice{customer.invoiceCount !== 1 ? "s" : ""}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Action buttons */}
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.15)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.08)"}
                                            onClick={() => { setPayModal("advance"); setModalAmt(""); setModalErr(""); }}>
                                            <Wallet size={13} /> Add Advance
                                        </button>
                                        <button className="btn btn-primary"
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}
                                            onClick={() => { setPayModal("payment"); setModalAmt(""); setModalErr(""); }}>
                                            <CheckCircle2 size={13} /> Record Payment
                                        </button>
                                    </div>
                                </div>

                                {/* Stat cards */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                                    {[
                                        { label: "Total Billed", val: `₹${fmt(customer.totalInvoiced)}`, color: "var(--text)", icon: <IndianRupee size={13} color="#818cf8" />, bg: "rgba(99,102,241,0.08)" },
                                        { label: "Total Paid", val: `₹${fmt(customer.totalPaid)}`, color: "#10b981", icon: <ArrowDownLeft size={13} color="#10b981" />, bg: "rgba(16,185,129,0.08)" },
                                        { label: "Advance", val: `₹${fmt(customer.advance)}`, color: "#f59e0b", icon: <Wallet size={13} color="#f59e0b" />, bg: "rgba(245,158,11,0.08)" },
                                        {
                                            label: "Outstanding", color: customer.outstanding > 0 ? "#f87171" : "#10b981",
                                            val: `₹${fmt(customer.outstanding)}`,
                                            icon: customer.outstanding > 0 ? <AlertTriangle size={13} color="#f87171" /> : <CheckCircle2 size={13} color="#10b981" />,
                                            bg: customer.outstanding > 0 ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                                        },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: s.bg, border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{s.label}</span>
                                                <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
                                            </div>
                                            <div style={{ fontSize: 17, fontWeight: 900, color: s.color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.3px" }}>{s.val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Ledger entries ─────────────── */}
                            <div style={{ flex: 1, overflowY: "auto" }}>
                                {/* Section title */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                                    <Clock size={12} color="var(--muted)" />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.7px" }}>Transaction History</span>
                                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                                    <span style={{ fontSize: 10, color: "var(--muted)" }}>{entries.length} entries</span>
                                </div>

                                {entries.length === 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
                                        <Clock size={32} color="var(--muted)" strokeWidth={1.2} />
                                        <div style={{ fontSize: 13, color: "var(--muted)" }}>No transactions yet</div>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                                        {entries.map((e: any, idx: number) => {
                                            const cfg = ENTRY_CFG[e.entryType] || ENTRY_CFG.INVOICE;
                                            const Icon = cfg.icon;
                                            const isLast = idx === entries.length - 1;

                                            // Per-invoice paid status (only meaningful for INVOICE type)
                                            const isInvoice = e.entryType === "INVOICE";
                                            const invoiceDue = isInvoice ? Math.max(0, e.amount - (e.amountPaid ?? e.amount)) : 0;
                                            const fullyPaid = isInvoice && invoiceDue === 0;
                                            const isPartial = isInvoice && invoiceDue > 0;

                                            return (
                                                <div key={e.entryId} style={{ display: "flex", gap: 0 }}>
                                                    {/* Timeline connector */}
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingRight: 14, width: 42 }}>
                                                        <div style={{
                                                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                                            background: fullyPaid ? "rgba(16,185,129,0.1)" : cfg.bg,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            border: `1px solid ${fullyPaid ? "#10b98130" : cfg.color + "30"}`,
                                                        }}>
                                                            {fullyPaid
                                                                ? <CheckCircle2 size={14} color="#10b981" />
                                                                : <Icon size={14} color={cfg.color} />
                                                            }
                                                        </div>
                                                        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 12, background: "var(--border)", margin: "4px 0", borderRadius: 2 }} />}
                                                    </div>

                                                    {/* Entry card */}
                                                    <div style={{
                                                        flex: 1, borderRadius: 12, padding: "12px 14px", marginBottom: isLast ? 0 : 8,
                                                        display: "flex", alignItems: "center", gap: 12, transition: "box-shadow 0.12s",
                                                        background: fullyPaid ? "rgba(16,185,129,0.04)" : "var(--bg-card)",
                                                        border: fullyPaid ? "1px solid rgba(16,185,129,0.18)" : "1px solid var(--border)",
                                                    }}
                                                        onMouseEnter={el => (el.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px var(--shadow)"}
                                                        onMouseLeave={el => (el.currentTarget as HTMLDivElement).style.boxShadow = "none"}
                                                    >
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            {/* Row 1: description + type badge + paid badge */}
                                                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                                                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{e.description}</span>
                                                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>
                                                                    {cfg.label}
                                                                </span>
                                                                {fullyPaid && (
                                                                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: "rgba(16,185,129,0.12)", color: "#10b981", display: "flex", alignItems: "center", gap: 3 }}>
                                                                        <CheckCircle2 size={9} /> Paid in Full
                                                                    </span>
                                                                )}
                                                                {isPartial && (
                                                                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                                                                        Partial — Due ₹{fmt(invoiceDue)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Row 2: date + paid amount for invoices */}
                                                            <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 10, alignItems: "center" }}>
                                                                <span>{fmtDate(e.date)}</span>
                                                                {isInvoice && (
                                                                    <span style={{ color: "#10b981" }}>Paid ₹{fmt(e.amountPaid ?? e.amount)} of ₹{fmt(e.amount)}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Right: amount + running balance */}
                                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                            <div style={{ fontSize: 15, fontWeight: 900, color: fullyPaid ? "#10b981" : cfg.color, fontVariantNumeric: "tabular-nums" }}>
                                                                {cfg.sign} ₹{fmt(e.amount)}
                                                            </div>
                                                            <div style={{ fontSize: 11, marginTop: 2, fontWeight: 700, color: e.balanceAfter > 0 ? "#f87171" : "#10b981", fontVariantNumeric: "tabular-nums" }}>
                                                                Bal: ₹{fmt(e.balanceAfter)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AuthGuard>
    );
}

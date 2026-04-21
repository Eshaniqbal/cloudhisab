"use client";
import { useState } from "react";
import { useQuery, useMutation, useApolloClient } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LIST_CUSTOMERS, GET_CUSTOMER_LEDGER, GET_STATEMENT_DOWNLOAD_URL } from "@/lib/graphql/queries";
import { RECORD_CUSTOMER_PAYMENT, RECORD_ADVANCE, EDIT_CUSTOMER_PAYMENT, DELETE_CUSTOMER_PAYMENT, DELETE_CUSTOMER } from "@/lib/graphql/mutations";
import {
    Users, Search, X, Phone, CreditCard, Wallet, CheckCircle2,
    Loader2, Receipt, AlertTriangle, Clock, IndianRupee,
    ArrowDownLeft, Sparkles, Trash2, ChevronRight, Download,
    RotateCcw, ExternalLink, ClipboardList, Edit
} from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtK = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${fmt(n)}`;

const fmtDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const avatarGrad = (name: string) => {
    const g = ["linear-gradient(135deg,var(--indigo),var(--indigo-l))", "linear-gradient(135deg,var(--green),var(--green))",
        "linear-gradient(135deg,var(--yellow),var(--yellow))", "linear-gradient(135deg,var(--red),var(--red))",
        "linear-gradient(135deg,#06b6d4,#67e8f9)", "linear-gradient(135deg,#8b5cf6,#c084fc)"];
    return g[name.charCodeAt(0) % g.length];
};

const ENTRY_CFG: Record<string, { color: string; bg: string; label: string; icon: any; sign: string }> = {
    INVOICE: { color: "var(--indigo-l)", bg: "rgba(99,102,241,0.12)", label: "Invoice", icon: Receipt, sign: "−" },
    PAYMENT: { color: "var(--green)", bg: "rgba(16,185,129,0.12)", label: "Payment", icon: CheckCircle2, sign: "+" },
    ADVANCE: { color: "var(--green)", bg: "rgba(16,185,129,0.12)", label: "Payment", icon: Wallet, sign: "+" },
    RETURN: { color: "#f87171", bg: "rgba(239,68,68,0.12)", label: "Return", icon: RotateCcw, sign: "+" },
};

export default function CustomersPage() {
    const [search, setSearch] = useState("");
    const [selPhone, setSelPhone] = useState<string | null>(null);
    const [payModal, setPayModal] = useState<"payment" | "advance" | null>(null);
    const [modalAmt, setModalAmt] = useState("");
    const [modalNotes, setModalNotes] = useState("");
    const [modalErr, setModalErr] = useState("");
    const [editModal, setEditModal] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ phone: string; name: string } | null>(null);
    const [deleteEntryTarget, setDeleteEntryTarget] = useState<{ phone: string; entryId: string; description: string } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [statementEntry, setStatementEntry] = useState<any>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const client = useApolloClient();

    const { data: listData, loading: listLoading, refetch: refetchList } =
        useQuery(LIST_CUSTOMERS, { variables: { search: search || null }, fetchPolicy: "cache-and-network" } as any);

    const { data: ledgerData, loading: ledgerLoading, refetch: refetchLedger } =
        useQuery(GET_CUSTOMER_LEDGER, { variables: { phone: selPhone }, skip: !selPhone, fetchPolicy: "cache-and-network" } as any);

    const [recordPayment, { loading: payLoading }] = useMutation(RECORD_CUSTOMER_PAYMENT);
    const [recordAdvance, { loading: advLoading }] = useMutation(RECORD_ADVANCE);
    const [editPayment, { loading: editLoading }] = useMutation(EDIT_CUSTOMER_PAYMENT);
    const [deletePaymentEntry, { loading: deleteEntryLoading }] = useMutation(DELETE_CUSTOMER_PAYMENT);
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

    const confirmDeleteEntry = async () => {
        if (!deleteEntryTarget) return;
        setDeleteLoading(true);
        try {
            await (deletePaymentEntry as any)({ 
                variables: { 
                    phone: deleteEntryTarget.phone, 
                    entryId: deleteEntryTarget.entryId 
                } 
            });
            refetchLedger();
            refetchList();
        } finally {
            setDeleteLoading(false);
            setDeleteEntryTarget(null);
        }
    };

    // aggregate stats across all customers
    const totalOutstanding = customers.reduce((s: number, c: any) => s + Math.max(0, c.outstanding || 0), 0);
    const totalInvoiced = customers.reduce((s: number, c: any) => s + (c.totalInvoiced || 0), 0);
    const overdueCount = customers.filter((c: any) => c.outstanding > 0).length;

    // Statement modal — shows original invoice + all returns against it
    const StatementModal = ({ entry }: { entry: any }) => {
        const returns = (entries as any[]).filter(
            (e: any) => e.entryType === "RETURN" && e.saleId === entry.saleId
        );
        const totalReturned = returns.reduce((s: number, r: any) => s + r.amount, 0);
        const netBilled = entry.amount - totalReturned;
        const paid = entry.amountPaid ?? entry.amount;
        const netOutstanding = Math.max(0, netBilled - paid);

        return (
            <div onClick={() => setStatementEntry(null)} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 22, padding: "28px", width: "100%", maxWidth: 520, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>Bill Statement</div>
                            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.2px" }}>{entry.description}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{fmtDate(entry.date)} · {customer?.name}</div>
                        </div>
                        <button onClick={() => setStatementEntry(null)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                            <X size={14} />
                        </button>
                    </div>

                    {/* Original invoice row */}
                    <div style={{ background: "var(--bg-card2)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 14 }}>
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Receipt size={13} color="var(--indigo-l)" />
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Original Invoice</span>
                            </div>
                            {entry.saleId && (
                                <div style={{ display: "flex", gap: 12 }}>
                                    <a href={`/billing/${entry.saleId}`} style={{ fontSize: 11, color: "var(--indigo-l)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }} onClick={e => e.stopPropagation()}><ExternalLink size={10} /> View</a>
                                    <a href={`/returns?invoiceId=${entry.saleId}`} style={{ fontSize: 11, color: "var(--red)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }} onClick={e => e.stopPropagation()}><RotateCcw size={10} /> Return Items</a>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{entry.description}</div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>Paid at billing: ₹{fmt(entry.amountPaid ?? entry.amount)}</div>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)" }}>₹{fmt(entry.amount)}</div>
                        </div>
                    </div>

                    {/* Returns */}
                    {returns.length > 0 && (
                        <div style={{ background: "rgba(239,68,68,0.04)", borderRadius: 14, border: "1px solid rgba(239,68,68,0.15)", overflow: "hidden", marginBottom: 14 }}>
                            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(239,68,68,0.12)", display: "flex", alignItems: "center", gap: 8 }}>
                                <RotateCcw size={12} color="#f87171" />
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.06em" }}>Returns / Credit Notes</span>
                            </div>
                            {returns.map((r: any, i: number) => (
                                <div key={r.entryId} style={{ padding: "12px 16px", borderBottom: i < returns.length - 1 ? "1px solid rgba(239,68,68,0.1)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{r.creditNote || "Credit Note"}</div>
                                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                                                {r.refundType === "CASH_REFUND" ? "Cash Refund" : "Credit Note"}
                                            </span>
                                            <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(r.date)}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: "#10b981" }}>+ ₹{fmt(r.amount)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Summary */}
                    <div style={{ background: "var(--bg-card2)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
                        {[
                            { label: "Original Billed", value: `₹${fmt(entry.amount)}`, color: "var(--text)", bold: false },
                            { label: "Total Returned", value: `− ₹${fmt(totalReturned)}`, color: returns.length > 0 ? "#10b981" : "var(--muted)", bold: false },
                            { label: "Net Billed", value: `₹${fmt(netBilled)}`, color: "var(--text)", bold: true },
                            { label: "Amount Paid", value: `₹${fmt(paid)}`, color: "var(--green)", bold: false },
                        ].map((row, i) => (
                            <div key={row.label} style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: row.bold ? 700 : 500 }}>{row.label}</span>
                                <span style={{ fontSize: row.bold ? 16 : 14, fontWeight: row.bold ? 900 : 600, color: row.color }}>{row.value}</span>
                            </div>
                        ))}
                        {/* Twist: Previous balance and Total Pending */}
                        {(() => {
                            // Find all other pending invoices
                            const otherPending = (entries as any[]).filter(
                                (e: any) => e.entryType === "INVOICE" && e.saleId !== entry.saleId && e.description !== entry.description
                            ).map((e: any) => {
                                const eDue = e.amount - (e.amountPaid ?? e.amount);
                                return { description: e.description, due: eDue };
                            }).filter(e => e.due > 0.01);

                            // Calculate previous balance correctly: sum of other dues minus all payments/advances/returns
                            let prevBal = 0;
                            (entries as any[]).forEach((e: any) => {
                                // Skip current invoice
                                if (e.saleId === entry.saleId || e.description === entry.description) return;
                                
                                if (e.entryType === "INVOICE") {
                                    prevBal += (e.amount - (e.amountPaid ?? e.amount));
                                } else if (["PAYMENT", "ADVANCE", "RETURN"].includes(e.entryType)) {
                                    prevBal -= e.amount;
                                }
                            });

                            const totalPending = netOutstanding + prevBal;

                            return (
                                <>
                                    <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                                        <span style={{ fontSize: 13, color: "var(--muted)" }}>Current Bill Pending</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: netOutstanding > 0 ? "var(--red)" : "var(--green)" }}>₹{fmt(netOutstanding)}</span>
                                    </div>
                                    {Math.abs(prevBal) > 0.01 && (
                                        <>
                                            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: otherPending.length > 0 ? "none" : "1px solid var(--border)" }}>
                                                <span style={{ fontSize: 13, color: "var(--muted)" }}>Previous Balance</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: prevBal > 0 ? "var(--red)" : "var(--green)" }}>₹{fmt(Math.abs(prevBal))}</span>
                                            </div>
                                            {otherPending.map((p, idx) => (
                                                <div key={idx} style={{ padding: "4px 18px 4px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)", fontStyle: "italic", borderBottom: idx === otherPending.length - 1 ? "1px solid var(--border)" : "none" }}>
                                                    <span>↳ {p.description}</span>
                                                    <span>₹{fmt(p.due)}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-input)", borderTop: "2px solid var(--border)" }}>
                                        <span style={{ fontSize: 14, fontWeight: 800 }}>TOTAL PENDING</span>
                                        <span style={{ fontSize: 20, fontWeight: 900, color: totalPending > 0 ? "var(--red)" : "var(--green)" }}>₹{fmt(Math.abs(totalPending))}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <button className="btn btn-ghost" style={{ width: "100%", marginTop: 16 }} onClick={() => setStatementEntry(null)}>Close</button>
                </div>
            </div>
        );
    };

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

    const submitEdit = async () => {
        setModalErr("");
        const amt = +modalAmt;
        if (!amt || amt <= 0) { setModalErr("Enter a valid amount"); return; }
        try {
            await editPayment({
                variables: {
                    input: {
                        phone: selPhone,
                        entryId: editModal.entryId,
                        amount: amt,
                        notes: modalNotes || null
                    }
                }
            } as any);
            setEditModal(null); setModalAmt(""); setModalNotes("");
            refetchLedger(); refetchList();
        } catch (e: any) { setModalErr(e.message || "Failed"); }
    };

    const handleDownloadPdf = async () => {
        if (!selPhone || pdfLoading) return;
        setPdfLoading(true);
        
        const poll = async (retries = 0) => {
            if (retries > 15) {
                setPdfLoading(false);
                alert("Generation took too long. Please try again.");
                return;
            }
            
            try {
                // First call with force=true, subsequent calls without force to poll
                const { data } = await client.query({
                    query: GET_STATEMENT_DOWNLOAD_URL,
                    variables: { phone: selPhone, force: retries === 0 },
                    fetchPolicy: "no-cache",
                });
                
                if (data?.getStatementDownloadUrl) {
                    window.open(data.getStatementDownloadUrl, "_blank");
                    setPdfLoading(false);
                } else {
                    // Not ready yet, wait 3 seconds and try again
                    setTimeout(() => poll(retries + 1), 3000);
                }
            } catch (e) {
                console.error(e);
                setPdfLoading(false);
                alert("Failed to generate PDF");
            }
        };

        poll();
    };

    return (
        <AuthGuard>
            {/* Statement modal */}
            {statementEntry && <StatementModal entry={statementEntry} />}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fadeInScale { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .glass-card { 
                    background: var(--bg-card); 
                    border: 1px solid var(--border); 
                    border-radius: 24px; 
                    box-shadow: 0 12px 48px rgba(0,0,0,0.3);
                    position: relative;
                    overflow: hidden;
                }
                .glass-card::before {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; right: 0; height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                    pointer-events: none;
                }

                .customer-row { 
                    transition: all 0.3s cubic-bezier(0.2, 1, 0.3, 1); 
                    position: relative;
                }
                .customer-row:hover:not(.active) { 
                    transform: translateY(-2px); 
                    border-color: rgba(99,102,241,0.4); 
                    background: var(--bg-card2);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                }
                .customer-row.active { 
                    border-color: var(--indigo-l); 
                    background: rgba(79,70,229,0.12); 
                    box-shadow: 0 12px 32px rgba(79,70,229,0.18); 
                }

                .stat-pill {
                    padding: 12px 16px;
                    border-radius: 18px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    transition: all 0.2s ease;
                }
                .stat-pill:hover {
                    border-color: var(--indigo-l);
                    transform: translateY(-2px);
                }

                .search-container {
                    position: relative;
                    transition: all 0.2s ease;
                }

                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
            `}</style>

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

            <ConfirmDialog
                open={!!deleteEntryTarget}
                title="Delete Ledger Entry"
                message={`Permanently delete the ${deleteEntryTarget?.description} entry?`}
                subMessage="This will adjust the customer's aggregate balance accordingly."
                confirmLabel="Yes, Delete"
                loading={deleteLoading}
                onConfirm={confirmDeleteEntry}
                onCancel={() => setDeleteEntryTarget(null)}
            />

            {/* ═══ Payment / Advance Modal ═══ */}
            {payModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setPayModal(null)}>
                    <div className="glass-card" style={{ padding: "32px", width: 440, maxWidth: "100%", position: "relative", animation: "fadeInScale 0.2s ease" }} onClick={e => e.stopPropagation()}>

                        <button onClick={() => setPayModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 8, borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-input)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                            <X size={18} />
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                                background: payModal === "payment" ? "linear-gradient(135deg,var(--green),var(--green))" : "linear-gradient(135deg,var(--yellow),var(--yellow))",
                                boxShadow: payModal === "payment" ? "0 8px 24px rgba(16,185,129,0.35)" : "0 8px 24px rgba(245,158,11,0.35)",
                            }}>
                                {payModal === "payment" ? <CheckCircle2 size={24} color="#fff" /> : <Wallet size={24} color="#fff" />}
                            </div>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>
                                    {payModal === "payment" ? "Record Payment" : "Record Advance"}
                                </div>
                                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>for <strong style={{ color: "var(--text)" }}>{customer?.name}</strong></div>
                            </div>
                        </div>

                        {/* Outstanding info */}
                        {customer && payModal === "payment" && customer.outstanding > 0 && (
                            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "14px 18px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Outstanding balance</span>
                                <span style={{ fontSize: 18, fontWeight: 900, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>₹{fmt(customer.outstanding)}</span>
                            </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Amount (₹)</label>
                                <input className="input" type="number" min={1} step={1}
                                    style={{ fontSize: 24, fontWeight: 900, textAlign: "center", letterSpacing: "-0.5px", padding: "12px" }}
                                    placeholder="0.00" value={modalAmt} autoFocus
                                    onChange={e => setModalAmt(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && submitModal()} />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Notes (optional)</label>
                                <input className="input" style={{ fontSize: 14 }} placeholder="e.g. Cash, UPI, cheque…"
                                    value={modalNotes} onChange={e => setModalNotes(e.target.value)} />
                            </div>

                            {modalErr && (
                                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "var(--red)", display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease" }}>
                                    <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {modalErr}
                                </div>
                            )}

                            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, fontWeight: 700 }}
                                    onClick={() => { setPayModal(null); setModalAmt(""); setModalErr(""); }}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}
                                    onClick={submitModal} disabled={payLoading || advLoading}>
                                    {(payLoading || advLoading) ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : null}
                                    {payModal === "payment" ? "Record Payment" : "Save Advance"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Edit Payment Modal ═══ */}
            {editModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setEditModal(null)}>
                    <div className="glass-card" style={{ padding: "32px", width: 440, maxWidth: "100%", position: "relative", animation: "fadeInScale 0.2s ease" }} onClick={e => e.stopPropagation()}>

                        <button onClick={() => setEditModal(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 8, borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-input)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                            <X size={18} />
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                                background: "linear-gradient(135deg,var(--indigo),var(--indigo-l))",
                                boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
                            }}>
                                <Edit size={24} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>
                                    {editModal.entryType === "PAYMENT" ? "Edit Payment" : 
                                     editModal.entryType === "ADVANCE" ? "Edit Advance" :
                                     editModal.entryType === "INVOICE" ? "Edit Invoice Payment" :
                                     "Edit Return Amount"}
                                </div>
                                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Update entry for <strong style={{ color: "var(--text)" }}>{customer?.name}</strong></div>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                                    {editModal.entryType === "INVOICE" ? "Amount Paid (₹)" : "Amount (₹)"}
                                </label>
                                <input className="input" type="number" min={1} step={1}
                                    style={{ fontSize: 24, fontWeight: 900, textAlign: "center", letterSpacing: "-0.5px", padding: "12px" }}
                                    placeholder="0.00" value={modalAmt} autoFocus
                                    onChange={e => setModalAmt(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && submitEdit()} />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Notes (optional)</label>
                                <input className="input" style={{ fontSize: 14 }} placeholder="e.g. Cash, UPI, cheque…"
                                    value={modalNotes} onChange={e => setModalNotes(e.target.value)} />
                            </div>

                            {modalErr && (
                                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "var(--red)", display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease" }}>
                                    <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {modalErr}
                                </div>
                            )}

                            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, fontWeight: 700 }}
                                    onClick={() => { setEditModal(null); setModalAmt(""); setModalErr(""); }}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}
                                    onClick={submitEdit} disabled={editLoading}>
                                    {editLoading ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : null}
                                    Update Entry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Main Split Layout ═══ */}
            <div style={{ display: "flex", gap: 20, height: "calc(100vh - 48px)", paddingBottom: 20 }}>

                {/* ═══════════════════════════════════════════
                    LEFT — Customer panel
                ═══════════════════════════════════════════ */}
                <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>

                    {/* Left Header Box */}
                    <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, background: "var(--bg-card)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ 
                                    width: 48, height: 48, borderRadius: 16, 
                                    background: "linear-gradient(135deg, var(--indigo) 0%, #818cf8 100%)", 
                                    display: "flex", alignItems: "center", justifyContent: "center", 
                                    boxShadow: "0 8px 24px rgba(79,70,229,0.4)" 
                                }}>
                                    <Users size={22} color="#fff" />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>Customers</h1>
                                    <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                                        {listData?.listCustomers?.total || 0} total active
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div className="stat-pill" style={{ background: "rgba(99,102,241,0.05)" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Total Billed</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--indigo-l)", letterSpacing: "-0.5px" }}>{fmtK(totalInvoiced)}</div>
                            </div>
                            <div className="stat-pill" style={{ background: totalOutstanding > 0 ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.05)" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Outstanding</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: totalOutstanding > 0 ? "var(--red)" : "var(--green)", letterSpacing: "-0.5px" }}>{fmtK(totalOutstanding)}</div>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="search-container">
                            <Search size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                            <input className="input" 
                                style={{ 
                                    paddingLeft: 44, paddingRight: 40, height: 48, fontSize: 14, 
                                    background: "var(--bg-input)", border: "1px solid var(--border)", 
                                    borderRadius: 16, transition: "all 0.2s" 
                                }}
                                placeholder="Search by name or phone…" value={search}
                                onChange={e => setSearch(e.target.value)} />
                            {search && (
                                <button onClick={() => setSearch("")}
                                    style={{ 
                                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", 
                                        background: "var(--bg-card2)", border: "none", cursor: "pointer", 
                                        color: "var(--muted)", width: 24, height: 24, borderRadius: 8,
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Customer list */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
                        {listLoading && (
                            <div style={{ padding: "40px 0", textAlign: "center" }}>
                                <Loader2 size={24} color="var(--indigo-l)" style={{ animation: "spin 0.7s linear infinite" }} />
                            </div>
                        )}
                        {!listLoading && customers.length === 0 && (
                            <div style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20 }}>
                                <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Users size={28} color="var(--indigo-l)" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>No customers yet</div>
                                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>Customers are created automatically when you bill them.</div>
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
                                    className={`customer-row ${active ? "active" : ""}`}
                                    style={{
                                        background: "var(--bg-card)", border: "1px solid var(--border)",
                                        borderRadius: 20, padding: "16px", cursor: "pointer", textAlign: "left", width: "100%",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                        {/* Avatar */}
                                        <div style={{ 
                                            width: 48, height: 48, borderRadius: 14, flexShrink: 0, 
                                            background: avatarGrad(c.name), 
                                            display: "flex", alignItems: "center", justifyContent: "center", 
                                            fontSize: 18, fontWeight: 900, color: "#fff", 
                                            boxShadow: `0 8px 20px rgba(0,0,0,0.25)`,
                                            position: "relative", overflow: "hidden"
                                        }}>
                                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(255,255,255,0.2), transparent)" }} />
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        
                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.2px" }}>{c.name}</div>
                                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                                                <Phone size={11} color="var(--indigo-l)" /> 
                                                <span style={{ fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.2px" }}>{c.phone}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Balance */}
                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                            {hasDebt ? (
                                                <div style={{ fontSize: 15, fontWeight: 900, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>₹{fmt(c.outstanding)}</div>
                                            ) : (
                                                <div style={{ 
                                                    display: "inline-flex", alignItems: "center", gap: 5, 
                                                    fontSize: 10, fontWeight: 800, color: "var(--green)", 
                                                    background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                                                    padding: "4px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em"
                                                }}>
                                                    <CheckCircle2 size={10} /> Paid
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Progress bar */}
                                    <div style={{ marginTop: 16 }}>
                                        <div style={{ background: "var(--bg-input)", borderRadius: 10, height: 6, overflow: "hidden", position: "relative" }}>
                                            <div style={{
                                                height: "100%", borderRadius: 10, transition: "width 0.8s cubic-bezier(0.2, 1, 0.3, 1)",
                                                background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                                                width: `${paidPct}%`,
                                                boxShadow: "0 0 10px rgba(16,185,129,0.3)"
                                            }} />
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{paidPct.toFixed(0)}% Settled</span>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>Total: <span style={{ color: "var(--text)" }}>{fmtK(c.totalInvoiced)}</span></span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    RIGHT — Ledger panel
                ═══════════════════════════════════════════ */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 24, overflow: "hidden", position: "relative" }}>

                    {/* Empty state */}
                    {!selPhone && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 32, padding: 60, textAlign: "center" }}>
                            <div style={{ position: "relative" }}>
                                <div style={{ 
                                    width: 140, height: 140, borderRadius: 40, 
                                    background: "rgba(99,102,241,0.04)", 
                                    border: "1px solid rgba(99,102,241,0.1)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    animation: "float 4s ease-in-out infinite",
                                    position: "relative", zIndex: 2
                                }}>
                                    <div style={{ 
                                        width: 80, height: 80, borderRadius: 24,
                                        background: "linear-gradient(135deg, var(--indigo-l) 0%, #818cf8 100%)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        boxShadow: "0 20px 40px rgba(79,70,229,0.25)"
                                    }}>
                                        <Users size={40} color="#fff" />
                                    </div>
                                </div>
                                {/* Decorative elements */}
                                <div style={{ 
                                    position: "absolute", top: -20, right: -20, width: 60, height: 60, 
                                    borderRadius: "50%", background: "rgba(16,185,129,0.1)", 
                                    animation: "float 5s ease-in-out infinite reverse" 
                                }} />
                                <div style={{ 
                                    position: "absolute", bottom: -10, left: -30, width: 40, height: 40, 
                                    borderRadius: 12, background: "rgba(245,158,11,0.1)", transform: "rotate(15deg)",
                                    animation: "float 6s ease-in-out infinite 1s" 
                                }} />
                            </div>

                            <div style={{ maxWidth: 400 }}>
                                <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", marginBottom: 12, letterSpacing: "-0.8px" }}>Select a Customer</h2>
                                <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6, marginBottom: 32 }}>
                                    Track full ledger history, record payments, and manage balances instantly from one central dashboard.
                                </p>
                                <div style={{ 
                                    display: "inline-flex", alignItems: "center", gap: 10, 
                                    background: "var(--bg-card2)", border: "1px solid var(--border)", 
                                    padding: "10px 24px", borderRadius: 99, fontSize: 14, fontWeight: 700,
                                    color: "var(--muted)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                                }}>
                                    <Sparkles size={16} color="var(--indigo-l)" />
                                    <span>{customers.length} Customers</span>
                                    <span style={{ color: "var(--border)" }}>•</span>
                                    <span style={{ color: overdueCount > 0 ? "var(--red)" : "var(--green)" }}>{overdueCount} Overdue</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {selPhone && ledgerLoading && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
                            <Loader2 size={32} color="var(--indigo-l)" style={{ animation: "spin 0.7s linear infinite" }} />
                            <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>Loading ledger…</span>
                        </div>
                    )}

                    {/* Error */}
                    {selPhone && !ledgerLoading && !ledger && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                            <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={28} color="var(--red)" /></div>
                            <span style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>Could not load ledger</span>
                        </div>
                    )}

                    {/* Ledger content */}
                    {selPhone && !ledgerLoading && ledger && (
                        <>
                            {/* ── Customer hero header ─────────── */}
                            <div style={{ flexShrink: 0, padding: "40px", borderBottom: "1px solid var(--border)", background: "var(--bg-card2)", position: "relative", overflow: "hidden" }}>
                                {/* Gradient Background Decoration */}
                                <div style={{ position: "absolute", top: 0, right: 0, width: 400, height: 400, background: "radial-gradient(circle at top right, rgba(99,102,241,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
                                <div style={{ position: "absolute", bottom: -100, left: -100, width: 300, height: 300, background: "radial-gradient(circle at bottom left, rgba(16,185,129,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

                                {/* Name & Actions row */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, position: "relative", zIndex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                                        <div style={{
                                            width: 80, height: 80, borderRadius: 24, flexShrink: 0,
                                            background: avatarGrad(customer.name),
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 32, fontWeight: 900, color: "#fff",
                                            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                                            position: "relative", overflow: "hidden"
                                        }}>
                                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(255,255,255,0.2), transparent)" }} />
                                            {customer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                                                <h2 style={{ fontSize: 32, fontWeight: 900, color: "var(--text)", letterSpacing: "-1px" }}>{customer.name}</h2>
                                                <button
                                                    onClick={() => handleDeleteCustomer(customer.phone, customer.name)}
                                                    title="Delete customer"
                                                    style={{ 
                                                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", 
                                                        borderRadius: 10, padding: "8px", cursor: "pointer", display: "flex", 
                                                        alignItems: "center", color: "var(--red)", transition: "all 0.2s" 
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.transform = "scale(1.05)"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.transform = "scale(1)"; }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div style={{ fontSize: 14, color: "var(--muted)", display: "flex", alignItems: "center", gap: 18, fontWeight: 500 }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Phone size={14} color="var(--indigo-l)" /> <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--text)" }}>{customer.phone}</span></span>
                                                {customer.gstin && <span style={{ display: "flex", alignItems: "center", gap: 8 }}><CreditCard size={14} color="var(--green)" /> {customer.gstin}</span>}
                                                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Receipt size={14} color="var(--yellow)" /> {customer.invoiceCount} invoices</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Action buttons */}
                                    <div style={{ display: "flex", gap: 14 }}>
                                        <button className="btn btn-primary"
                                            style={{ 
                                                display: "flex", alignItems: "center", gap: 10, 
                                                padding: "14px 28px", borderRadius: 16, fontSize: 15, 
                                                fontWeight: 800, boxShadow: "0 10px 30px rgba(79,70,229,0.4)",
                                                transition: "all 0.3s cubic-bezier(0.2, 1, 0.3, 1)"
                                            }}
                                            onClick={() => { setPayModal("payment"); setModalAmt(""); setModalErr(""); }}>
                                            <CheckCircle2 size={18} /> Record Payment
                                        </button>
                                    </div>
                                </div>

                                {/* Stat cards — 4 cards: Billed, Returned, Paid, Total Pending */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, position: "relative", zIndex: 1 }}>
                                    {(() => {
                                        const returned = customer.totalReturned || 0;
                                        const outstanding = customer.outstanding; 
                                        const balanceDue = Math.max(0, outstanding);
                                        const totalPaid = (customer.totalPaid || 0) + (customer.advance || 0);
                                        
                                        return [
                                            { label: "Total Billed", val: `₹${fmt(customer.totalInvoiced)}`, color: "var(--text)", icon: <IndianRupee size={16} color="var(--indigo-l)" />, bg: "var(--bg-card)", border: "var(--border)" },
                                            { label: "Total Returned", val: `₹${fmt(returned)}`, color: returned > 0 ? "#f87171" : "var(--muted)", icon: <RotateCcw size={16} color={returned > 0 ? "#f87171" : "var(--muted)"} />, bg: returned > 0 ? "rgba(239,68,68,0.05)" : "var(--bg-card)", border: returned > 0 ? "rgba(239,68,68,0.15)" : "var(--border)" },
                                            { label: "Total Paid", val: `₹${fmt(totalPaid)}`, color: "var(--green)", icon: <ArrowDownLeft size={16} color="var(--green)" />, bg: "rgba(16,185,129,0.04)", border: "rgba(16,185,129,0.15)" },
                                            {
                                                label: "Balance Due",
                                                val: `₹${fmt(balanceDue)}`,
                                                color: balanceDue > 0 ? "var(--red)" : "var(--green)",
                                                icon: balanceDue > 0 ? <AlertTriangle size={16} color="var(--red)" /> : <CheckCircle2 size={16} color="var(--green)" />,
                                                bg: balanceDue > 0 ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                                                border: balanceDue > 0 ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)",
                                                special: true
                                            },
                                        ];
                                    })().map(s => (
                                        <div key={s.label} style={{ 
                                            background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: "18px 20px",
                                            boxShadow: s.special ? "0 8px 24px rgba(239,68,68,0.1)" : "none",
                                            transition: "all 0.2s ease"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                                                <div style={{ 
                                                    width: 32, height: 32, borderRadius: 10, 
                                                    background: "var(--bg-input)", border: "1px solid var(--border)", 
                                                    display: "flex", alignItems: "center", justifyContent: "center" 
                                                }}>{s.icon}</div>
                                            </div>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>{s.val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Ledger entries ─────────────── */}
                            <div style={{ flex: 1, overflowY: "auto", padding: 32, paddingRight: 16 }}>
                                {/* Ledger header with CSV download */}
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                                    <Clock size={14} color="var(--muted)" />
                                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Transaction History</span>
                                    <div style={{ flex: 1, height: 1.5, background: "var(--border)", borderRadius: 2 }} />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", background: "var(--bg-input)", padding: "4px 12px", borderRadius: 20 }}>{entries.length} entries</span>
                                    <button
                                        onClick={() => {
                                            const rows = [["Date", "Type", "Description", "Amount", "Balance After"]];
                                            entries.forEach((e: any) => rows.push([e.date, e.entryType, e.description, e.amount.toFixed(2), e.balanceAfter.toFixed(2)]));
                                            const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
                                            const blob = new Blob([csv], { type: "text/csv" });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url; a.download = `${customer?.name?.replace(/ /g, "_")}_ledger.csv`; a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--muted)", transition: "all 0.15s", whiteSpace: "nowrap" }}
                                        onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--text)"; (e.currentTarget as any).style.borderColor = "rgba(99,102,241,0.3)"; }}
                                        onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--muted)"; (e.currentTarget as any).style.borderColor = "var(--border)"; }}
                                    >
                                        <Download size={12} /> CSV
                                    </button>
                                    <button
                                        onClick={handleDownloadPdf}
                                        disabled={pdfLoading}
                                        style={{ 
                                            display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", 
                                            borderRadius: 12, background: pdfLoading ? "rgba(99,102,241,0.1)" : "var(--bg-card)", 
                                            border: "1px solid var(--border)", fontSize: 13, fontWeight: 600, 
                                            cursor: pdfLoading ? "wait" : "pointer", color: pdfLoading ? "var(--indigo-l)" : "var(--muted)", 
                                            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", whiteSpace: "nowrap",
                                            boxShadow: pdfLoading ? "none" : "0 2px 8px rgba(0,0,0,0.05)"
                                        }}
                                        onMouseEnter={e => { if(!pdfLoading){ (e.currentTarget as any).style.color = "var(--text)"; (e.currentTarget as any).style.borderColor = "var(--indigo-l)"; (e.currentTarget as any).style.transform = "translateY(-1px)"; } }}
                                        onMouseLeave={e => { if(!pdfLoading){ (e.currentTarget as any).style.color = "var(--muted)"; (e.currentTarget as any).style.borderColor = "var(--border)"; (e.currentTarget as any).style.transform = "translateY(0)"; } }}
                                    >
                                        {pdfLoading ? (
                                            <>
                                                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                                                <span>Preparing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Receipt size={14} style={{ color: "var(--indigo-l)" }} />
                                                <span>Export PDF</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {entries.length === 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 16 }}>
                                        <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <Clock size={32} color="var(--muted)" strokeWidth={1.5} />
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>No transaction history found</div>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingRight: 16 }}>
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
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingRight: 20, width: 56 }}>
                                                        <div style={{
                                                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                                                            background: fullyPaid ? "rgba(16,185,129,0.12)" : cfg.bg,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            border: `1px solid ${fullyPaid ? "var(--green)30" : cfg.color + "30"}`,
                                                        }}>
                                                            {fullyPaid
                                                                ? <CheckCircle2 size={18} color="var(--green)" />
                                                                : <Icon size={18} color={cfg.color} />
                                                            }
                                                        </div>
                                                        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 16, background: "var(--border)", margin: "6px 0", borderRadius: 2 }} />}
                                                    </div>

                                                    {/* Entry card */}
                                                    <div style={{
                                                        flex: 1, borderRadius: 16, padding: "16px 20px", marginBottom: isLast ? 0 : 12,
                                                        display: "flex", alignItems: "center", gap: 16, transition: "all 0.15s ease",
                                                        background: fullyPaid ? "rgba(16,185,129,0.03)" : "var(--bg-input)",
                                                        border: fullyPaid ? "1px solid rgba(16,185,129,0.15)" : "1px solid var(--border)",
                                                    }}
                                                        onMouseEnter={el => { (el.currentTarget as HTMLDivElement).style.transform = "translateX(4px)"; (el.currentTarget as HTMLDivElement).style.borderColor = fullyPaid ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"; }}
                                                        onMouseLeave={el => { (el.currentTarget as HTMLDivElement).style.transform = "translateX(0)"; (el.currentTarget as HTMLDivElement).style.borderColor = fullyPaid ? "rgba(16,185,129,0.15)" : "var(--border)"; }}
                                                    >
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            {/* Row 1 */}
                                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                                                                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{e.description}</span>
                                                                <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color, display: "flex", alignItems: "center", gap: 4 }}>
                                                                    <Icon size={11} /> {cfg.label}
                                                                </span>
                                                                {fullyPaid && (
                                                                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "rgba(16,185,129,0.12)", color: "var(--green)", display: "flex", alignItems: "center", gap: 4 }}>
                                                                        <CheckCircle2 size={11} /> Paid in Full
                                                                    </span>
                                                                )}
                                                                {isPartial && (
                                                                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "rgba(245,158,11,0.12)", color: "var(--yellow)" }}>
                                                                        Partial — Due ₹{fmt(invoiceDue)}
                                                                    </span>
                                                                )}
                                                                {(e.entryType === "PAYMENT" || e.entryType === "ADVANCE" || e.entryType === "INVOICE" || e.entryType === "RETURN") && (
                                                                    <div style={{ display: "flex", gap: 6 }}>
                                                                        <button
                                                                            onClick={(ev) => {
                                                                                ev.stopPropagation();
                                                                                setEditModal(e);
                                                                                // For invoices, we edit the paid_now amount
                                                                                setModalAmt(e.entryType === "INVOICE" ? (e.amountPaid ?? e.amount).toString() : e.amount.toString());
                                                                                setModalNotes(e.description);
                                                                            }}
                                                                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.15s" }}
                                                                            onMouseEnter={el => { (el.currentTarget as any).style.background = "var(--bg-input)"; (el.currentTarget as any).style.color = "var(--text)"; }}
                                                                            onMouseLeave={el => { (el.currentTarget as any).style.background = "rgba(255,255,255,0.05)"; (el.currentTarget as any).style.color = "var(--muted)"; }}
                                                                        >
                                                                            <Edit size={10} /> Edit
                                                                        </button>
                                                                        {e.entryType !== "INVOICE" && (
                                                                            <button
                                                                                onClick={(ev) => {
                                                                                    ev.stopPropagation();
                                                                                    setDeleteEntryTarget({ phone: selPhone!, entryId: e.entryId, description: e.description });
                                                                                }}
                                                                                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(239,68,68,0.05)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", transition: "all 0.15s" }}
                                                                                onMouseEnter={el => { (el.currentTarget as any).style.background = "rgba(239,68,68,0.15)"; }}
                                                                                onMouseLeave={el => { (el.currentTarget as any).style.background = "rgba(239,68,68,0.05)"; }}
                                                                            >
                                                                                <Trash2 size={10} /> Delete
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {/* Invoice link + download button */}
                                                                {isInvoice && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={ev => { ev.stopPropagation(); setStatementEntry(e); }}
                                                                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(245,158,11,0.08)", color: "var(--yellow)", border: "1px solid rgba(245,158,11,0.25)", cursor: "pointer", transition: "all 0.15s" }}
                                                                        onMouseEnter={el => (el.currentTarget as any).style.background = "rgba(245,158,11,0.16)"}
                                                                        onMouseLeave={el => (el.currentTarget as any).style.background = "rgba(245,158,11,0.08)"}
                                                                    >
                                                                        <ClipboardList size={10} /> Statement
                                                                    </button>
                                                                )}
                                                                {isInvoice && e.saleId && (
                                                                    <a href={`/billing/${e.saleId}`}
                                                                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(99,102,241,0.08)", color: "var(--indigo-l)", border: "1px solid rgba(99,102,241,0.2)", textDecoration: "none", transition: "all 0.15s" }}
                                                                        onMouseEnter={el => (el.currentTarget as any).style.background = "rgba(99,102,241,0.16)"}
                                                                        onMouseLeave={el => (el.currentTarget as any).style.background = "rgba(99,102,241,0.08)"}
                                                                        onClick={ev => ev.stopPropagation()}
                                                                    >
                                                                        <ExternalLink size={10} /> View Invoice
                                                                    </a>
                                                                )}
                                                                 {e.entryType === "RETURN" && e.returnId && (
                                                                     <a href={`/returns/${e.returnId}`}
                                                                         target="_blank" rel="noreferrer"
                                                                         style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", textDecoration: "none", transition: "all 0.15s" }}
                                                                         onMouseEnter={el => (el.currentTarget as any).style.background = "rgba(239,68,68,0.16)"}
                                                                         onMouseLeave={el => (el.currentTarget as any).style.background = "rgba(239,68,68,0.08)"}
                                                                         onClick={ev => ev.stopPropagation()}
                                                                     >
                                                                         <ExternalLink size={10} /> View Credit Note
                                                                     </a>
                                                                 )}
                                                                {isInvoice && e.pdfUrl && (
                                                                    <a href={e.pdfUrl} download target="_blank" rel="noreferrer"
                                                                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(16,185,129,0.08)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.2)", textDecoration: "none" }}
                                                                        onClick={ev => ev.stopPropagation()}
                                                                    >
                                                                        <Download size={10} /> PDF
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {/* Row 2 */}
                                                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", display: "flex", gap: 14, alignItems: "center" }}>
                                                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={11} /> {fmtDate(e.date)}</span>
                                                                {isInvoice && (
                                                                    <>
                                                                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--border)" }} />
                                                                        <span style={{ color: "var(--green)", fontWeight: 700 }}>Paid ₹{fmt(e.amountPaid ?? e.amount)} of ₹{fmt(e.amount)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Right: amount + running balance */}
                                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                            <div style={{ fontSize: 18, fontWeight: 900, color: fullyPaid ? "var(--green)" : cfg.color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
                                                                {cfg.sign} ₹{fmt(e.amount)}
                                                            </div>
                                                            <div style={{ fontSize: 12, marginTop: 4, fontWeight: 800, color: e.balanceAfter > 0 ? "var(--red)" : "var(--green)", fontVariantNumeric: "tabular-nums", background: "var(--bg-card)", padding: "4px 8px", borderRadius: 6, display: "inline-block", border: "1px solid var(--border)" }}>
                                                                Bal: ₹{fmt(Math.abs(e.balanceAfter))}
                                                             </div>
                                                        </div>

                                                        <ChevronRight size={18} color="var(--border)" style={{ marginLeft: 8 }} />
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

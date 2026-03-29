"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_INVOICES, LIST_RETURNS } from "@/lib/graphql/queries";
import { DELETE_INVOICE } from "@/lib/graphql/mutations";
import {
    FileText, Search, Printer, Eye, Loader2,
    IndianRupee, Receipt, Calendar,
    ChevronLeft, ChevronRight, Clock, CheckCircle2,
    RotateCcw, ArrowDownCircle, Mail, X, Sparkles, TrendingUp, Trash2,
} from "lucide-react";

// Returns true if the invoice was created within the last 2 hours
const isNew = (createdAt: string) => {
    if (!createdAt) return false;
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 2 * 60 * 60 * 1000; // 2 hours
};

const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtShort = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const PM_COLOR: Record<string, { bg: string; color: string }> = {
    CASH: { bg: "var(--bg-input)", color: "var(--green)" },
    UPI: { bg: "var(--bg-input)", color: "var(--indigo-l)" },
    CARD: { bg: "var(--bg-input)", color: "var(--yellow)" },
    CREDIT: { bg: "var(--bg-input)", color: "var(--red)" },
};

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function monthStartStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function InvoicesPage() {
    const [activeTab, setActiveTab] = useState<"invoices" | "returns">("invoices");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState(monthStartStr());
    const [page, setPage] = useState(0);
    const [retPage, setRetPage] = useState(0);
    const PAGE_SIZE = 10;

    // Email Modal State
    const [emailInvoice, setEmailInvoice] = useState<any>(null);
    const [emailInput, setEmailInput] = useState("");
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: "success" | "error" } | null>(null);

    const showNotification = (msg: string, type: "success" | "error") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
    const [deleteInvoiceMut] = useMutation(DELETE_INVOICE, {
        onCompleted: () => {
            showNotification("Invoice deleted successfully", "success");
            refetch();
        },
        onError: (e) => {
            showNotification("Failed to delete invoice: " + e.message, "error");
        }
    });

    const confirmDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteInvoiceMut({ variables: { saleId: invoiceToDelete.saleId } });
        } finally {
            setIsDeleting(false);
            setInvoiceToDelete(null);
        }
    };

    const { data, loading, error, refetch } = useQuery<any, any>(LIST_INVOICES, {
        variables: { dateFrom, limit: 200 },
        fetchPolicy: "cache-and-network",
    } as any);

    const { data: retData, loading: retLoading } = useQuery<any, any>(LIST_RETURNS, {
        variables: { limit: 200 },
        fetchPolicy: "cache-and-network",
    } as any);

    // Sort invoices newest-first
    const allInvoices: any[] = [...(data?.listInvoices?.items || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const allReturns: any[] = [...(retData?.listReturns?.items || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Count how many invoices are "new" (created in last 2 hours)
    const newInvoiceCount = allInvoices.filter(inv => isNew(inv.createdAt)).length;

    // Filter logic
    const filteredInvoices = allInvoices.filter((inv: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            inv.invoiceNumber?.toLowerCase().includes(q) ||
            inv.customerName?.toLowerCase().includes(q) ||
            inv.customerPhone?.includes(q) ||
            inv.paymentMethod?.toLowerCase().includes(q)
        );
    });

    const filteredReturns = allReturns.filter((r: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            r.creditNoteNumber?.toLowerCase().includes(q) ||
            r.customerName?.toLowerCase().includes(q) ||
            r.customerPhone?.includes(q) ||
            r.reason?.toLowerCase().includes(q) ||
            r.originalInvoiceNumber?.toLowerCase().includes(q)
        );
    });

    const invPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
    const invSlice = filteredInvoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const retPages = Math.ceil(filteredReturns.length / PAGE_SIZE);
    const retSlice = filteredReturns.slice(retPage * PAGE_SIZE, (retPage + 1) * PAGE_SIZE);

    // Summary stats
    const totalRevenue = allInvoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
    const totalRefunded = allReturns.reduce((s: number, r: any) => s + (r.totalAmount || 0), 0);
    const netRevenue = totalRevenue - totalRefunded;

    const openEmailModal = (inv: any) => {
        setEmailInvoice(inv);
        // Default to the customer's phone as an email placeholder if available, or just empty
        setEmailInput("");
    };

    const confirmSendEmail = async () => {
        if (!emailInput || !emailInput.includes("@")) {
            showNotification("Please enter a valid email address.", "error");
            return;
        }

        setIsSendingEmail(true);
        try {
            const res = await fetch("/api/send-invoice-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toEmail: emailInput.trim(),
                    invoiceNumber: emailInvoice.invoiceNumber,
                    customerName: emailInvoice.customerName,
                    totalAmount: emailInvoice.totalAmount,
                    amountPaid: emailInvoice.amountPaid ?? emailInvoice.totalAmount,
                    balanceDue: emailInvoice.balanceDue ?? 0,
                    paymentMethod: emailInvoice.paymentMethod,
                    pdfUrl: emailInvoice.pdfUrl
                })
            });
            const data = await res.json();
            if (data.success) {
                showNotification(`Invoice sent successfully to ${emailInput}`, "success");
                setEmailInvoice(null);
            } else {
                showNotification("Failed to send email: " + data.error, "error");
            }
        } catch (e: any) {
            showNotification("Error sending email: " + e.message, "error");
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <AuthGuard>
            {/* ── Page header ─────────────────────────── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {activeTab === "invoices" ? "Sales Invoices" : "Credit Notes (Returns)"}
                        {activeTab === "invoices" && newInvoiceCount > 0 && (
                            <span style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
                                color: "#fff",
                                background: "linear-gradient(135deg, #10b981, #34d399)",
                                padding: "3px 10px", borderRadius: 20,
                                boxShadow: "0 0 14px rgba(16,185,129,0.5)",
                                animation: "newBadgePulse 2s ease-in-out infinite",
                            }}>
                                <Sparkles size={10} />
                                {newInvoiceCount} NEW
                            </span>
                        )}
                    </h1>
                    <p className="page-subtitle">Track your {activeTab === "invoices" ? "billing history" : "returns and refunds"} · newest first</p>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {/* Tab Switcher */}
                    <div style={{ display: "flex", background: "var(--bg-input)", padding: 4, borderRadius: 12, border: "1px solid var(--border)" }}>
                        {[
                            { id: "invoices", label: "Invoices", icon: Receipt, color: "var(--indigo-l)" },
                            { id: "returns", label: "Returns", icon: RotateCcw, color: "var(--red)" }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setActiveTab(t.id as any); setPage(0); setRetPage(0); }}
                                style={{
                                    display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                                    background: activeTab === t.id ? "var(--bg-card)" : "transparent",
                                    color: activeTab === t.id ? t.color : "var(--muted)",
                                    boxShadow: activeTab === t.id ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                                    border: "none", cursor: "pointer", transition: "all 0.2s"
                                }}
                            >
                                <t.icon size={13} /> {t.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === "invoices" && (
                        <a href="/billing" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Receipt size={14} /> New Invoice
                        </a>
                    )}
                </div>
            </div>

            {/* ── Summary cards ───────────────────────── */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                {[
                    { label: activeTab === "invoices" ? "Total Invoices" : "Total Returns", val: String(activeTab === "invoices" ? allInvoices.length : allReturns.length), icon: FileText, color: activeTab === "invoices" ? "#818cf8" : "var(--red)" },
                    { label: "Revenue (Net)", val: `₹${fmtShort(netRevenue)}`, icon: IndianRupee, color: "#34d399" },
                    { label: "Total Refunded", val: `₹${fmtShort(totalRefunded)}`, icon: ArrowDownCircle, color: "#f87171" },
                ].map(card => (
                    <div key={card.label} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                            background: `${card.color}18`, display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <card.icon size={18} color={card.color} />
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{card.val}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{card.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Search & Filter Row ─────────────────── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", flexDirection: typeof window !== "undefined" && window.innerWidth < 640 ? "column" : "row" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                    <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                    <input
                        className="input"
                        style={{ paddingLeft: 34 }}
                        placeholder={`Search ${activeTab === 'invoices' ? 'sales invoices' : 'credit notes'}…`}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); setRetPage(0); }}
                    />
                </div>
                {activeTab === "invoices" && (
                    <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Calendar size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>From</span>
                            <input
                                type="date" className="input" style={{ width: 148 }}
                                value={dateFrom}
                                max={todayStr()}
                                onChange={e => { setDateFrom(e.target.value); setPage(0); refetch({ dateFrom: e.target.value }); }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── CONTENT AREA ────────────────────────── */}
            {activeTab === "invoices" ? (
                /* ── SALES INVOICES ── */
                <div style={{ marginBottom: 32 }}>
                    {loading && allInvoices.length === 0 ? (
                        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}><Loader2 size={18} className="spin" /> Loading invoices…</div>
                    ) : filteredInvoices.length === 0 ? (
                        <div style={{
                            textAlign: "center", padding: "80px 40px",
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: 24, marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center"
                        }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: 28, background: "linear-gradient(135deg, var(--indigo), var(--indigo-l))",
                                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 20px 40px rgba(99,102,241,0.2)"
                            }}>
                                <Receipt size={32} color="#fff" />
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>No sales invoices found</h3>
                            <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 320, margin: "0 auto 28px" }}>Items will appear here once you create your first invoice.</p>
                            <a href="/billing" className="btn btn-primary" style={{ padding: "12px 24px", borderRadius: 12, fontWeight: 700 }}>
                                Create New Invoice
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Customer</th>
                                            <th>Date</th>
                                            <th>Items</th>
                                            <th>Payment</th>
                                            <th>Amount</th>
                                            <th>PDF</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invSlice.map((inv: any, idx: number) => {
                                            const pm = PM_COLOR[inv.paymentMethod] || { bg: "var(--bg-input)", color: "var(--muted)" };
                                            const d = new Date(inv.createdAt);
                                            const fresh = isNew(inv.createdAt);
                                            // "latest" = first row on page 0 (already sorted newest-first)
                                            const isLatest = page === 0 && idx === 0;
                                            return (
                                                <tr
                                                    key={inv.saleId}
                                                    onClick={() => window.location.href = `/billing/${inv.saleId}`}
                                                    style={{
                                                        cursor: "pointer",
                                                        background: isLatest
                                                            ? "linear-gradient(90deg, rgba(99,102,241,0.07), transparent)"
                                                            : fresh
                                                            ? "rgba(16,185,129,0.03)"
                                                            : undefined,
                                                        boxShadow: isLatest ? "inset 3px 0 0 #6366f1" : undefined,
                                                        animation: fresh ? `rowSlideIn 0.4s ease ${idx * 0.04}s both` : undefined,
                                                    }}
                                                >
                                                    <td>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--indigo-l)" }}>{inv.invoiceNumber}</span>
                                                            {fresh && (
                                                                <span style={{
                                                                    fontSize: 9, fontWeight: 900, letterSpacing: "0.06em",
                                                                    color: isLatest ? "#6366f1" : "#10b981",
                                                                    background: isLatest ? "rgba(99,102,241,0.12)" : "rgba(16,185,129,0.12)",
                                                                    border: `1px solid ${isLatest ? "rgba(99,102,241,0.3)" : "rgba(16,185,129,0.3)"}`,
                                                                    padding: "1px 6px", borderRadius: 20,
                                                                    display: "flex", alignItems: "center", gap: 3,
                                                                    animation: "newBadgePulse 2s ease-in-out infinite",
                                                                    whiteSpace: "nowrap",
                                                                }}>
                                                                    <Sparkles size={7} />{isLatest ? "LATEST" : "NEW"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td><div style={{ fontWeight: 600, fontSize: 13 }}>{inv.customerName}</div>{inv.customerPhone && <div style={{ fontSize: 11, color: "var(--muted)" }}>{inv.customerPhone}</div>}</td>
                                                    <td><div style={{ fontSize: 13 }}>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div></td>
                                                    <td className="num">{inv.items?.length ?? "—"}</td>
                                                    <td><span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: pm.bg, color: pm.color }}>{inv.paymentMethod}</span></td>
                                                    <td className="num" style={{ fontWeight: 700 }}>₹{fmt(inv.totalAmount)}</td>
                                                    <td>{inv.pdfUrl ? <span style={{ color: "var(--green)", display: "flex", gap: 4, fontSize: 11 }}><CheckCircle2 size={12} /> Ready</span> : <span style={{ color: "var(--yellow)", display: "flex", gap: 4, fontSize: 11 }}><Clock size={12} /> Pending</span>}</td>
                                                    <td onClick={e => e.stopPropagation()}><div style={{ display: "flex", gap: 6 }}>
                                                        <button onClick={() => setInvoiceToDelete(inv)} className="btn btn-ghost" style={{ padding: 5, color: "var(--red)" }} title="Delete Invoice">
                                                            <Trash2 size={13} />
                                                        </button>
                                                        <button onClick={() => openEmailModal(inv)} className="btn btn-ghost" style={{ padding: 5, color: 'var(--indigo-l)' }} title="Send via Email">
                                                            <Mail size={13} />
                                                        </button>
                                                        <a href={`/billing/${inv.saleId}`} className="btn btn-ghost" style={{ padding: 5 }}><Eye size={13} /></a>
                                                    </div></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {invPages > 1 && (
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 6 }}>
                                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>Prev</button>
                                    <span style={{ fontSize: 11, padding: "4px 10px", color: "var(--muted)" }}>Page {page + 1} of {invPages}</span>
                                    <button disabled={page >= invPages - 1} onClick={() => setPage(p => p + 1)} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>Next</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* ── RETURN INVOICES ── */
                <div style={{ marginBottom: 40 }}>
                    {retLoading && allReturns.length === 0 ? (
                        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}><Loader2 size={18} className="spin" /> Loading returns…</div>
                    ) : filteredReturns.length === 0 ? (
                        <div style={{
                            textAlign: "center", padding: "80px 40px",
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: 24, marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center"
                        }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: 28, background: "linear-gradient(135deg, var(--red), #f87171)",
                                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 20px 40px rgba(239,68,68,0.2)"
                            }}>
                                <RotateCcw size={32} color="#fff" />
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>No returns found</h3>
                            <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 320, margin: "0 auto 24px" }}>Manage your returned products and credit notes from the invoice details.</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-wrapper">
                                <table className="data-table" style={{ borderColor: "rgba(239,68,68,0.1)" }}>
                                    <thead>
                                        <tr>
                                            <th>Credit Note #</th>
                                            <th>Customer</th>
                                            <th>Original Invoice</th>
                                            <th>Date</th>
                                            <th>Reason</th>
                                            <th>Refund Amount</th>
                                            <th>PDF</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {retSlice.map((r: any) => {
                                            const d = new Date(r.createdAt);
                                            return (
                                                <tr key={r.returnId} onClick={() => window.location.href = `/returns/${r.returnId}`} style={{ cursor: "pointer" }}>
                                                    <td><span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--red)" }}>{r.creditNoteNumber}</span></td>
                                                    <td><div style={{ fontWeight: 600, fontSize: 13 }}>{r.customerName}</div>{r.customerPhone && <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.customerPhone}</div>}</td>
                                                    <td><div style={{ fontSize: 12, fontWeight: 700 }}>{r.originalInvoiceNumber}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>ID: {r.originalInvoiceId}</div></td>
                                                    <td><div style={{ fontSize: 13 }}>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div></td>
                                                    <td><span style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", background: "rgba(239,68,68,0.08)", padding: "2px 8px", borderRadius: 10 }}>{r.reason}</span></td>
                                                    <td className="num" style={{ fontWeight: 900, color: "var(--red)" }}>- ₹{fmt(r.totalAmount)}</td>
                                                    <td>{r.pdfStatus === "READY" ? <span style={{ color: "var(--green)", display: "flex", gap: 4, fontSize: 11 }}><CheckCircle2 size={12} /> Ready</span> : <span style={{ color: "var(--yellow)", display: "flex", gap: 4, fontSize: 11 }}><Clock size={12} /> Pending</span>}</td>
                                                    <td onClick={e => e.stopPropagation()}><div style={{ display: "flex", gap: 6 }}><a href={`/returns/${r.returnId}`} className="btn btn-ghost" style={{ padding: 5, color: "var(--red)" }}><Eye size={13} /></a></div></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {retPages > 1 && (
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 6 }}>
                                    <button disabled={retPage === 0} onClick={() => setRetPage(p => p - 1)} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>Prev</button>
                                    <span style={{ fontSize: 11, padding: "4px 10px", color: "var(--muted)" }}>Page {retPage + 1} of {retPages}</span>
                                    <button disabled={retPage >= retPages - 1} onClick={() => setRetPage(p => p + 1)} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>Next</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── DELETE MODAL ─────────────────────────── */}
            {invoiceToDelete && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
                    padding: 20
                }}>
                    <div className="glass" style={{
                        width: "100%", maxWidth: 400, background: "var(--bg-card)",
                        padding: 30, borderRadius: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                        position: "relative", animation: "slideUp 0.3s ease",
                        textAlign: "center"
                    }}>
                        <div style={{
                            width: 60, height: 60, borderRadius: 20, background: "rgba(239, 68, 68, 0.1)",
                            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)",
                            margin: "0 auto 20px"
                        }}>
                            <Trash2 size={28} />
                        </div>
                        <h3 style={{ margin: "0 0 10px 0", fontSize: 20, color: "var(--text)", fontWeight: 800 }}>Delete Invoice?</h3>
                        <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
                            Are you sure you want to delete invoice <strong style={{ color: "var(--text)" }}>{invoiceToDelete.invoiceNumber}</strong>?<br/>This action cannot be undone.
                        </p>

                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button onClick={() => setInvoiceToDelete(null)} className="btn btn-ghost" style={{ flex: 1, padding: "12px 16px", borderRadius: 12, fontWeight: 700 }} disabled={isDeleting}>Cancel</button>
                            <button onClick={confirmDeleteInvoice} disabled={isDeleting} className="btn" style={{
                                flex: 1, padding: "12px 16px", borderRadius: 12, background: "var(--red)", border: "none", color: "white", fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isDeleting ? 0.7 : 1, cursor: "pointer"
                            }}>
                                {isDeleting ? <Loader2 size={16} className="spin" /> : "Yes, delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EMAIL MODAL ─────────────────────────── */}
            {emailInvoice && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
                    padding: 20
                }}>
                    <div className="glass" style={{
                        width: "100%", maxWidth: 400, background: "var(--bg-card)",
                        padding: 30, borderRadius: 20, boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                        position: "relative", animation: "slideUp 0.3s ease"
                    }}>
                        <button onClick={() => setEmailInvoice(null)} style={{
                            position: "absolute", top: 15, right: 15, background: "transparent", border: "none",
                            color: "var(--muted)", cursor: "pointer", padding: 5
                        }}>
                            <X size={18} />
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(99, 102, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--indigo-l)" }}>
                                <Mail size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18, color: "var(--text)", fontWeight: 700 }}>Send Invoice via Email</h3>
                                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Invoice #{emailInvoice.invoiceNumber} for {emailInvoice.customerName}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Customer Email Address</label>
                            <input
                                type="email"
                                className="input"
                                style={{ width: "100%", fontSize: 14 }}
                                placeholder="customer@example.com"
                                value={emailInput}
                                onChange={e => setEmailInput(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={() => setEmailInvoice(null)} className="btn btn-ghost" style={{ padding: "10px 16px" }} disabled={isSendingEmail}>Cancel</button>
                            <button onClick={confirmSendEmail} disabled={isSendingEmail || !emailInput} className="btn" style={{
                                padding: "10px 16px", background: "var(--indigo-l)", color: "white", display: "flex", alignItems: "center", gap: 8,
                                opacity: isSendingEmail ? 0.7 : 1
                            }}>
                                {isSendingEmail ? <Loader2 size={16} className="spin" /> : <Mail size={16} />}
                                {isSendingEmail ? "Sending..." : "Send Email"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── NOTIFICATION TOAST ─────────────────────────── */}
            {notification && (
                <div style={{
                    position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)",
                    background: notification.type === "success" ? "#10b981" : "#ef4444",
                    color: "white", padding: "12px 24px", borderRadius: 30,
                    fontSize: 14, fontWeight: 600, boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                    display: "flex", alignItems: "center", gap: 10, zIndex: 999,
                    animation: "slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                }}>
                    {notification.type === "success" ? <CheckCircle2 size={16} /> : <X size={16} />}
                    {notification.msg}
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUpFade { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
                @keyframes newBadgePulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
                    50% { opacity: 0.85; box-shadow: 0 0 0 4px rgba(16,185,129,0); }
                }
                @keyframes rowSlideIn {
                    from { opacity: 0; transform: translateX(-8px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </AuthGuard>
    );
}

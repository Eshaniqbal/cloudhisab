"use client";
import { useState } from "react";
import { useQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_INVOICES } from "@/lib/graphql/queries";
import {
    FileText, Search, Printer, Eye, Loader2,
    IndianRupee, Receipt, Calendar,
    ChevronLeft, ChevronRight, Clock, CheckCircle2,
} from "lucide-react";

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
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState(monthStartStr());
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    const { data, loading, error, refetch } = useQuery<any, any>(LIST_INVOICES, {
        variables: { dateFrom, limit: 200 },
        fetchPolicy: "cache-and-network",
    } as any);

    const allInvoices: any[] = data?.listInvoices?.items || [];
    const total = data?.listInvoices?.total || 0;

    // Filter by search
    const filtered = allInvoices.filter((inv: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            inv.invoiceNumber?.toLowerCase().includes(q) ||
            inv.customerName?.toLowerCase().includes(q) ||
            inv.customerPhone?.includes(q) ||
            inv.paymentMethod?.toLowerCase().includes(q)
        );
    });

    // Pagination
    const pages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageSlice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Summary stats
    const totalRevenue = allInvoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
    const totalGst = allInvoices.reduce((s: number, i: any) => s + (i.totalGst || 0), 0);

    return (
        <AuthGuard>
            {/* ── Page header ─────────────────────────── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Invoices</h1>
                    <p className="page-subtitle">Browse, search and print all your invoices</p>
                </div>
                <a href="/billing" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Receipt size={14} /> New Invoice
                </a>
            </div>

            {/* ── Summary cards ───────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
                {[
                    { label: "Total Invoices", val: String(total), icon: FileText, color: "#818cf8" },
                    { label: "Revenue", val: `₹${fmtShort(totalRevenue)}`, icon: IndianRupee, color: "#34d399" },
                    { label: "GST Collected", val: `₹${fmtShort(totalGst)}`, icon: Receipt, color: "#818cf8" },
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

            {/* ── Filters row ─────────────────────────── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {/* Search */}
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                    <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                    <input
                        className="input"
                        style={{ paddingLeft: 34 }}
                        placeholder="Search invoice #, customer name or phone…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                    />
                </div>

                {/* Date from */}
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

                {/* Quick filters */}
                {[
                    { label: "Today", val: todayStr() },
                    { label: "This Month", val: monthStartStr() },
                ].map(f => (
                    <button key={f.label}
                        onClick={() => { setDateFrom(f.val); setPage(0); refetch({ dateFrom: f.val }); }}
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: "6px 12px", background: dateFrom === f.val ? "var(--bg-input)" : undefined, color: dateFrom === f.val ? "var(--indigo-l)" : undefined }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── Table ───────────────────────────────── */}
            {loading && allInvoices.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "var(--muted)" }}>
                    <Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} />
                    <span>Loading invoices…</span>
                </div>
            ) : error ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--red)" }}>Failed to load invoices. {error.message}</div>
            ) : filtered.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12, color: "var(--muted)" }}>
                    <FileText size={44} strokeWidth={1} />
                    <p style={{ fontSize: 14 }}>{search ? `No invoices match "${search}"` : "No invoices found for this period"}</p>
                    {!search && <a href="/billing" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}><Receipt size={13} /> Create First Invoice</a>}
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
                                {pageSlice.map((inv: any) => {
                                    const pm = PM_COLOR[inv.paymentMethod] || { bg: "var(--bg-input)", color: "var(--muted)" };
                                    const d = new Date(inv.createdAt);
                                    const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
                                    const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                                    return (
                                        <tr key={inv.saleId}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => window.location.href = `/billing/${inv.saleId}`}>
                                            <td>
                                                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--indigo-l)" }}>
                                                    {inv.invoiceNumber}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.customerName}</div>
                                                {inv.customerPhone && <div style={{ fontSize: 11, color: "var(--muted)" }}>{inv.customerPhone}</div>}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13 }}>{dateStr}</div>
                                                <div style={{ fontSize: 11, color: "var(--muted)" }}>{timeStr}</div>
                                            </td>
                                            <td className="num" style={{ color: "var(--muted)", fontSize: 13 }}>
                                                {inv.items?.length ?? "—"}
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: "inline-block", padding: "3px 10px", borderRadius: 20,
                                                    fontSize: 10, fontWeight: 700,
                                                    background: pm.bg, color: pm.color,
                                                }}>
                                                    {inv.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="num" style={{ fontWeight: 700, fontSize: 14 }}>
                                                ₹{fmt(inv.totalAmount)}
                                            </td>
                                            <td>
                                                {inv.pdfUrl ? (
                                                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--green)" }}>
                                                        <CheckCircle2 size={12} /> Ready
                                                    </span>
                                                ) : (
                                                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--yellow)" }}>
                                                        <Clock size={12} /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <a href={`/billing/${inv.saleId}`}
                                                        title="View invoice"
                                                        style={{ display: "flex", alignItems: "center", padding: 5, borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "var(--muted)", textDecoration: "none" }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = "#818cf8")}
                                                        onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
                                                        <Eye size={13} />
                                                    </a>
                                                    <a href={`/billing/${inv.saleId}`}
                                                        title="Print invoice"
                                                        onClick={e => { e.preventDefault(); window.open(`/billing/${inv.saleId}`, "_blank"); }}
                                                        style={{ display: "flex", alignItems: "center", padding: 5, borderRadius: 6, background: "var(--bg-input)", color: "var(--muted)", textDecoration: "none" }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = "var(--green)")}
                                                        onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
                                                        <Printer size={13} />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ───────────────────────── */}
                    {pages > 1 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
                            <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                    className="btn btn-ghost"
                                    style={{ padding: "5px 10px", display: "flex", alignItems: "center", gap: 4, opacity: page === 0 ? 0.3 : 1 }}>
                                    <ChevronLeft size={13} /> Prev
                                </button>
                                <span style={{ padding: "5px 12px", background: "rgba(79,70,229,0.15)", borderRadius: 8, color: "#818cf8", fontWeight: 600 }}>
                                    {page + 1} / {pages}
                                </span>
                                <button
                                    disabled={page >= pages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                    className="btn btn-ghost"
                                    style={{ padding: "5px 10px", display: "flex", alignItems: "center", gap: 4, opacity: page >= pages - 1 ? 0.3 : 1 }}>
                                    Next <ChevronRight size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )
            }

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </AuthGuard >
    );
}

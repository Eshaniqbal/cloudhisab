"use client";
import { useState } from "react";
import { useQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_GSTR1_REPORT } from "@/lib/graphql/queries";
import {
    FileText, Loader2, AlertCircle, TrendingUp, Receipt,
    IndianRupee, BarChart3, Hash, Building2, User, Download
} from "lucide-react";

function fmt(n: number) {
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SummaryCard({ icon: Icon, label, value, accent, sub }: any) {
    return (
        <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden",
        }}>
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: accent === "indigo" ? "linear-gradient(90deg,#4f46e5,#6366f1)"
                    : accent === "red" ? "linear-gradient(90deg,#ef4444,#f87171)"
                        : "linear-gradient(90deg,#10b981,#34d399)",
                borderRadius: "16px 16px 0 0"
            }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 10, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: accent === "indigo" ? "rgba(79,70,229,0.12)"
                        : accent === "red" ? "rgba(239,68,68,0.1)"
                            : "rgba(16,185,129,0.1)"
                }}>
                    <Icon size={18} color={accent === "indigo" ? "#6366f1" : accent === "red" ? "#ef4444" : "#10b981"} />
                </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>{label}</div>
            <div style={{
                fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px",
                color: accent === "indigo" ? "#818cf8" : accent === "red" ? "#f87171" : "#34d399"
            }}>
                ₹{value}
            </div>
            {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>{sub}</div>}
        </div>
    );
}

function Section({ title, icon: Icon, children }: any) {
    return (
        <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, overflow: "hidden"
        }}>
            <div style={{
                padding: "16px 20px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--bg-card2)"
            }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8, background: "rgba(79,70,229,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <Icon size={16} color="#6366f1" />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{title}</span>
            </div>
            <div style={{ padding: "0" }}>{children}</div>
        </div>
    );
}

function GSTBadge({ rate }: { rate: number }) {
    const color = rate === 0 ? "#10b981" : rate <= 5 ? "#06b6d4" : rate <= 12 ? "#f59e0b" : rate <= 18 ? "#6366f1" : "#ef4444";
    return (
        <span style={{
            display: "inline-block", padding: "2px 9px", borderRadius: 99,
            background: color + "20", color, fontWeight: 700, fontSize: 12, border: `1px solid ${color}40`
        }}>
            {rate}%
        </span>
    );
}

function DataTable({ headers, rows, emptyMsg }: any) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "var(--bg-card2)" }}>
                        {headers.map((h: any, i: number) => (
                            <th key={i} style={{
                                padding: "10px 18px", fontSize: 11, fontWeight: 700,
                                color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em",
                                textAlign: h.right ? "right" : "left",
                                borderBottom: "1px solid var(--border)"
                            }}>{h.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={headers.length} style={{
                                padding: "36px 20px", textAlign: "center",
                                color: "var(--muted)", fontSize: 13
                            }}>
                                {emptyMsg}
                            </td>
                        </tr>
                    ) : rows.map((row: any[], i: number) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                            onMouseEnter={e => (e.currentTarget as any).style.background = "var(--bg-input)"}
                            onMouseLeave={e => (e.currentTarget as any).style.background = "transparent"}>
                            {row.map((cell: any, j: number) => (
                                <td key={j} style={{
                                    padding: "12px 18px", fontSize: 13,
                                    textAlign: headers[j]?.right ? "right" : "left"
                                }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function Gstr1ReportPage() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const toIst = (d: Date) => {
        const offset = 5.5 * 60 * 60 * 1000;
        return new Date(d.getTime() + offset).toISOString().slice(0, 10);
    };

    const [dateFrom, setDateFrom] = useState(toIst(firstDay));
    const [dateTo, setDateTo] = useState(toIst(today));

    const { data, loading, error } = useQuery(GET_GSTR1_REPORT as any, {
        variables: { dateFrom, dateTo },
        fetchPolicy: "cache-and-network",
    });

    const r = data?.getGstr1Report;

    function exportCSV() {
        if (!r) return;
        const rows: string[][] = [];

        rows.push([`GSTR-1 Summary Report — ${dateFrom} to ${dateTo}`]);
        rows.push([]);

        rows.push(["=== GRAND TOTALS ==="]);
        rows.push(["Metric", "Amount (INR)"]);
        rows.push(["Total Taxable Value", `"${fmt(r.totalTaxableValue)}"`]);
        rows.push(["Total GST Collected", `"${fmt(r.totalGstAmount)}"`]);
        rows.push(["Total Invoice Value (incl. GST)", `"${fmt(r.totalInvoiceValue)}"`]);
        rows.push([]);

        rows.push(["=== B2B vs B2C SPLIT ==="]);
        rows.push(["Type", "Taxable Value", "GST Collected", "Total Invoice Value"]);
        rows.push(["B2B (Registered)", fmt(r.b2bB2c.b2bTaxableValue), fmt(r.b2bB2c.b2bGstAmount), fmt(r.b2bB2c.b2bTotalValue)]);
        rows.push(["B2C (Unregistered)", fmt(r.b2bB2c.b2cTaxableValue), fmt(r.b2bB2c.b2cGstAmount), fmt(r.b2bB2c.b2cTotalValue)]);
        rows.push([]);

        rows.push(["=== TAX RATE-WISE SUMMARY ==="]);
        rows.push(["GST Rate (%)", "Taxable Value", "GST Collected", "Total Value"]);
        for (const s of r.taxSlabSummary) {
            rows.push([`${s.gstRate}%`, fmt(s.totalTaxableValue), fmt(s.totalGstAmount), fmt(s.totalValue)]);
        }
        rows.push([]);

        rows.push(["=== HSN-WISE SUMMARY ==="]);
        rows.push(["HSN Code", "Total Quantity", "Taxable Value", "GST Amount", "Total Value"]);
        for (const h of r.hsnSummary) {
            rows.push([h.hsnCode, String(h.totalQuantity), fmt(h.totalTaxableValue), fmt(h.totalGstAmount), fmt(h.totalValue)]);
        }

        const csv = rows.map(r => r.map(c => c.includes(",") || c.includes("\"") ? `"${c.replace(/"/g, '""')}"` : c).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `GSTR1_${dateFrom}_to_${dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <AuthGuard requiredRole="ACCOUNTANT">
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* ── Header ── */}
                <div style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 16, padding: "22px 26px",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{
                            width: 46, height: 46, borderRadius: 12,
                            background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 6px 20px rgba(79,70,229,0.4)"
                        }}>
                            <FileText size={22} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.3px" }}>
                                GSTR-1 Summary
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                                Sales register for GST filing — B2B, B2C, HSN, Tax Slabs
                            </div>
                        </div>
                    </div>

                    {/* Date range pickers + Export */}
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
                                From Date
                            </div>
                            <input type="date" className="input" style={{ paddingTop: 7, paddingBottom: 7 }}
                                value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div style={{ paddingBottom: 8, color: "var(--muted)" }}>→</div>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
                                To Date
                            </div>
                            <input type="date" className="input" style={{ paddingTop: 7, paddingBottom: 7 }}
                                value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>

                        {/* Export CSV button */}
                        <button
                            onClick={exportCSV}
                            disabled={!r || loading}
                            style={{
                                display: "flex", alignItems: "center", gap: 7,
                                padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: r ? "pointer" : "not-allowed",
                                background: r ? "linear-gradient(135deg,#10b981,#059669)" : "var(--bg-input)",
                                color: r ? "#fff" : "var(--muted)",
                                border: "none",
                                boxShadow: r ? "0 4px 14px rgba(16,185,129,0.3)" : "none",
                                opacity: (!r || loading) ? 0.5 : 1,
                                transition: "all 0.18s", whiteSpace: "nowrap"
                            }}
                        >
                            <Download size={15} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div style={{
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 16, padding: "64px 20px", textAlign: "center"
                    }}>
                        <Loader2 size={36} className="animate-spin" style={{ margin: "0 auto 16px", color: "#6366f1" }} />
                        <div style={{ color: "var(--muted)", fontSize: 14 }}>Aggregating invoices & calculating taxes…</div>
                    </div>
                )}

                {/* ── Error ── */}
                {!loading && error && (
                    <div style={{
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: 14, padding: "18px 22px", display: "flex", gap: 12, alignItems: "flex-start"
                    }}>
                        <AlertCircle size={18} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
                        <div>
                            <div style={{ fontWeight: 700, color: "#f87171", fontSize: 14, marginBottom: 4 }}>Failed to load report</div>
                            <div style={{ color: "var(--muted)", fontSize: 13 }}>{error.message}</div>
                        </div>
                    </div>
                )}

                {/* ── Report ── */}
                {!loading && !error && r && (
                    <>
                        {/* Summary Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                            <SummaryCard icon={IndianRupee} label="Total Taxable Value" value={fmt(r.totalTaxableValue)} accent="green" sub="Before GST" />
                            <SummaryCard icon={Receipt} label="Total GST Collected" value={fmt(r.totalGstAmount)} accent="red" sub="Tax Liability" />
                            <SummaryCard icon={TrendingUp} label="Total Invoice Value" value={fmt(r.totalInvoiceValue)} accent="indigo" sub="Taxable + GST" />
                        </div>

                        {/* B2B vs B2C */}
                        <Section title="B2B vs B2C Split" icon={Building2}>
                            <DataTable
                                headers={[
                                    { label: "Sales Type" },
                                    { label: "Taxable Value", right: true },
                                    { label: "GST Collected", right: true },
                                    { label: "Total Invoice Value", right: true },
                                ]}
                                rows={[
                                    [
                                        <div key="b2b" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Building2 size={14} color="#6366f1" />
                                            <span style={{ fontWeight: 700, color: "var(--text)" }}>B2B</span>
                                            <span style={{ fontSize: 11, color: "var(--muted)", padding: "1px 6px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)" }}>Registered</span>
                                        </div>,
                                        <span key="bt" style={{ color: "var(--text)", fontWeight: 600 }}>₹{fmt(r.b2bB2c.b2bTaxableValue)}</span>,
                                        <span key="bg" style={{ color: "#f87171", fontWeight: 600 }}>₹{fmt(r.b2bB2c.b2bGstAmount)}</span>,
                                        <span key="bv" style={{ color: "#818cf8", fontWeight: 700 }}>₹{fmt(r.b2bB2c.b2bTotalValue)}</span>,
                                    ],
                                    [
                                        <div key="b2c" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <User size={14} color="#10b981" />
                                            <span style={{ fontWeight: 700, color: "var(--text)" }}>B2C</span>
                                            <span style={{ fontSize: 11, color: "var(--muted)", padding: "1px 6px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)" }}>Unregistered</span>
                                        </div>,
                                        <span key="ct" style={{ color: "var(--text)", fontWeight: 600 }}>₹{fmt(r.b2bB2c.b2cTaxableValue)}</span>,
                                        <span key="cg" style={{ color: "#f87171", fontWeight: 600 }}>₹{fmt(r.b2bB2c.b2cGstAmount)}</span>,
                                        <span key="cv" style={{ color: "#818cf8", fontWeight: 700 }}>₹{fmt(r.b2bB2c.b2cTotalValue)}</span>,
                                    ],
                                ]}
                                emptyMsg="No data"
                            />
                        </Section>

                        {/* Tax Slab */}
                        <Section title="Tax Rate-wise Summary" icon={BarChart3}>
                            <DataTable
                                headers={[
                                    { label: "GST Rate" },
                                    { label: "Taxable Value", right: true },
                                    { label: "GST Collected", right: true },
                                    { label: "Total Value", right: true },
                                ]}
                                rows={r.taxSlabSummary.map((s: any) => [
                                    <GSTBadge key="rate" rate={s.gstRate} />,
                                    <span key="tv" style={{ color: "var(--text)", fontWeight: 600 }}>₹{fmt(s.totalTaxableValue)}</span>,
                                    <span key="gst" style={{ color: "#f87171", fontWeight: 600 }}>₹{fmt(s.totalGstAmount)}</span>,
                                    <span key="tot" style={{ color: "#818cf8", fontWeight: 700 }}>₹{fmt(s.totalValue)}</span>,
                                ])}
                                emptyMsg="No tax slab data for this period. Add products with GST rates and create invoices."
                            />
                        </Section>

                        {/* HSN Summary */}
                        <Section title="HSN-wise Summary" icon={Hash}>
                            <DataTable
                                headers={[
                                    { label: "HSN Code" },
                                    { label: "Quantity", right: true },
                                    { label: "Taxable Value", right: true },
                                    { label: "GST Amount", right: true },
                                    { label: "Total Value", right: true },
                                ]}
                                rows={r.hsnSummary.map((h: any) => [
                                    <span key="hcode" style={{
                                        display: "inline-block", fontFamily: "monospace",
                                        fontWeight: 700, padding: "2px 10px", borderRadius: 99,
                                        background: "rgba(99,102,241,0.1)", color: "#818cf8",
                                        border: "1px solid rgba(99,102,241,0.25)", fontSize: 12
                                    }}>{h.hsnCode}</span>,
                                    <span key="qty" style={{ color: "var(--text)", fontWeight: 600 }}>{h.totalQuantity}</span>,
                                    <span key="tv" style={{ color: "var(--text)", fontWeight: 600 }}>₹{fmt(h.totalTaxableValue)}</span>,
                                    <span key="gst" style={{ color: "#f87171", fontWeight: 600 }}>₹{fmt(h.totalGstAmount)}</span>,
                                    <span key="tot" style={{ color: "#818cf8", fontWeight: 700 }}>₹{fmt(h.totalValue)}</span>,
                                ])}
                                emptyMsg="No HSN data. Assign HSN codes to products and create invoices to see data here."
                            />
                        </Section>
                    </>
                )}

                {/* ── No data state ── */}
                {!loading && !error && !r && (
                    <div style={{
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 16, padding: "64px 20px", textAlign: "center"
                    }}>
                        <FileText size={40} style={{ margin: "0 auto 16px", color: "var(--muted)", opacity: 0.5 }} />
                        <div style={{ color: "var(--text)", fontWeight: 700, marginBottom: 6 }}>No Report Data</div>
                        <div style={{ color: "var(--muted)", fontSize: 13 }}>No invoices found for the selected period.</div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}

"use client";
import { useState, useEffect } from "react";
import { useLazyQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_PROFIT_REPORT } from "@/lib/graphql/queries";
import {
    TrendingUp, TrendingDown, BarChart3, Loader2,
    IndianRupee, Receipt, Calendar, Zap, ArrowRight, AlertTriangle,
} from "lucide-react";

function fmt(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(2)}K`;
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFull(n: number) {
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── Metric Card ──────────────────────────────────────────── */
function MetricCard({ label, value, sub, icon: Icon, gradient, bright }: any) {
    return (
        <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 18, padding: "22px 24px",
            transition: "transform 0.2s, box-shadow 0.2s",
        }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 16px 40px var(--shadow)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "none"; el.style.boxShadow = "none"; }}
        >
            <div style={{
                width: 42, height: 42, borderRadius: 12, marginBottom: 14,
                background: gradient, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Icon size={18} color="#fff" strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: bright || "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
                {value}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, fontWeight: 600 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, opacity: 0.7 }}>{sub}</div>}
        </div>
    );
}

/* ─── Formula Step ─────────────────────────────────────────── */
function FormulaStep({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{ textAlign: "center", padding: "0 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
                {label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
                {value}
            </div>
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function ReportsPage() {
    const now = new Date();
    // Build local YYYY-MM-DD without timezone shifting
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

    const [dateFrom, setDateFrom] = useState(firstDay);
    const [dateTo, setDateTo] = useState(todayStr);

    const [runReport, { data, loading, error }] = useLazyQuery(GET_PROFIT_REPORT, {
        fetchPolicy: "network-only",
    } as any);

    // Auto-run on mount with current month
    useEffect(() => {
        runReport({ variables: { dateFrom: firstDay, dateTo: todayStr } } as any);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const generate = () => {
        runReport({ variables: { dateFrom, dateTo } } as any);
    };

    const r = data?.getProfitReport;

    const marginColor = r
        ? r.profitMarginPercent >= 20 ? "#10b981"
            : r.profitMarginPercent >= 10 ? "#f59e0b" : "#ef4444"
        : "var(--muted)";

    return (
        <AuthGuard>
            <div>

                {/* ── Header ── */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 28, flexWrap: "wrap", gap: 16,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <BarChart3 size={17} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>Profit Report</h1>
                            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Revenue, expenses &amp; net profit analysis</p>
                        </div>
                    </div>

                    {/* Date range picker */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 14, padding: "10px 14px", flexWrap: "wrap",
                    }}>
                        <Calendar size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
                        <input type="date" className="input"
                            style={{ width: 140, border: "none", background: "transparent", padding: "0 4px", fontSize: 13 }}
                            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <ArrowRight size={13} color="var(--muted)" />
                        <input type="date" className="input"
                            style={{ width: 140, border: "none", background: "transparent", padding: "0 4px", fontSize: 13 }}
                            value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        <button className="btn btn-primary"
                            style={{ padding: "7px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                            onClick={generate}>
                            <Zap size={13} /> Generate
                        </button>
                    </div>
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
                        <Loader2 size={24} style={{ animation: "spin 0.7s linear infinite", color: "#4f46e5" }} />
                        <span style={{ color: "var(--muted)", fontSize: 14 }}>Generating report…</span>
                    </div>
                )}

                {/* ── Error ── */}
                {!loading && error && (
                    <div style={{
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                        borderRadius: 14, padding: "16px 20px", marginBottom: 8,
                        display: "flex", alignItems: "flex-start", gap: 12,
                    }}>
                        <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 3 }}>Failed to load report</div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{error.message}</div>
                        </div>
                    </div>
                )}

                {/* ── Empty state ── */}
                {!loading && !error && !r && (
                    <div style={{
                        textAlign: "center", padding: "80px 20px",
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 18,
                    }}>
                        <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(79,70,229,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <BarChart3 size={28} color="#818cf8" />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No data for this period</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>No transactions found in the selected date range</div>
                    </div>
                )}

                {/* ── Report ── */}
                {!loading && r && (<>

                    {/* 4 stat cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
                        <MetricCard label="Total Revenue" value={fmt(r.totalRevenue)} sub={fmtFull(r.totalRevenue)}
                            icon={IndianRupee} gradient="linear-gradient(135deg,#4f46e5,#6366f1)" bright="#818cf8" />
                        <MetricCard label="Gross Profit" value={fmt(r.grossProfit)} sub={`Margin: ${r.profitMarginPercent.toFixed(1)}%`}
                            icon={TrendingUp} gradient="linear-gradient(135deg,#10b981,#34d399)" bright="#10b981" />
                        <MetricCard label="Total Expenses" value={fmt(r.totalExpenses)} sub={fmtFull(r.totalExpenses)}
                            icon={TrendingDown} gradient="linear-gradient(135deg,#ef4444,#f87171)" bright="#f87171" />
                        <MetricCard label="Net Profit" value={fmt(r.netProfit)} sub={fmtFull(r.netProfit)}
                            icon={BarChart3}
                            gradient={r.netProfit >= 0 ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#ef4444,#f87171)"}
                            bright={r.netProfit >= 0 ? "#fbbf24" : "#f87171"} />
                    </div>

                    {/* 3 count cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
                        {/* Invoice count */}
                        <div style={{
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: 18, padding: "20px 24px",
                            display: "flex", alignItems: "center", gap: 16,
                        }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Receipt size={20} color="#818cf8" />
                            </div>
                            <div>
                                <div style={{ fontSize: 28, fontWeight: 900, color: "#818cf8", fontVariantNumeric: "tabular-nums" }}>{r.invoiceCount}</div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, fontWeight: 600 }}>Total Invoices</div>
                            </div>
                        </div>

                        {/* COGS */}
                        <div style={{
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: 18, padding: "20px 24px",
                            display: "flex", alignItems: "center", gap: 16,
                        }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(148,163,184,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <BarChart3 size={20} color="#94a3b8" />
                            </div>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmt(r.totalCost)}</div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, fontWeight: 600 }}>Cost of Goods Sold</div>
                            </div>
                        </div>

                        {/* Margin */}
                        <div style={{
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: 18, padding: "20px 24px",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Profit Margin</div>
                                <div style={{
                                    fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px",
                                    background: marginColor + "1a", color: marginColor,
                                }}>
                                    {r.profitMarginPercent >= 20 ? "Excellent" : r.profitMarginPercent >= 10 ? "Good" : "Low"}
                                </div>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: marginColor, fontVariantNumeric: "tabular-nums" }}>
                                {r.profitMarginPercent.toFixed(1)}%
                            </div>
                            {/* Progress bar */}
                            <div style={{ marginTop: 12, height: 6, background: "var(--bg-card2)", borderRadius: 99, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", borderRadius: 99,
                                    width: `${Math.min(r.profitMarginPercent, 100)}%`,
                                    background: `linear-gradient(90deg,${marginColor},${marginColor}88)`,
                                    transition: "width 0.8s ease",
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Net Profit Formula Banner */}
                    <div style={{
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 16, padding: "18px 24px", marginBottom: 24,
                        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0,
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginRight: 20 }}>
                            Formula
                        </div>
                        <FormulaStep label="Revenue" value={fmtFull(r.totalRevenue)} color="#818cf8" />
                        <div style={{ color: "var(--muted)", fontSize: 20, padding: "0 4px" }}>−</div>
                        <FormulaStep label="Cost of Goods" value={fmtFull(r.totalCost)} color="var(--muted)" />
                        <div style={{ color: "var(--muted)", fontSize: 20, padding: "0 4px" }}>=</div>
                        <FormulaStep label="Gross Profit" value={fmtFull(r.grossProfit)} color="#10b981" />
                        <div style={{ color: "var(--muted)", fontSize: 20, padding: "0 4px" }}>−</div>
                        <FormulaStep label="Expenses" value={fmtFull(r.totalExpenses)} color="#f87171" />
                        <div style={{ color: "var(--muted)", fontSize: 20, padding: "0 4px" }}>=</div>
                        <FormulaStep label="Net Profit" value={fmtFull(r.netProfit)} color={r.netProfit >= 0 ? "#fbbf24" : "#f87171"} />
                    </div>

                    {/* Daily Breakdown */}
                    {r.dailyBreakdown?.length > 0 && (<>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(79,70,229,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Calendar size={12} color="#818cf8" />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                                Daily Breakdown
                            </span>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th className="num">Revenue</th>
                                        <th className="num">Gross Profit</th>
                                        <th className="num">Expenses</th>
                                        <th className="num">Net Profit</th>
                                        <th className="num">Invoices</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {r.dailyBreakdown.map((d: any) => (
                                        <tr key={d.date}>
                                            <td>
                                                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)", background: "var(--bg-card2)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 6 }}>
                                                    {d.date}
                                                </span>
                                            </td>
                                            <td className="num" style={{ color: "#818cf8", fontWeight: 700 }}>{fmtFull(d.totalSales)}</td>
                                            <td className="num" style={{ color: "#10b981", fontWeight: 700 }}>{fmtFull(d.totalProfit)}</td>
                                            <td className="num" style={{ color: "#f87171", fontWeight: 700 }}>{fmtFull(d.totalExpenses)}</td>
                                            <td className="num" style={{ color: d.netProfit >= 0 ? "#fbbf24" : "#f87171", fontWeight: 800 }}>{fmtFull(d.netProfit)}</td>
                                            <td className="num" style={{ color: "var(--muted)" }}>{d.invoiceCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>)}
                </>)}
            </div>
        </AuthGuard>
    );
}

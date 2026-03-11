"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useLazyQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_DASHBOARD, GET_PROFIT_REPORT } from "@/lib/graphql/queries";
import {
    TrendingUp, TrendingDown, Receipt, Package,
    IndianRupee, AlertTriangle, BarChart3, RefreshCw,
    ArrowUpRight, ArrowDownRight, ShoppingBag,
    Calendar, ArrowRight, Download, Loader2, ChevronDown, X,
    ShieldCheck,
} from "lucide-react";
import { useTheme } from "@/lib/useTheme";
import { useSubscription } from "@/lib/useSubscription";
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtShort(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
}
function fmtFull(n: number) {
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── CSV Export Helper ─────────────────────────────────────────────── */
function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/* ─── Recharts Tooltip ─────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>{label}</div>
                {payload.map((entry: any, index: number) => (
                    <div key={index} style={{ color: entry.color, fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--muted)", fontWeight: 600 }}>{entry.name}</span>
                        <span>{entry.name.includes("Count") || entry.name.includes("Qty") ? entry.value : `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(entry.value)}`}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

/* ─── Animated Metric Card ─────────────────────────────────────────── */
function MetricCard({ label, value, sub, icon: Icon, gradient, trend, trendLabel }: {
    label: string; value: string; sub?: string;
    icon: any; gradient: string; trend?: "up" | "down" | "neutral";
    trendLabel?: string;
}) {
    return (
        <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: "22px 24px",
            transition: "transform 0.22s cubic-bezier(.4,2,.6,1), box-shadow 0.22s",
            cursor: "default",
        }}
            onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = "0 20px 48px var(--shadow)";
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: gradient, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    boxShadow: `0 4px 16px ${gradient.split(",")[0].replace("linear-gradient(135deg,", "").trim()}33`,
                }}>
                    <Icon size={18} color="#fff" strokeWidth={2.2} />
                </div>
                {trend && trendLabel && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, fontWeight: 700, borderRadius: 20,
                        padding: "3px 10px",
                        background: "var(--bg-input)",
                        color: trend === "up" ? "var(--green)" : trend === "down" ? "var(--red)" : "var(--muted)",
                    }}>
                        {trend === "up" ? <ArrowUpRight size={11} /> : trend === "down" ? <ArrowDownRight size={11} /> : null}
                        {trendLabel}
                    </div>
                )}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px", lineHeight: 1 }}>
                {value}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, fontWeight: 600, letterSpacing: "0.3px" }}>
                {label}
            </div>
            {sub && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, opacity: 0.7 }}>{sub}</div>
            )}
        </div>
    );
}

/* ─── Count Pill Card ───────────────────────────────────────────────── */
function CountCard({ value, label, icon: Icon, color, bg }: {
    value: number; label: string; icon: any; color: string; bg: string;
}) {
    return (
        <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: "20px 24px",
            display: "flex", alignItems: "center", gap: 18,
            transition: "transform 0.2s, box-shadow 0.2s",
        }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 40px var(--shadow)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
        >
            <div style={{
                width: 54, height: 54, borderRadius: 15,
                background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
            }}>
                <Icon size={22} color={color} strokeWidth={2} />
            </div>
            <div>
                <div style={{ fontSize: 30, fontWeight: 900, color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {value}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontWeight: 600 }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

/* ─── Section Header ────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${color}18`, display: "flex",
                alignItems: "center", justifyContent: "center",
            }}>
                <Icon size={13} color={color} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                {title}
            </span>
        </div>
    );
}

/* ─── Skeleton ──────────────────────────────────────────────────────── */
function SkeletonCard({ height = 130 }: { height?: number }) {
    return <div className="skeleton" style={{ height, borderRadius: 18 }} />;
}

/* ─── Modern Empty State ────────────────────────────────────────────── */
function ModernEmptyState({ title, sub, icon: Icon, actionLabel, onAction }: {
    title: string; sub: string; icon: any; actionLabel?: string; onAction?: () => void;
}) {
    return (
        <div style={{
            textAlign: "center", padding: "80px 40px",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 24, marginTop: 12,
            display: "flex", flexDirection: "column", alignItems: "center",
            boxShadow: "0 4px 20px var(--shadow)",
        }}>
            <div style={{
                width: 80, height: 80, borderRadius: 28,
                background: "linear-gradient(135deg, var(--indigo), var(--indigo-l))",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 24,
                boxShadow: "0 20px 40px rgba(99,102,241,0.25)",
                position: "relative",
            }}>
                <div style={{
                    position: "absolute", inset: -1, borderRadius: "inherit",
                    background: "inherit", filter: "blur(15px)", opacity: 0.4, zIndex: -1
                }} />
                <Icon size={32} color="#fff" strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
                {title}
            </h3>
            <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 300, margin: "0 auto 28px", lineHeight: 1.6 }}>
                {sub}
            </p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="btn btn-primary"
                    style={{
                        padding: "12px 28px", borderRadius: 14, fontSize: 14, fontWeight: 700,
                        display: "flex", alignItems: "center", gap: 8,
                        boxShadow: "0 10px 25px rgba(99,102,241,0.3)"
                    }}
                >
                    <Icon size={16} />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

/* ─── Date Range Filter Dropdown ────────────────────────────────────── */
function DateRangeFilter() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

    const [open, setOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState(firstDay);
    const [dateTo, setDateTo] = useState(todayStr);
    const [hasResult, setHasResult] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [runReport, { data, loading }] = useLazyQuery(GET_PROFIT_REPORT, {
        fetchPolicy: "network-only",
    } as any);

    const r = data?.getProfitReport;

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const generate = () => {
        runReport({ variables: { dateFrom, dateTo } } as any);
        setHasResult(true);
    };

    const handleCSVSummary = () => {
        if (!r) return;
        downloadCSV([
            ["CloudHisaab Report", `${dateFrom} to ${dateTo}`],
            [],
            ["Metric", "Value"],
            ["Total Revenue", fmtFull(r.totalRevenue)],
            ["Cost of Goods Sold", fmtFull(r.totalCost)],
            ["Gross Profit", fmtFull(r.grossProfit)],
            ["Total Expenses", fmtFull(r.totalExpenses)],
            ["Net Profit", fmtFull(r.netProfit)],
            ["Profit Margin %", `${r.profitMarginPercent.toFixed(2)}%`],
            ["Total Invoices", String(r.invoiceCount)],
        ], `cloudhisaab-report-${dateFrom}-to-${dateTo}.csv`);
    };

    const handleCSVDaily = () => {
        if (!r?.dailyBreakdown?.length) return;
        downloadCSV([
            [`Daily Breakdown: ${dateFrom} to ${dateTo}`],
            [],
            ["Date", "Revenue", "Gross Profit", "Expenses", "Net Profit", "Invoices"],
            ...r.dailyBreakdown.map((d: any) => [
                d.date,
                fmtFull(d.totalSales),
                fmtFull(d.totalProfit),
                fmtFull(d.totalExpenses),
                fmtFull(d.netProfit),
                String(d.invoiceCount),
            ]),
        ], `cloudhisaab-daily-${dateFrom}-to-${dateTo}.csv`);
    };

    const marginColor = r
        ? r.profitMarginPercent >= 20 ? "var(--green)"
            : r.profitMarginPercent >= 10 ? "var(--yellow)" : "var(--red)"
        : "var(--indigo-l)";

    const isFiltered = hasResult && r;

    return (
        <div ref={dropdownRef} style={{ position: "relative" }}>
            {/* ── Trigger button ── */}
            <button
                id="date-filter-btn"
                onClick={() => setOpen(o => !o)}
                className="btn btn-ghost"
                style={{
                    display: "flex", alignItems: "center", gap: 7, fontSize: 13,
                    borderColor: isFiltered ? "rgba(99,102,241,0.5)" : undefined,
                    color: isFiltered ? "var(--indigo-l)" : undefined,
                    background: isFiltered ? "rgba(99,102,241,0.08)" : undefined,
                    position: "relative",
                }}
            >
                <Calendar size={13} />
                {isFiltered ? `${dateFrom} → ${dateTo}` : "Date Filter"}
                {isFiltered && (
                    <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "var(--indigo-l)", display: "inline-block",
                    }} />
                )}
                <ChevronDown size={12} style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            {/* ── Dropdown panel ── */}
            {open && (
                <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    width: 520, zIndex: 200,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
                    overflow: "hidden",
                    animation: "fadeSlideDown 0.15s ease",
                }}>
                    {/* Panel header */}
                    <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 20px 12px",
                        borderBottom: "1px solid var(--border)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: "linear-gradient(135deg,var(--indigo),var(--indigo-l))",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <BarChart3 size={13} color="#fff" />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                                Date Range Report
                            </span>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, borderRadius: 6, display: "flex" }}
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Date picker row */}
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <Calendar size={13} color="var(--muted)" />
                            <input
                                id="filter-date-from"
                                type="date"
                                className="input"
                                style={{ flex: 1, minWidth: 120, fontSize: 13, padding: "7px 10px" }}
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                            />
                            <ArrowRight size={13} color="var(--muted)" style={{ flexShrink: 0 }} />
                            <input
                                id="filter-date-to"
                                type="date"
                                className="input"
                                style={{ flex: 1, minWidth: 120, fontSize: 13, padding: "7px 10px" }}
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                            />
                            <button
                                id="filter-generate-btn"
                                className="btn btn-primary"
                                style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}
                                onClick={generate}
                                disabled={loading}
                            >
                                {loading
                                    ? <><Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} /> Loading…</>
                                    : <><BarChart3 size={12} /> Generate</>
                                }
                            </button>
                        </div>

                        {/* Quick range presets */}
                        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                            {[
                                { label: "Today", from: todayStr, to: todayStr },
                                { label: "This month", from: firstDay, to: todayStr },
                                {
                                    label: "Last 7 days",
                                    from: (() => { const d = new Date(now); d.setDate(d.getDate() - 6); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })(),
                                    to: todayStr,
                                },
                                {
                                    label: "Last 30 days",
                                    from: (() => { const d = new Date(now); d.setDate(d.getDate() - 29); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })(),
                                    to: todayStr,
                                },
                                {
                                    label: "Last month",
                                    from: (() => { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; })(),
                                    to: (() => { const d = new Date(now.getFullYear(), now.getMonth(), 0); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })(),
                                },
                            ].map(preset => (
                                <button
                                    key={preset.label}
                                    onClick={() => { setDateFrom(preset.from); setDateTo(preset.to); }}
                                    style={{
                                        fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)",
                                        background: dateFrom === preset.from && dateTo === preset.to ? "rgba(99,102,241,0.12)" : "var(--bg-card2)",
                                        color: dateFrom === preset.from && dateTo === preset.to ? "var(--indigo-l)" : "var(--muted)",
                                        cursor: "pointer", fontWeight: 600, transition: "all 0.15s",
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Results ── */}
                    {loading && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 10 }}>
                            <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite", color: "var(--indigo)" }} />
                            <span style={{ color: "var(--muted)", fontSize: 13 }}>Generating report…</span>
                        </div>
                    )}

                    {!loading && hasResult && !r && (
                        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                            No transactions found in this date range.
                        </div>
                    )}

                    {!loading && r && (
                        <div style={{ padding: "16px 20px" }}>
                            {/* 4 mini stat tiles */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                                {[
                                    { label: "Revenue", value: fmtShort(r.totalRevenue), full: fmtFull(r.totalRevenue), color: "var(--indigo-l)" },
                                    { label: "Gross Profit", value: fmtShort(r.grossProfit), full: `${r.profitMarginPercent.toFixed(1)}% margin`, color: "var(--green)" },
                                    { label: "Expenses", value: fmtShort(r.totalExpenses), full: fmtFull(r.totalExpenses), color: "var(--red)" },
                                    { label: "Net Profit", value: fmtShort(r.netProfit), full: fmtFull(r.netProfit), color: r.netProfit >= 0 ? "var(--yellow)" : "var(--red)" },
                                ].map(tile => (
                                    <div key={tile.label} style={{
                                        background: "var(--bg-card2)", border: "1px solid var(--border)",
                                        borderRadius: 12, padding: "12px 14px",
                                    }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{tile.label}</div>
                                        <div style={{ fontSize: 17, fontWeight: 900, color: tile.color, fontVariantNumeric: "tabular-nums" }}>{tile.value}</div>
                                        <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 3, opacity: 0.8 }}>{tile.full}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Margin bar + invoices row */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                                <div style={{ flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>PROFIT MARGIN</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: marginColor, background: marginColor + "1a", padding: "2px 8px", borderRadius: 20 }}>
                                            {r.profitMarginPercent >= 20 ? "Excellent" : r.profitMarginPercent >= 10 ? "Good" : "Low"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ flex: 1, height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                                            <div style={{ height: "100%", borderRadius: 99, width: `${Math.min(r.profitMarginPercent, 100)}%`, background: `linear-gradient(90deg,${marginColor},${marginColor}88)`, transition: "width 0.8s ease" }} />
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 900, color: marginColor, minWidth: 36 }}>{r.profitMarginPercent.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                    <Receipt size={14} color="var(--indigo-l)" />
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--indigo-l)" }}>{r.invoiceCount}</div>
                                        <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>INVOICES</div>
                                    </div>
                                </div>
                            </div>

                            {/* Daily breakdown (compact) */}
                            {r.dailyBreakdown?.length > 0 && (
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>Daily Breakdown</div>
                                    <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                            <thead>
                                                <tr style={{ background: "var(--bg-card2)", position: "sticky", top: 0 }}>
                                                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--muted)", fontSize: 10 }}>Date</th>
                                                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--muted)", fontSize: 10 }}>Revenue</th>
                                                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--muted)", fontSize: 10 }}>Profit</th>
                                                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--muted)", fontSize: 10 }}>Net</th>
                                                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--muted)", fontSize: 10 }}>Inv</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {r.dailyBreakdown.map((day: any, i: number) => (
                                                    <tr key={day.date} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-card2)" }}>
                                                        <td style={{ padding: "7px 12px", fontFamily: "monospace", color: "var(--muted)", fontSize: 11 }}>{day.date}</td>
                                                        <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--indigo-l)", fontWeight: 700 }}>{fmtShort(day.totalSales)}</td>
                                                        <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--green)", fontWeight: 700 }}>{fmtShort(day.totalProfit)}</td>
                                                        <td style={{ padding: "7px 12px", textAlign: "right", color: day.netProfit >= 0 ? "var(--yellow)" : "var(--red)", fontWeight: 800 }}>{fmtShort(day.netProfit)}</td>
                                                        <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--muted)" }}>{day.invoiceCount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* CSV Export buttons */}
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    id="filter-csv-summary-btn"
                                    className="btn btn-ghost"
                                    style={{ flex: 1, fontSize: 12, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}
                                    onClick={handleCSVSummary}
                                >
                                    <Download size={12} /> Summary CSV
                                </button>
                                {r.dailyBreakdown?.length > 0 && (
                                    <button
                                        id="filter-csv-daily-btn"
                                        className="btn btn-ghost"
                                        style={{ flex: 1, fontSize: 12, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, color: "var(--indigo-l)", borderColor: "rgba(129,140,248,0.3)" }}
                                        onClick={handleCSVDaily}
                                    >
                                        <Download size={12} /> Daily CSV
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes fadeSlideDown {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default function DashboardPage() {
    const today = new Date().toISOString().split("T")[0];
    const { data, loading, refetch } = useQuery(GET_DASHBOARD, {
        variables: { date: today },
        fetchPolicy: "cache-and-network",
    } as any);

    const d = data?.getDashboard;
    const t = d?.today;
    const m = d?.month;
    const dateStr = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = now.getDate();
    const monthProgress = Math.round((daysElapsed / daysInMonth) * 100);

    const { status, loading: subLoading } = useSubscription();
    const { theme } = useTheme();

    const [runReport, { data: reportData, loading: reportLoading }] = useLazyQuery(GET_PROFIT_REPORT, {
        fetchPolicy: "cache-and-network",
    } as any);

    useEffect(() => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const d2 = new Date();
        const todayStr = `${d2.getFullYear()}-${pad(d2.getMonth() + 1)}-${pad(d2.getDate())}`;
        d2.setDate(d2.getDate() - 6);
        const last7Str = `${d2.getFullYear()}-${pad(d2.getMonth() + 1)}-${pad(d2.getDate())}`;
        runReport({ variables: { dateFrom: last7Str, dateTo: todayStr } } as any);
    }, [runReport]);

    const chartData = reportData?.getProfitReport?.dailyBreakdown?.map((day: any) => {
        const dObj = new Date(day.date);
        return {
            ...day,
            displayDate: dObj.toLocaleDateString("en-US", { day: "numeric", month: "short" })
        };
    }) || [];
    const chartDataReversed = [...chartData].reverse();

    const topProductsChartData = d?.topProducts?.slice(0, 5).map((p: any) => ({
        name: p.productName.length > 15 ? p.productName.substring(0, 15) + "..." : p.productName,
        revenue: p.totalRevenue,
        qty: p.totalQuantitySold
    })) || [];

    return (
        <AuthGuard>
            <div>

                {/* ── Header ──────────────────────────────────────── */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 32, flexWrap: "wrap", gap: 12,
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
                            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.4px" }}>
                                Dashboard
                            </h1>

                            {/* Subscription Badge */}
                            {!subLoading && status && status.plan !== "NONE" && (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    padding: "4px 12px", borderRadius: 99,
                                    background: status.status === "active" ? "rgba(16,185,129,0.12)" : "rgba(79,70,229,0.1)",
                                    border: `1px solid ${status.status === "active" ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.2)"}`,
                                    animation: "fadeSlideDown 0.3s ease",
                                }}>
                                    <ShieldCheck size={12} color={status.status === "active" ? "var(--green)" : "var(--indigo-l)"} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: status.status === "active" ? "var(--green)" : "var(--indigo-l)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                        {status.plan} {status.status === "active" ? "Active" : "Trialing"}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p style={{ fontSize: 13, color: "var(--muted)" }}>{dateStr}</p>
                    </div>

                    {/* ── Top-bar actions: Date filter + Refresh ── */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <DateRangeFilter />
                        <button onClick={() => refetch()}
                            className="btn btn-ghost"
                            style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                            <RefreshCw size={13} /> Refresh
                        </button>
                    </div>
                </div>

                {/* ── TODAY SECTION ────────────────────────────────── */}
                <SectionHeader icon={BarChart3} title="Today's Overview" color="var(--indigo)" />
                <div className="grid-4" style={{ marginBottom: 14 }}>
                    {loading ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} />) : (<>
                        <MetricCard
                            label="Total Sales"
                            value={fmtShort(t?.totalSales || 0)}
                            sub={`${t?.invoiceCount || 0} invoice${(t?.invoiceCount || 0) !== 1 ? "s" : ""}`}
                            icon={IndianRupee}
                            gradient="linear-gradient(135deg,var(--indigo),#6366f1)"
                            trend="up"
                            trendLabel="Today"
                        />
                        <MetricCard
                            label="Gross Profit"
                            value={fmtShort(t?.totalProfit || 0)}
                            icon={TrendingUp}
                            gradient="linear-gradient(135deg,var(--green),var(--green))"
                            trend={t?.totalProfit > 0 ? "up" : "neutral"}
                            trendLabel="Earned"
                        />
                        <MetricCard
                            label="Expenses"
                            value={fmtShort(t?.totalExpenses || 0)}
                            icon={TrendingDown}
                            gradient="linear-gradient(135deg,var(--red),var(--red))"
                            trend={t?.totalExpenses > 0 ? "down" : "neutral"}
                            trendLabel="Spent"
                        />
                        <MetricCard
                            label="Net Profit"
                            value={fmtShort(t?.netProfit || 0)}
                            icon={BarChart3}
                            gradient="linear-gradient(135deg,var(--yellow),var(--yellow))"
                            trend={t?.netProfit > 0 ? "up" : "down"}
                            trendLabel="Net"
                        />
                    </>)}
                </div>

                {/* Quick counts row */}
                {!loading && (
                    <div className="grid-3" style={{ marginBottom: 28 }}>
                        <CountCard
                            value={t?.invoiceCount || 0}
                            label="Invoices Today"
                            icon={Receipt}
                            color="var(--indigo-l)"
                            bg="rgba(79,70,229,0.10)"
                        />
                        <CountCard
                            value={d?.lowStockCount || 0}
                            label="Low Stock Items"
                            icon={AlertTriangle}
                            color={(d?.lowStockCount || 0) > 0 ? "var(--yellow)" : "var(--green)"}
                            bg={(d?.lowStockCount || 0) > 0 ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.10)"}
                        />
                        <CountCard
                            value={m?.invoiceCount || 0}
                            label="Invoices This Month"
                            icon={Package}
                            color="#a78bfa"
                            bg="rgba(167,139,250,0.10)"
                        />
                    </div>
                )}

                {/* ── THIS MONTH SECTION ───────────────────────────── */}
                <SectionHeader icon={ShoppingBag} title="This Month" color="var(--green)" />
                <div className="grid-4" style={{ marginBottom: 14 }}>
                    {loading ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} />) : (<>
                        <MetricCard
                            label="Monthly Sales"
                            value={fmtShort(m?.totalSales || 0)}
                            sub={fmt(m?.totalSales || 0)}
                            icon={IndianRupee}
                            gradient="linear-gradient(135deg,var(--indigo),#6366f1)"
                        />
                        <MetricCard
                            label="Monthly Profit"
                            value={fmtShort(m?.totalProfit || 0)}
                            sub={fmt(m?.totalProfit || 0)}
                            icon={TrendingUp}
                            gradient="linear-gradient(135deg,var(--green),var(--green))"
                            trend="up"
                        />
                        <MetricCard
                            label="Monthly Expenses"
                            value={fmtShort(m?.totalExpenses || 0)}
                            sub={fmt(m?.totalExpenses || 0)}
                            icon={TrendingDown}
                            gradient="linear-gradient(135deg,var(--red),var(--red))"
                        />
                        <MetricCard
                            label="Net Profit"
                            value={fmtShort(m?.netProfit || 0)}
                            sub={fmt(m?.netProfit || 0)}
                            icon={BarChart3}
                            gradient="linear-gradient(135deg,var(--yellow),var(--yellow))"
                            trend={(m?.netProfit || 0) > 0 ? "up" : "down"}
                        />
                    </>)}
                </div>

                {/* Month progress bar */}
                {!loading && (
                    <div style={{
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 14, padding: "14px 20px", marginBottom: 28,
                        display: "flex", alignItems: "center", gap: 16,
                    }}>
                        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                            Month Progress
                        </span>
                        <div style={{ flex: 1, height: 8, background: "var(--bg-card2)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                                height: "100%", borderRadius: 99,
                                width: `${monthProgress}%`,
                                background: "linear-gradient(90deg,var(--indigo),var(--indigo-l))",
                                transition: "width 1s ease",
                            }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 700, whiteSpace: "nowrap" }}>
                            Day {daysElapsed} / {daysInMonth} · {monthProgress}%
                        </span>
                    </div>
                )}

                {/* ── CHARTS SECTION ───────────────────────────── */}
                {!reportLoading && chartDataReversed.length > 0 && (
                    <div className="grid-2-1" style={{ marginBottom: 28 }}>
                        {/* 7-Day Revenue Trend */}
                        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: "20px" }}>
                            <SectionHeader icon={TrendingUp} title="7-Day Revenue & Profit Trend" color="var(--indigo)" />
                            <div style={{ height: 280, marginTop: 16, marginLeft: -16 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartDataReversed} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={v => `₹${v / 1000}k`} />
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                                        <Area type="monotone" dataKey="totalSales" name="Revenue" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} />
                                        <Area type="monotone" dataKey="totalProfit" name="Gross Profit" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Products Bar Chart */}
                        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: "20px" }}>
                            <SectionHeader icon={Package} title="Top Products (Today By Revenue)" color="var(--yellow)" />
                            {topProductsChartData.length > 0 ? (
                                <div style={{ height: 280, marginTop: 16, marginLeft: -24 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topProductsChartData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted)" }} tickFormatter={v => `₹${v / 1000}k`} />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} width={90} />
                                            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-input)", opacity: 0.5 }} />
                                            <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} barSize={24}>
                                                {topProductsChartData.map((e: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'][index % 5]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-card2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <BarChart3 size={18} opacity={0.5} />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.6 }}>No data today</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TOP PRODUCTS TABLE ───────────────────────────── */}
                {(d?.topProducts?.length > 0) && (
                    <div>
                        <SectionHeader icon={TrendingUp} title="Top Products Today" color="var(--yellow)" />
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}>#</th>
                                        <th>Product</th>
                                        <th>SKU</th>
                                        <th className="num">Qty Sold</th>
                                        <th className="num">Revenue</th>
                                        <th className="num">Profit</th>
                                        <th className="num" style={{ width: 100 }}>Margin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.topProducts.map((p: any, i: number) => {
                                        const margin = p.totalRevenue > 0
                                            ? Math.round((p.totalProfit / p.totalRevenue) * 100)
                                            : 0;
                                        return (
                                            <tr key={p.productId}>
                                                <td>
                                                    <div style={{
                                                        width: 24, height: 24, borderRadius: 8,
                                                        background: i === 0 ? "rgba(245,158,11,0.15)" : i === 1 ? "rgba(148,163,184,0.12)" : "rgba(79,70,229,0.08)",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: 11, fontWeight: 800,
                                                        color: i === 0 ? "var(--yellow)" : i === 1 ? "#94a3b8" : "var(--indigo-l)",
                                                    }}>
                                                        {i + 1}
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 700, color: "var(--text)" }}>{p.productName}</td>
                                                <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>{p.sku}</td>
                                                <td className="num" style={{ fontWeight: 700 }}>{p.totalQuantitySold}</td>
                                                <td className="num" style={{ color: "var(--indigo-l)", fontWeight: 700 }}>{fmt(p.totalRevenue)}</td>
                                                <td className="num" style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(p.totalProfit)}</td>
                                                <td className="num">
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div style={{ flex: 1, height: 5, background: "var(--bg-card2)", borderRadius: 99, overflow: "hidden" }}>
                                                            <div style={{
                                                                height: "100%", borderRadius: 99, width: `${Math.min(margin, 100)}%`,
                                                                background: margin > 20 ? "var(--green)" : margin > 10 ? "var(--yellow)" : "var(--red)",
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: margin > 20 ? "var(--green)" : margin > 10 ? "var(--yellow)" : "var(--red)", minWidth: 32 }}>
                                                            {margin}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !d?.topProducts?.length && (
                    <ModernEmptyState 
                        title="No sales yet today"
                        sub="Create your first invoice to see real-time stats, revenue trends, and top-selling products here."
                        icon={ShoppingBag}
                        actionLabel="Create Invoice"
                        onAction={() => window.location.href = "/billing"}
                    />
                )}
            </div>
        </AuthGuard>
    );
}

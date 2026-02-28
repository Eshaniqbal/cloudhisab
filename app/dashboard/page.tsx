"use client";
import { useQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_DASHBOARD } from "@/lib/graphql/queries";
import {
    TrendingUp, TrendingDown, Receipt, Package,
    IndianRupee, AlertTriangle, BarChart3, RefreshCw,
    ArrowUpRight, ArrowDownRight, ShoppingBag, Zap,
} from "lucide-react";

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtShort(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
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
            {/* Top row: icon + trend badge */}
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
                        background: trend === "up" ? "rgba(16,185,129,0.12)" : trend === "down" ? "rgba(239,68,68,0.1)" : "rgba(100,116,139,0.1)",
                        color: trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "var(--muted)",
                    }}>
                        {trend === "up" ? <ArrowUpRight size={11} /> : trend === "down" ? <ArrowDownRight size={11} /> : null}
                        {trendLabel}
                    </div>
                )}
            </div>

            {/* Value */}
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px", lineHeight: 1 }}>
                {value}
            </div>

            {/* Label */}
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

/* ─── Main Page ─────────────────────────────────────────────────────── */
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

    // Month progress (days elapsed / days in month)
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = now.getDate();
    const monthProgress = Math.round((daysElapsed / daysInMonth) * 100);

    return (
        <AuthGuard>
            <div>

                {/* ── Header ──────────────────────────────────────── */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 32, flexWrap: "wrap", gap: 12,
                }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 9,
                                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
                            }}>
                                <Zap size={15} color="#fff" />
                            </div>
                            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.4px" }}>
                                Dashboard
                            </h1>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--muted)" }}>{dateStr}</p>
                    </div>
                    <button onClick={() => refetch()}
                        className="btn btn-ghost"
                        style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>

                {/* ── TODAY SECTION ────────────────────────────────── */}
                <SectionHeader icon={BarChart3} title="Today's Overview" color="#4f46e5" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
                    {loading ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} />) : (<>
                        <MetricCard
                            label="Total Sales"
                            value={fmtShort(t?.totalSales || 0)}
                            sub={`${t?.invoiceCount || 0} invoice${(t?.invoiceCount || 0) !== 1 ? "s" : ""}`}
                            icon={IndianRupee}
                            gradient="linear-gradient(135deg,#4f46e5,#6366f1)"
                            trend="up"
                            trendLabel="Today"
                        />
                        <MetricCard
                            label="Gross Profit"
                            value={fmtShort(t?.totalProfit || 0)}
                            icon={TrendingUp}
                            gradient="linear-gradient(135deg,#10b981,#34d399)"
                            trend={t?.totalProfit > 0 ? "up" : "neutral"}
                            trendLabel="Earned"
                        />
                        <MetricCard
                            label="Expenses"
                            value={fmtShort(t?.totalExpenses || 0)}
                            icon={TrendingDown}
                            gradient="linear-gradient(135deg,#ef4444,#f87171)"
                            trend={t?.totalExpenses > 0 ? "down" : "neutral"}
                            trendLabel="Spent"
                        />
                        <MetricCard
                            label="Net Profit"
                            value={fmtShort(t?.netProfit || 0)}
                            icon={BarChart3}
                            gradient="linear-gradient(135deg,#f59e0b,#fbbf24)"
                            trend={t?.netProfit > 0 ? "up" : "down"}
                            trendLabel="Net"
                        />
                    </>)}
                </div>

                {/* Quick counts row */}
                {!loading && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
                        <CountCard
                            value={t?.invoiceCount || 0}
                            label="Invoices Today"
                            icon={Receipt}
                            color="#818cf8"
                            bg="rgba(79,70,229,0.10)"
                        />
                        <CountCard
                            value={d?.lowStockCount || 0}
                            label="Low Stock Items"
                            icon={AlertTriangle}
                            color={(d?.lowStockCount || 0) > 0 ? "#fbbf24" : "#10b981"}
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
                <SectionHeader icon={ShoppingBag} title="This Month" color="#10b981" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
                    {loading ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} />) : (<>
                        <MetricCard
                            label="Monthly Sales"
                            value={fmtShort(m?.totalSales || 0)}
                            sub={fmt(m?.totalSales || 0)}
                            icon={IndianRupee}
                            gradient="linear-gradient(135deg,#4f46e5,#6366f1)"
                        />
                        <MetricCard
                            label="Monthly Profit"
                            value={fmtShort(m?.totalProfit || 0)}
                            sub={fmt(m?.totalProfit || 0)}
                            icon={TrendingUp}
                            gradient="linear-gradient(135deg,#10b981,#34d399)"
                            trend="up"
                        />
                        <MetricCard
                            label="Monthly Expenses"
                            value={fmtShort(m?.totalExpenses || 0)}
                            sub={fmt(m?.totalExpenses || 0)}
                            icon={TrendingDown}
                            gradient="linear-gradient(135deg,#ef4444,#f87171)"
                        />
                        <MetricCard
                            label="Net Profit"
                            value={fmtShort(m?.netProfit || 0)}
                            sub={fmt(m?.netProfit || 0)}
                            icon={BarChart3}
                            gradient="linear-gradient(135deg,#f59e0b,#fbbf24)"
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
                                background: "linear-gradient(90deg,#4f46e5,#818cf8)",
                                transition: "width 1s ease",
                            }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 700, whiteSpace: "nowrap" }}>
                            Day {daysElapsed} / {daysInMonth} · {monthProgress}%
                        </span>
                    </div>
                )}

                {/* ── TOP PRODUCTS TABLE ───────────────────────────── */}
                {(d?.topProducts?.length > 0) && (
                    <div>
                        <SectionHeader icon={TrendingUp} title="Top Products Today" color="#f59e0b" />
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
                                                        color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#818cf8",
                                                    }}>
                                                        {i + 1}
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 700, color: "var(--text)" }}>{p.productName}</td>
                                                <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>{p.sku}</td>
                                                <td className="num" style={{ fontWeight: 700 }}>{p.totalQuantitySold}</td>
                                                <td className="num" style={{ color: "#818cf8", fontWeight: 700 }}>{fmt(p.totalRevenue)}</td>
                                                <td className="num" style={{ color: "#34d399", fontWeight: 700 }}>{fmt(p.totalProfit)}</td>
                                                <td className="num">
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div style={{ flex: 1, height: 5, background: "var(--bg-card2)", borderRadius: 99, overflow: "hidden" }}>
                                                            <div style={{
                                                                height: "100%", borderRadius: 99, width: `${Math.min(margin, 100)}%`,
                                                                background: margin > 20 ? "linear-gradient(90deg,#10b981,#34d399)" : margin > 10 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#ef4444,#f87171)",
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: margin > 20 ? "#34d399" : margin > 10 ? "#fbbf24" : "#f87171", minWidth: 32 }}>
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
                    <div style={{
                        textAlign: "center", padding: "60px 20px",
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: 18, marginTop: 8,
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No sales yet today</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>Create your first invoice to see stats here</div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}

"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_STOCK_LEVELS, LIST_PRODUCTS } from "@/lib/graphql/queries";
import { RECORD_PURCHASE, ADJUST_STOCK } from "@/lib/graphql/mutations";
import {
    Plus, Minus, AlertTriangle, CheckCircle, Layers,
    X, Loader2, PackagePlus, TrendingDown, TrendingUp,
    ShoppingCart, Archive, ArrowUpCircle, ArrowDownCircle,
    Search,
} from "lucide-react";

function fmt(n: number) { return n % 1 === 0 ? n.toString() : n.toFixed(1); }

const DECREASE_REASONS = ["Damage / Spoilage", "Theft / Loss", "Expired Goods", "Sample Used", "Return to Supplier", "Manual Correction", "Other"];

/* ─── Quick Stock Modal (Add OR Remove per-product) ─────────────────── */
function QuickRestockModal({ product, onClose, refetch }: { product: { productId: string; productName: string; sku: string; currentStock: number }; onClose: () => void; refetch: () => void }) {
    const [recordPurchase, { loading: addLoading }] = useMutation<any, any>(RECORD_PURCHASE);
    const [adjustStock, { loading: rmLoading }] = useMutation<any, any>(ADJUST_STOCK);

    const [mode, setMode] = useState<"add" | "remove">("add");
    const [qty, setQty] = useState("");
    const [supplier, setSupplier] = useState("");
    const [reason, setReason] = useState(DECREASE_REASONS[0]);
    const [notes, setNotes] = useState("");
    const [err, setErr] = useState("");

    const loading = addLoading || rmLoading;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        const q = +qty;
        if (!q || q <= 0) { setErr("Enter a valid quantity"); return; }
        if (mode === "add" && !supplier.trim()) { setErr("Supplier name is required"); return; }
        if (mode === "remove" && q > product.currentStock) {
            setErr(`Only ${fmt(product.currentStock)} units in stock`); return;
        }
        try {
            if (mode === "add") {
                await recordPurchase({
                    variables: {
                        input: {
                            supplierName: supplier,
                            supplierInvoice: "",
                            notes: notes || null,
                            items: [{ productId: product.productId, quantity: q, costPrice: 0 }],
                        },
                    },
                } as any);
            } else {
                await adjustStock({
                    variables: {
                        input: {
                            productId: product.productId,
                            quantity: q,
                            entryType: "OUT",
                            reason: `${reason}${notes ? ` — ${notes}` : ""}`,
                        },
                    },
                } as any);
            }
            await refetch();
            onClose();
        } catch (e: any) {
            setErr(e.message || "Operation failed");
        }
    };

    const isAdd = mode === "add";

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
            <div style={{ width: "100%", maxWidth: 460, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 24, padding: 32, position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "fadeInScale 0.2s ease" }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 8, display: "flex", alignItems: "center", borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-input)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <X size={16} />
                </button>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: isAdd ? "linear-gradient(135deg,#10b981,#34d399)" : "linear-gradient(135deg,#ef4444,#f87171)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isAdd ? "0 8px 20px rgba(16,185,129,0.35)" : "0 8px 20px rgba(239,68,68,0.35)", flexShrink: 0, transition: "all 0.3s ease" }}>
                        {isAdd ? <ArrowUpCircle size={24} color="#fff" /> : <ArrowDownCircle size={24} color="#fff" />}
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>Update Stock</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isAdd ? "#10b981" : "#f87171", marginTop: 2, transition: "color 0.2s" }}>{product.productName}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Current stock: <strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmt(product.currentStock)}</strong> units</div>
                    </div>
                </div>

                {/* Mode toggle */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 14, padding: 4 }}>
                    {([["add", "Add Stock", ArrowUpCircle, "#10b981"], ["remove", "Remove Stock", ArrowDownCircle, "#f87171"]] as const).map(([m, label, Icon, color]) => (
                        <button key={m} type="button"
                            onClick={() => { setMode(m); setErr(""); setQty(""); }}
                            style={{
                                padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                fontWeight: 800, fontSize: 13, transition: "all 0.2s ease",
                                background: mode === m ? "var(--bg-card)" : "transparent",
                                color: mode === m ? color : "var(--muted)",
                                boxShadow: mode === m ? "0 2px 12px rgba(0,0,0,0.2)" : "none",
                            }}
                        >
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Quantity */}
                    <div className="form-group">
                        <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "block", marginBottom: 8 }}>
                            {isAdd ? "Quantity to Add" : "Quantity to Remove"}
                        </label>
                        <input
                            className="input"
                            type="number" min="0.1" step="0.1" autoFocus
                            placeholder="e.g. 10"
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            style={{
                                fontSize: 28, fontWeight: 900, textAlign: "center", letterSpacing: "-0.5px", padding: "14px",
                                borderColor: mode === "remove" && +qty > product.currentStock ? "#ef4444" : undefined,
                            }}
                        />
                        {mode === "remove" && product.currentStock > 0 && (
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, textAlign: "center" }}>
                                Max removable: <strong style={{ color: "#f87171", fontVariantNumeric: "tabular-nums" }}>{fmt(product.currentStock)}</strong>
                            </div>
                        )}
                    </div>

                    {/* Add mode: supplier */}
                    {isAdd && (
                        <div className="form-group">
                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "block", marginBottom: 8 }}>Supplier Name <span style={{ color: "#ef4444" }}>*</span></label>
                            <input className="input" placeholder="ABC Wholesalers" value={supplier} onChange={e => setSupplier(e.target.value)} />
                        </div>
                    )}

                    {/* Remove mode: reason */}
                    {!isAdd && (
                        <div className="form-group">
                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "block", marginBottom: 8 }}>Reason <span style={{ color: "#ef4444" }}>*</span></label>
                            <div style={{ position: "relative" }}>
                                <select className="input" value={reason} onChange={e => setReason(e.target.value)} style={{ appearance: "none", cursor: "pointer" }}>
                                    {DECREASE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="form-group">
                        <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "block", marginBottom: 8 }}>Notes (optional)</label>
                        <input className="input" placeholder={isAdd ? "e.g. Seasonal restock" : "e.g. Found during stocktake"} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    {err && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#f87171", display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease" }}>
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {err}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <button type="button" className="btn btn-ghost" style={{ flex: 1, fontWeight: 700 }} onClick={onClose}>Cancel</button>
                        <button type="submit" style={{
                            flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            fontWeight: 800, fontSize: 14, padding: "12px 20px", borderRadius: 12, border: "none", cursor: "pointer",
                            background: isAdd ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)",
                            color: "#fff",
                            boxShadow: isAdd ? "0 8px 24px rgba(16,185,129,0.3)" : "0 8px 24px rgba(239,68,68,0.3)",
                            transition: "all 0.15s ease",
                        }} disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : isAdd ? <Plus size={16} /> : <Minus size={16} />}
                            {loading ? "Saving…" : isAdd ? "Confirm Restock" : "Confirm Removal"}
                        </button>
                    </div>
                </form>

                <style>{`
                    @keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
                    @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    select option { background: #1e1b4b; color: #f1f5f9; }
                `}</style>
            </div>
        </div>
    );
}

/* ─── Full Purchase Modal (all products) ────────────────────────────── */
function PurchaseModal({ onClose, refetch }: any) {
    const { data: prodData } = useQuery<any, any>(LIST_PRODUCTS, { fetchPolicy: "cache-and-network" } as any);
    const [recordPurchase, { loading }] = useMutation<any, any>(RECORD_PURCHASE);
    const [supplier, setSupplier] = useState({ supplierName: "", supplierInvoice: "", notes: "" });
    const [items, setItems] = useState([{ productId: "", quantity: "" }]);

    const products = prodData?.listProducts?.items || [];
    const addItem = () => setItems(i => [...i, { productId: "", quantity: "" }]);
    const setItem = (idx: number, k: string, v: string) =>
        setItems(items.map((it, i) => i === idx ? { ...it, [k]: v } : it));
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validItems = items.filter(i => i.productId && +i.quantity > 0);
        if (validItems.length === 0) { alert("Add at least one valid item"); return; }
        await recordPurchase({
            variables: {
                input: {
                    ...supplier,
                    items: validItems.map(i => ({ productId: i.productId, quantity: +i.quantity, costPrice: 0 })),
                },
            },
        } as any);
        await refetch();
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#10b981,#34d399)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(16,185,129,0.35)" }}>
                            <PackagePlus size={17} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Record Purchase</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>Stock IN — add inventory for multiple products</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--muted)", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={15} />
                    </button>
                </div>

                <form onSubmit={submit}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                        <div className="form-group">
                            <label>Supplier Name</label>
                            <input className="input" value={supplier.supplierName} onChange={e => setSupplier({ ...supplier, supplierName: e.target.value })} placeholder="ABC Wholesalers" required />
                        </div>
                        <div className="form-group">
                            <label>Invoice # (optional)</label>
                            <input className="input" value={supplier.supplierInvoice} onChange={e => setSupplier({ ...supplier, supplierInvoice: e.target.value })} placeholder="INV/2026/001" />
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Items</span>
                            <button type="button" className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }} onClick={addItem}>
                                <Plus size={12} /> Add Row
                            </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {items.map((item, idx) => (
                                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: 8, alignItems: "center", background: "var(--bg-card2)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--border)" }}>
                                    <select className="input" style={{ fontSize: 13 }} value={item.productId} onChange={e => setItem(idx, "productId", e.target.value)} required>
                                        <option value="">Select product</option>
                                        {products.map((p: any) => (
                                            <option key={p.productId} value={p.productId}>{p.name}{p.sku && p.sku !== "---" ? ` (${p.sku})` : ""}</option>
                                        ))}
                                    </select>
                                    <input type="number" className="input" style={{ fontSize: 13 }} placeholder="Qty" min="0.1" step="0.1" value={item.quantity} onChange={e => setItem(idx, "quantity", e.target.value)} />
                                    <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                                        style={{ background: "none", border: "none", cursor: items.length === 1 ? "not-allowed" : "pointer", color: "#ef4444", opacity: items.length === 1 ? 0.2 : 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}
                                        onMouseEnter={e => { if (items.length > 1) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                                        onMouseLeave={e => { if (items.length > 1) (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 24 }}>
                        <label>Notes (optional)</label>
                        <input className="input" value={supplier.notes} onChange={e => setSupplier({ ...supplier, notes: e.target.value })} placeholder="e.g. Seasonal restocking" />
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={loading}>
                            {loading ? <><Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} />Recording…</> : <><PackagePlus size={14} />Record Purchase</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Stock Row Card ────────────────────────────────────────────────── */
function StockRow({ l, onRestock }: { l: any; onRestock: (p: { productId: string; productName: string; sku: string; currentStock: number }) => void }) {
    const pct = l.lowStockAlert > 0 ? Math.min((l.currentStock / (l.lowStockAlert * 3)) * 100, 100) : 100;
    const barColor = l.isLowStock
        ? "linear-gradient(90deg,#ef4444,#f87171)"
        : pct > 60
            ? "linear-gradient(90deg,#10b981,#34d399)"
            : "linear-gradient(90deg,#f59e0b,#fbbf24)";

    return (
        <tr>
            <td>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{l.productName}</div>
            </td>
            <td>
                <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, background: "var(--bg-card2)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 6, color: "var(--muted)" }}>
                    {l.sku && l.sku !== "---" ? l.sku : "—"}
                </span>
            </td>
            <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#10b981", fontWeight: 700, fontSize: 13 }}>
                    <TrendingUp size={12} />+{fmt(l.totalIn)}
                </span>
            </td>
            <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#f87171", fontWeight: 700, fontSize: 13 }}>
                    <TrendingDown size={12} />−{fmt(l.totalOut)}
                </span>
            </td>
            <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: l.isLowStock ? "#fbbf24" : "var(--text)", minWidth: 48 }}>
                        {fmt(l.currentStock)}
                    </span>
                    <div style={{ flex: 1, height: 6, background: "var(--bg-card2)", borderRadius: 99, overflow: "hidden", minWidth: 60 }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: barColor, transition: "width 0.6s ease" }} />
                    </div>
                </div>
            </td>
            <td>
                <span style={{ fontSize: 13, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                    {l.lowStockAlert}
                </span>
            </td>
            <td>
                {l.isLowStock
                    ? <span className="badge badge-yellow"><AlertTriangle size={10} /> Low Stock</span>
                    : <span className="badge badge-green"><CheckCircle size={10} /> OK</span>}
            </td>
            <td>
                <button
                    onClick={() => onRestock({ productId: l.productId, productName: l.productName, sku: l.sku, currentStock: l.currentStock })}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer",
                        background: l.isLowStock ? "linear-gradient(135deg,#10b981,#059669)" : "var(--bg-input)",
                        color: l.isLowStock ? "#fff" : "var(--text)",
                        border: `1px solid ${l.isLowStock ? "transparent" : "var(--border)"}`,
                        boxShadow: l.isLowStock ? "0 4px 14px rgba(16,185,129,0.4)" : "none",
                        transition: "all 0.15s ease",
                        whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => {
                        if (!l.isLowStock) {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(16,185,129,0.1)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(16,185,129,0.3)";
                            (e.currentTarget as HTMLButtonElement).style.color = "#10b981";
                        }
                    }}
                    onMouseLeave={e => {
                        if (!l.isLowStock) {
                            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-input)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                            (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
                        }
                    }}
                >
                    <Plus size={13} />
                    Update Stock
                </button>
            </td>
        </tr>
    );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function StockPage() {
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [search, setSearch] = useState("");
    const { data, loading, refetch } = useQuery<any, any>(GET_STOCK_LEVELS, {
        fetchPolicy: "cache-and-network",
        variables: { search: "" },
    });

    const [modal, setModal] = useState(false);
    const [restockProduct, setRestockProduct] = useState<{ productId: string; productName: string; sku: string; currentStock: number } | null>(null);

    // Debounced GraphQL search
    const handleSearch = (val: string) => {
        setSearch(val);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            refetch({ search: val.trim() || undefined });
        }, 300);
    };

    const levels = data?.getStockLevels || [];
    const lowStock = levels.filter((l: any) => l.isLowStock);
    const totalIn = levels.reduce((s: number, l: any) => s + l.totalIn, 0);
    const totalOut = levels.reduce((s: number, l: any) => s + l.totalOut, 0);

    return (
        <AuthGuard>
            <div>
                {/* ── Header ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Archive size={17} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>Stock Ledger</h1>
                            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                                {levels.length} products · {lowStock.length} low stock
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setModal(true)}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <PackagePlus size={15} /> Record Purchase
                    </button>
                </div>

                {/* ── Search ── */}
                <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                    <input
                        className="input"
                        style={{ paddingLeft: 36, paddingRight: 36 }}
                        placeholder="Search by name or SKU…"
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                    />
                    {loading && search && (
                        <Loader2 size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", animation: "spin 0.7s linear infinite" }} />
                    )}
                    {search && !loading && (
                        <button
                            onClick={() => handleSearch("")}
                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* ── Summary stat strip ── */}
                {!loading && levels.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
                        {[
                            { label: "Total Products", value: levels.length, icon: Layers, color: "#818cf8", bg: "rgba(79,70,229,0.1)" },
                            { label: "Low Stock", value: lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? "#fbbf24" : "#10b981", bg: lowStock.length > 0 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)" },
                            { label: "Total Stock IN", value: `+${fmt(totalIn)}`, icon: TrendingUp, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
                            { label: "Total Stock OUT", value: `−${fmt(totalOut)}`, icon: TrendingDown, color: "#f87171", bg: "rgba(239,68,68,0.1)" },
                        ].map(({ label, value, icon: Icon, color, bg }) => (
                            <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, transition: "transform 0.18s, box-shadow 0.18s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px var(--shadow)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Icon size={18} color={color} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontWeight: 600 }}>{label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Low stock alert banner ── */}
                {lowStock.length > 0 && (
                    <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <AlertTriangle size={17} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>
                                {lowStock.length} product{lowStock.length !== 1 ? "s" : ""} running low
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                                {lowStock.map((l: any) => l.productName).join(" · ")}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Table ── */}
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Stock IN</th>
                                <th>Stock OUT</th>
                                <th>Current Stock</th>
                                <th>Alert At</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
                                        <Loader2 size={22} style={{ animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
                                    </td>
                                </tr>
                            )}
                            {!loading && levels.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: "center", padding: "64px 0" }}>
                                        <ShoppingCart size={36} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.4 }} />
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>No stock records yet</div>
                                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Add products and record a purchase to get started</div>
                                    </td>
                                </tr>
                            )}
                            {levels.map((l: any) => (
                                <StockRow
                                    key={l.productId}
                                    l={l}
                                    onRestock={setRestockProduct}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Modals ── */}
                {modal && <PurchaseModal onClose={() => setModal(false)} refetch={refetch} />}
                {restockProduct && (
                    <QuickRestockModal
                        product={restockProduct}
                        onClose={() => setRestockProduct(null)}
                        refetch={refetch}
                    />
                )}

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </AuthGuard>
    );
}

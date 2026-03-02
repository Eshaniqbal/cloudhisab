"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_PRODUCTS } from "@/lib/graphql/queries";
import { CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT } from "@/lib/graphql/mutations";
import { Plus, Pencil, Trash2, X, Loader2, Package, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { HSN_DICTIONARY } from "@/lib/hsn_dictionary";

const GST_RATES = [0, 5, 12, 18, 28];
const CATEGORIES = ["Electronics", "Clothing", "Food", "Grocery", "Medicine", "Stationery", "Hardware", "Other"];
const UNITS = ["pcs", "kg", "g", "ltr", "ml", "box", "pack", "pair", "dozen", "meter", "ft"];

const EMPTY = { name: "", sku: "", hsnCode: "", costPrice: "", sellingPrice: "", gstRate: "18", category: "Other", unit: "pcs", lowStockAlert: "10" };

function fmt(n: number) {
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}



function ProductModal({ onClose, refetch, existing }: any) {
    const [form, setForm] = useState(
        existing
            ? { ...existing, costPrice: String(existing.costPrice), sellingPrice: String(existing.sellingPrice), gstRate: String(existing.gstRate), lowStockAlert: String(existing.lowStockAlert) }
            : EMPTY
    );
    const [createProduct, { loading: cl }] = useMutation<any, any>(CREATE_PRODUCT);
    const [updateProduct, { loading: ul }] = useMutation<any, any>(UPDATE_PRODUCT);
    const loading = cl || ul;

    const [showHsnMenu, setShowHsnMenu] = useState(false);
    const [hsnSearch, setHsnSearch] = useState("");

    const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
    const margin = form.sellingPrice && form.costPrice
        ? (((+form.sellingPrice - +form.costPrice) / +form.sellingPrice) * 100).toFixed(1)
        : "0.0";

    // Auto-suggest HSN
    const suggestion = form.name
        ? HSN_DICTIONARY.find(d => d.keywords.some(k => form.name.toLowerCase().includes(k)))
        : null;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const input = { ...form, costPrice: +form.costPrice, sellingPrice: +form.sellingPrice, gstRate: +form.gstRate, lowStockAlert: +form.lowStockAlert };
        if (existing) await updateProduct({ variables: { productId: existing.productId, input } } as any);
        else await createProduct({ variables: { input } } as any);
        await refetch();
        onClose();
    };

    const filteredHsn = hsnSearch
        ? HSN_DICTIONARY.filter(d =>
            d.hsn.includes(hsnSearch) ||
            d.desc.toLowerCase().includes(hsnSearch.toLowerCase()) ||
            (d.keywords && d.keywords.some(k => k.includes(hsnSearch.toLowerCase())))
        ).slice(0, 10)
        : HSN_DICTIONARY.slice(0, 10);

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
            <div style={{ width: "100%", maxWidth: 640, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 24, padding: 32, position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "fadeInScale 0.2s ease", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 8, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-input)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <X size={18} />
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, flexShrink: 0 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(79,70,229,0.35)" }}>
                        {existing ? <Pencil size={22} color="#fff" /> : <Package size={22} color="#fff" />}
                    </div>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>{existing ? "Edit Product" : "Add New Product"}</h2>
                        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{existing ? "Update inventory details" : "Add a new item to your catalogue"}</p>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, margin: "0 -8px 0 0" }}>
                    <form id="product-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Product Name <span style={{ color: "#ef4444" }}>*</span></label>
                                <input className="input" style={{ fontSize: 15 }} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Samsung Galaxy M14" required autoFocus />
                                {suggestion && !existing && (!form.hsnCode || form.hsnCode !== suggestion.hsn) && (
                                    <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start", transition: "all 0.15s" }}
                                        onClick={() => { set("hsnCode", suggestion.hsn); set("gstRate", suggestion.gst); }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.12)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,0.08)"}>
                                        <span style={{ fontSize: 14 }}>✨</span>
                                        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                                            <span style={{ color: "#818cf8", fontWeight: 700 }}>Intelligent Match</span> — Looks like <b>{suggestion.desc}</b>.<br />
                                            Click to auto-apply HSN <span style={{ fontFamily: "monospace", color: "var(--text)", background: "var(--bg-input)", padding: "1px 4px", borderRadius: 4 }}>{suggestion.hsn}</span> & GST <strong style={{ color: "var(--text)" }}>{suggestion.gst}%</strong>.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>SKU / Barcode</label>
                                <input className="input" style={{ fontFamily: "monospace", fontSize: 14 }} value={form.sku} onChange={e => set("sku", e.target.value.toUpperCase())} placeholder="SGM14-BLK (optional)" />
                            </div>

                            <div className="form-group" style={{ position: "relative" }}>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>HSN Code</label>
                                <input
                                    className="input" style={{ fontFamily: "monospace", fontSize: 14 }}
                                    value={showHsnMenu ? hsnSearch : (form.hsnCode || "")}
                                    onChange={e => {
                                        if (!showHsnMenu) {
                                            setHsnSearch(e.target.value);
                                            setShowHsnMenu(true);
                                        } else {
                                            setHsnSearch(e.target.value);
                                        }
                                        set("hsnCode", e.target.value);
                                    }}
                                    onFocus={() => { setHsnSearch(form.hsnCode || ""); setShowHsnMenu(true); }}
                                    onBlur={() => setTimeout(() => setShowHsnMenu(false), 200)}
                                    placeholder="Search by name or code…"
                                />
                                {showHsnMenu && (
                                    <div
                                        style={{
                                            position: "absolute", zIndex: 50, top: "100%", left: 0, right: 0, marginTop: 8,
                                            background: "var(--glass-bg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                                            border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                                            maxHeight: 280, overflowY: "auto", overflowX: "hidden"
                                        }}
                                    >
                                        {filteredHsn.map(d => (
                                            <div
                                                key={d.hsn}
                                                style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "all 0.1s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-input)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                onMouseDown={(e) => { e.preventDefault(); set("hsnCode", d.hsn); set("gstRate", d.gst); setShowHsnMenu(false); }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>{d.desc}</span>
                                                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, padding: "3px 6px", borderRadius: 6, color: "#818cf8", background: "rgba(99,102,241,0.1)", flexShrink: 0 }}>
                                                        {d.hsn}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
                                                    GST Rate: <span style={{ color: Number(d.gst) > 0 ? "#f87171" : "#10b981" }}>{d.gst}%</span>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredHsn.length === 0 && (
                                            <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                                                No matching HSN codes found.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Category</label>
                                <div style={{ position: "relative" }}>
                                    <select className="input" style={{ appearance: "none", cursor: "pointer" }} value={form.category} onChange={e => set("category", e.target.value)}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Unit</label>
                                <div style={{ position: "relative" }}>
                                    <select className="input" style={{ appearance: "none", cursor: "pointer" }} value={form.unit} onChange={e => set("unit", e.target.value)}>
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>GST Rate (%)</label>
                                <div style={{ position: "relative" }}>
                                    <select className="input" style={{ appearance: "none", cursor: "pointer" }} value={form.gstRate} onChange={e => set("gstRate", e.target.value)}>
                                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                                    </select>
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Cost Price (₹) <span style={{ color: "#ef4444" }}>*</span></label>
                                <input type="number" step="0.01" className="input" style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums" }} value={form.costPrice} onChange={e => set("costPrice", e.target.value)} placeholder="0.00" required />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Selling Price (₹) <span style={{ color: "#ef4444" }}>*</span></label>
                                <input type="number" step="0.01" className="input" style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums" }} value={form.sellingPrice} onChange={e => set("sellingPrice", e.target.value)} placeholder="0.00" required />
                            </div>

                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Low Stock Alert Threshold</label>
                                <input type="number" className="input" value={form.lowStockAlert} onChange={e => set("lowStockAlert", e.target.value)} min={0} />
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>You'll see a warning when inventory drops below this number.</div>
                            </div>
                        </div>

                        {/* Margin preview */}
                        {+form.sellingPrice > 0 && (
                            <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4 }}>Margin</div>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: +margin > 0 ? "#10b981" : "#f87171" }}>{margin}%</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4 }}>GST Amount</div>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: "#818cf8" }}>₹{(+form.sellingPrice * +form.gstRate / 100).toFixed(2)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4 }}>MRP (inc. GST)</div>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>₹{(+form.sellingPrice * (1 + +form.gstRate / 100)).toFixed(2)}</div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: "12px", fontSize: 14, fontWeight: 700 }} onClick={onClose}>Cancel</button>
                    <button type="submit" form="product-form" className="btn btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", fontSize: 14, fontWeight: 800, boxShadow: "0 8px 24px rgba(79,70,229,0.35)" }} disabled={loading}>
                        {loading && <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} />}
                        {existing ? "Save Changes" : "Create Product"}
                    </button>
                </div>
                <style>{`
                    @keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    select option { background: #1e1b4b; color: #f1f5f9; }
                    /* Fix weird scrollbar sizing on webkit */
                    ::-webkit-scrollbar { width: 6px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                `}</style>
            </div>
        </div>
    );
}

export default function ProductsPage() {
    // @ts-ignore — Apollo 3.14 strict inference; build passes fine
    const { data, loading, refetch } = useQuery<any, any>(LIST_PRODUCTS, { fetchPolicy: "cache-and-network" });
    const [deleteProduct] = useMutation<any, any>(DELETE_PRODUCT);
    const [modal, setModal] = useState<"add" | "edit" | null>(null);
    const [editing, setEditing] = useState<any>(null);
    const [search, setSearch] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const products = (data?.listProducts?.items || []).filter((p: any) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = (id: string, name: string) => {
        setDeleteTarget({ id, name });
    };
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteProduct({ variables: { productId: deleteTarget.id } } as any);
            refetch();
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    };

    return (
        <AuthGuard>
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Product"
                message={`Remove "${deleteTarget?.name}" from your product catalogue?`}
                confirmLabel="Yes, Delete"
                loading={deleteLoading}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Products</h1>
                        <p className="page-subtitle">{data?.listProducts?.total || 0} products in catalogue</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setModal("add"); }}>
                        <Plus size={16} /> Add Product
                    </button>
                </div>

                {/* Search */}
                <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
                    <Search size={15} style={{
                        position: "absolute", left: 12, top: "50%",
                        transform: "translateY(-50%)", color: "var(--muted)",
                        pointerEvents: "none",
                    }} />
                    <input
                        className="input"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search by name or SKU…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>HSN</th>
                                <th>Category</th>
                                <th>Cost</th>
                                <th>Price</th>
                                <th>GST</th>
                                <th>Margin</th>
                                <th>MRP (incl. GST)</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={9} className="text-center py-12 text-slate-500"><Loader2 size={20} className="animate-spin inline" /></td></tr>
                            )}
                            {!loading && products.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center py-16">
                                        <Package size={32} className="mx-auto text-slate-600 mb-2" />
                                        <p className="text-slate-500">No products yet. Add your first product!</p>
                                    </td>
                                </tr>
                            )}
                            {products.map((p: any) => (
                                <tr key={p.productId}>
                                    <td>
                                        <div className="font-medium text-white">{p.name}</div>
                                        <div className="text-xs text-slate-500">{p.unit}</div>
                                    </td>
                                    <td className="font-mono text-xs text-slate-400">{p.sku}</td>
                                    <td className="font-mono text-xs text-slate-500">{p.hsnCode || "—"}</td>
                                    <td><span className="badge badge-indigo">{p.category}</span></td>
                                    <td className="num text-slate-300">₹{p.costPrice.toFixed(2)}</td>
                                    <td className="num text-white font-medium">₹{p.sellingPrice.toFixed(2)}</td>
                                    <td className="num text-slate-400">{p.gstRate}%</td>
                                    <td className={`num font-semibold ${p.marginPercent > 0 ? "text-green-400" : "text-red-400"}`}>{p.marginPercent.toFixed(1)}%</td>
                                    <td className="num text-indigo-400">₹{p.sellingPriceWithGst.toFixed(2)}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button className="btn btn-ghost px-2 py-1.5" onClick={() => { setEditing(p); setModal("edit"); }}>
                                                <Pencil size={13} />
                                            </button>
                                            <button className="btn btn-danger px-2 py-1.5" onClick={() => handleDelete(p.productId, p.name)}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {modal && (
                    <ProductModal
                        onClose={() => setModal(null)}
                        refetch={refetch}
                        existing={modal === "edit" ? editing : null}
                    />
                )}
            </div>
        </AuthGuard>
    );
}

"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_PRODUCTS } from "@/lib/graphql/queries";
import { CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT } from "@/lib/graphql/mutations";
import { Plus, Pencil, Trash2, X, Loader2, Package, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const GST_RATES = [0, 5, 12, 18, 28];
const CATEGORIES = ["Electronics", "Clothing", "Food", "Grocery", "Medicine", "Stationery", "Hardware", "Other"];
const UNITS = ["pcs", "kg", "g", "ltr", "ml", "box", "pack", "pair", "dozen", "meter", "ft"];

const EMPTY = { name: "", sku: "", costPrice: "", sellingPrice: "", gstRate: "18", category: "Other", unit: "pcs", lowStockAlert: "10" };

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

    const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
    const margin = form.sellingPrice && form.costPrice
        ? (((+form.sellingPrice - +form.costPrice) / +form.sellingPrice) * 100).toFixed(1)
        : "0.0";

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const input = { ...form, costPrice: +form.costPrice, sellingPrice: +form.sellingPrice, gstRate: +form.gstRate, lowStockAlert: +form.lowStockAlert };
        if (existing) await updateProduct({ variables: { productId: existing.productId, input } } as any);
        else await createProduct({ variables: { input } } as any);
        await refetch();
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">{existing ? "Edit Product" : "Add New Product"}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-group col-span-2">
                            <label>Product Name</label>
                            <input className="input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Samsung Galaxy M14" required />
                        </div>
                        <div className="form-group">
                            <label>SKU / Barcode</label>
                            <input className="input" value={form.sku} onChange={e => set("sku", e.target.value.toUpperCase())} placeholder="SGM14-BLK" required />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <select className="input" value={form.category} onChange={e => set("category", e.target.value)}>
                                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Cost Price (₹)</label>
                            <input type="number" step="0.01" className="input" value={form.costPrice} onChange={e => set("costPrice", e.target.value)} placeholder="0.00" required />
                        </div>
                        <div className="form-group">
                            <label>Selling Price (₹)</label>
                            <input type="number" step="0.01" className="input" value={form.sellingPrice} onChange={e => set("sellingPrice", e.target.value)} placeholder="0.00" required />
                        </div>
                        <div className="form-group">
                            <label>GST Rate (%)</label>
                            <select className="input" value={form.gstRate} onChange={e => set("gstRate", e.target.value)}>
                                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Unit</label>
                            <select className="input" value={form.unit} onChange={e => set("unit", e.target.value)}>
                                {UNITS.map(u => <option key={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="form-group col-span-2">
                            <label>Low Stock Alert Threshold</label>
                            <input type="number" className="input" value={form.lowStockAlert} onChange={e => set("lowStockAlert", e.target.value)} min={0} />
                        </div>
                    </div>

                    {/* Margin preview */}
                    {+form.sellingPrice > 0 && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex justify-between text-sm">
                            <span className="text-slate-400">Margin</span>
                            <span className={`font-bold ${+margin > 0 ? "text-green-400" : "text-red-400"}`}>{margin}%</span>
                            <span className="text-slate-400">GST Amount</span>
                            <span className="text-indigo-400 font-semibold">₹{(+form.sellingPrice * +form.gstRate / 100).toFixed(2)}</span>
                            <span className="text-slate-400">MRP inc. GST</span>
                            <span className="text-white font-bold">₹{(+form.sellingPrice * (1 + +form.gstRate / 100)).toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            {existing ? "Update" : "Add Product"}
                        </button>
                    </div>
                </form>
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

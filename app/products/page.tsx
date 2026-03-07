"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_PRODUCTS, GET_IMPORT_JOB_STATUS } from "@/lib/graphql/queries";
import { CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT, CREATE_PRODUCT_IMPORT_URL, NOTIFY_IMPORT_UPLOADED } from "@/lib/graphql/mutations";
import {
    Plus, Pencil, Trash2, X, Loader2, Package, Search,
    Upload, FileSpreadsheet, CheckCircle, AlertTriangle,
    Download, RefreshCw, ChevronDown,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { HSN_DICTIONARY } from "@/lib/hsn_dictionary";

const GST_RATES = [0, 5, 12, 18, 28];
const CATEGORIES = ["Electronics", "Clothing", "Food", "Grocery", "Medicine", "Stationery", "Hardware", "Other"];
const UNITS = ["pcs", "kg", "g", "ltr", "ml", "box", "pack", "pair", "dozen", "meter", "ft"];
const EMPTY = { name: "", sku: "", hsnCode: "", costPrice: "", sellingPrice: "", gstRate: "18", category: "Other", unit: "pcs", lowStockAlert: "10", initialStock: "0" };

function fmt(n: number) {
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Modal (add / edit)  — unchanged from original
// ─────────────────────────────────────────────────────────────────────────────
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

    const suggestion = form.name
        ? HSN_DICTIONARY.find(d => d.keywords.some(k => form.name.toLowerCase().includes(k)))
        : null;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const input: any = {
            name: form.name, sku: form.sku || "", hsnCode: form.hsnCode || "",
            costPrice: +form.costPrice, sellingPrice: +form.sellingPrice,
            gstRate: +form.gstRate, category: form.category, unit: form.unit,
            lowStockAlert: +form.lowStockAlert,
        };
        if (!existing && form.initialStock && +form.initialStock > 0) {
            input.initialStock = +form.initialStock;
        }
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
                                    <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}
                                        onClick={() => { set("hsnCode", suggestion.hsn); set("gstRate", suggestion.gst); }}>
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
                                    onChange={e => { if (!showHsnMenu) { setHsnSearch(e.target.value); setShowHsnMenu(true); } else { setHsnSearch(e.target.value); } set("hsnCode", e.target.value); }}
                                    onFocus={() => { setHsnSearch(form.hsnCode || ""); setShowHsnMenu(true); }}
                                    onBlur={() => setTimeout(() => setShowHsnMenu(false), 200)}
                                    placeholder="Search by name or code…"
                                />
                                {showHsnMenu && (
                                    <div style={{ position: "absolute", zIndex: 50, top: "100%", left: 0, right: 0, marginTop: 8, background: "var(--glass-bg)", backdropFilter: "blur(24px)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", maxHeight: 280, overflowY: "auto" }}>
                                        {filteredHsn.map(d => (
                                            <div key={d.hsn} style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                                                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-input)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                onMouseDown={e => { e.preventDefault(); set("hsnCode", d.hsn); set("gstRate", d.gst); setShowHsnMenu(false); }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{d.desc}</span>
                                                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, padding: "3px 6px", borderRadius: 6, color: "#818cf8", background: "rgba(99,102,241,0.1)" }}>{d.hsn}</span>
                                                </div>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>GST Rate: <span style={{ color: Number(d.gst) > 0 ? "#f87171" : "#10b981" }}>{d.gst}%</span></div>
                                            </div>
                                        ))}
                                        {filteredHsn.length === 0 && <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>No matching HSN codes found.</div>}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Category</label>
                                <div style={{ position: "relative" }}>
                                    <select className="input" style={{ appearance: "none", cursor: "pointer" }} value={form.category} onChange={e => set("category", e.target.value)}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Unit</label>
                                <div style={{ position: "relative" }}>
                                    <select className="input" style={{ appearance: "none", cursor: "pointer" }} value={form.unit} onChange={e => set("unit", e.target.value)}>
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>GST Rate (%)</label>
                                <div style={{ position: "relative" }}>
                                    <select className="input" style={{ appearance: "none", cursor: "pointer" }} value={form.gstRate} onChange={e => set("gstRate", e.target.value)}>
                                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                                    </select>
                                    <ChevronDown size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
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
                            {/* Initial Stock — only on create */}
                            {!existing && (
                                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                                        Initial Stock <span style={{ color: "#818cf8", fontWeight: 500, textTransform: "none", fontSize: 10 }}>(optional — set opening stock)</span>
                                    </label>
                                    <input
                                        type="number" min="0" step="1" className="input"
                                        style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                                        value={form.initialStock}
                                        onChange={e => set("initialStock", e.target.value)}
                                        placeholder="0"
                                    />
                                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                                        <span style={{ color: "#818cf8" }}>ℹ</span>
                                        This sets the opening stock once. Manage stock later from the <strong style={{ color: "var(--text)" }}>Stock</strong> page.
                                    </div>
                                </div>
                            )}
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Low Stock Alert Threshold</label>
                                <input type="number" className="input" value={form.lowStockAlert} onChange={e => set("lowStockAlert", e.target.value)} min={0} />
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>You'll see a warning when inventory drops below this number.</div>
                            </div>
                        </div>
                        {+form.sellingPrice > 0 && (
                            <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                                <div><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4 }}>Margin</div><div style={{ fontSize: 16, fontWeight: 900, color: +margin > 0 ? "#10b981" : "#f87171" }}>{margin}%</div></div>
                                <div><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4 }}>GST Amount</div><div style={{ fontSize: 16, fontWeight: 900, color: "#818cf8" }}>₹{(+form.sellingPrice * +form.gstRate / 100).toFixed(2)}</div></div>
                                <div><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4 }}>MRP (inc. GST)</div><div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>₹{(+form.sellingPrice * (1 + +form.gstRate / 100)).toFixed(2)}</div></div>
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
                    ::-webkit-scrollbar { width: 6px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                `}</style>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Import Modal
// ─────────────────────────────────────────────────────────────────────────────
type ImportPhase = "select" | "uploading" | "processing" | "done" | "error";

function ImportModal({ onClose, refetch }: { onClose: () => void; refetch: () => void }) {
    const [phase, setPhase] = useState<ImportPhase>("select");
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [onDuplicate, setOnDuplicate] = useState<"SKIP" | "OVERWRITE">("SKIP");
    const [jobId, setJobId] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const [errMsg, setErrMsg] = useState("");
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const pollingRef = useRef(false);  // guard: only one poll loop at a time

    const [createImportUrl] = useMutation<any, any>(CREATE_PRODUCT_IMPORT_URL);
    const [notifyUploaded] = useMutation<any, any>(NOTIFY_IMPORT_UPLOADED);
    const [fetchJobStatus] = useLazyQuery<any, any>(GET_IMPORT_JOB_STATUS, { fetchPolicy: "network-only" });

    // Cleanup poll timer on unmount
    useEffect(() => () => {
        if (pollRef.current) clearTimeout(pollRef.current);
        pollingRef.current = false;
    }, []);

    const handleFile = (f: File) => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
            setErrMsg("Please select an Excel (.xlsx / .xls) or CSV file.");
            return;
        }
        setErrMsg("");
        setFile(f);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, []);

    const startImport = async () => {
        if (!file || pollingRef.current) return;

        pollingRef.current = true;
        setPhase("uploading");
        setProgress(10);

        try {
            // 1. Get presigned upload URL via Mutation (never cached / auto-refired)
            const { data: urlData } = await createImportUrl({
                variables: { fileName: file.name, onDuplicate },
            });
            const { uploadUrl, importJobId } = urlData.createProductImportUrl;
            setJobId(importJobId);
            setProgress(30);

            // 2. Upload directly to S3 (no GraphQL, no backend)
            // Explicitly set Content-Type to empty so fetch doesn't auto-set it 
            // to something else that wasn't included in the presigned signature.
            const uploadResp = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": "" },
            });
            if (!uploadResp.ok) {
                throw new Error(`S3 upload failed: ${uploadResp.statusText}`);
            }
            setProgress(60);
            setPhase("processing");

            // 3. Notify backend that upload is done — this triggers Lambda via SQS
            await notifyUploaded({ variables: { importJobId } });

            // 4. Poll for job completion
            let attempts = 0;

            const poll = async () => {
                if (!pollingRef.current) return;  // was cancelled (unmount / close)
                attempts++;

                try {
                    const { data: statusData } = await fetchJobStatus({
                        variables: { importJobId },
                    });
                    const job = statusData?.getImportJobStatus;

                    if (job?.status === "DONE") {
                        pollingRef.current = false;
                        setResult(job);
                        setProgress(100);
                        setPhase("done");
                        refetch();
                    } else if (job?.status === "FAILED") {
                        pollingRef.current = false;
                        setErrMsg(job.errorMsg || "Import failed. Check logs for details.");
                        setPhase("error");
                    } else if (attempts < 60) {
                        setProgress(Math.min(95, 60 + attempts * 0.6));
                        pollRef.current = setTimeout(poll, 5000);
                    } else {
                        pollingRef.current = false;
                        setErrMsg("Import is taking too long. Check job status later.");
                        setPhase("error");
                    }
                } catch {
                    // Network hiccup — keep retrying silently
                    if (attempts < 60) pollRef.current = setTimeout(poll, 5000);
                }
            };

            pollRef.current = setTimeout(poll, 5000);

        } catch (e: any) {
            pollingRef.current = false;
            setErrMsg(e.message || "Upload failed");
            setPhase("error");
        }
    };

    const handleClose = () => {
        if (pollRef.current) clearTimeout(pollRef.current);
        pollingRef.current = false;
        onClose();
    };

    // ── Sample template download (generates a real CSV in-browser) ──
    const downloadTemplate = () => {
        const rows = [
            ["Product Name", "SKU", "HSN Code", "Category", "Unit", "Cost Price", "Selling Price", "GST Rate (%)", "Low Stock Alert", "Initial Stock"],
            ["Example Product", "EX-001", "8471", "Electronics", "pcs", "500", "799", "18", "10", "50"],
            ["Basmati Rice 5kg", "RICE-5K", "1006", "Grocery", "pack", "280", "350", "5", "20", "100"],
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "cloudhisaab_products_template.csv";
        a.click(); URL.revokeObjectURL(url);
    };

    const isProcessing = phase === "uploading" || phase === "processing";

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={!isProcessing ? handleClose : undefined}>
            <div style={{ width: "100%", maxWidth: 560, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 24, padding: 32, position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "fadeInScale 0.2s ease" }} onClick={e => e.stopPropagation()}>

                {!isProcessing && (
                    <button onClick={handleClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 8, borderRadius: 8, display: "flex" }}>
                        <X size={18} />
                    </button>
                )}

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#059669,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(16,185,129,0.3)" }}>
                        <FileSpreadsheet size={22} color="#fff" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>Import Products</h2>
                        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Upload any Excel or CSV — we'll map the columns automatically</p>
                    </div>
                </div>

                {/* ── Phase: SELECT ── */}
                {phase === "select" && (
                    <>
                        {/* Drop zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragging || file ? "#10b981" : "rgba(255,255,255,0.1)"}`,
                                borderRadius: 16, padding: "32px 20px", textAlign: "center", cursor: "pointer",
                                background: dragging ? "rgba(16,185,129,0.06)" : file ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
                                transition: "all 0.2s",
                                marginBottom: 16,
                            }}
                        >
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                            {file ? (
                                <>
                                    <FileSpreadsheet size={32} color="#10b981" style={{ margin: "0 auto 10px" }} />
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>{file.name}</div>
                                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{(file.size / 1024).toFixed(1)} KB — click to change</div>
                                </>
                            ) : (
                                <>
                                    <Upload size={32} color="var(--muted)" style={{ margin: "0 auto 10px" }} />
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Drag & drop your file here</div>
                                    <div style={{ fontSize: 12, color: "var(--muted)" }}>or click to browse — .xlsx, .xls, .csv supported</div>
                                </>
                            )}
                        </div>

                        {errMsg && (
                            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#f87171", fontSize: 13 }}>{errMsg}</div>
                        )}

                        {/* Column hint */}
                        <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                            <span style={{ color: "#818cf8", fontWeight: 700 }}>✦ Works with any format.</span> We auto-detect columns like <em>Name, Price, Cost, GST, SKU, HSN, Category, Unit</em>. Only <strong style={{ color: "var(--text)" }}>Name</strong> and <strong style={{ color: "var(--text)" }}>Selling Price</strong> are required.
                        </div>

                        {/* Duplicate handling */}
                        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                            {(["SKIP", "OVERWRITE"] as const).map(opt => (
                                <button key={opt} onClick={() => setOnDuplicate(opt)}
                                    style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${onDuplicate === opt ? "#4f46e5" : "rgba(255,255,255,0.1)"}`, background: onDuplicate === opt ? "rgba(79,70,229,0.15)" : "transparent", color: onDuplicate === opt ? "#818cf8" : "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                                    {opt === "SKIP" ? "⏭ Skip duplicates" : "♻ Overwrite duplicates"}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={downloadTemplate} className="btn btn-ghost" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 13 }}>
                                <Download size={14} /> Template
                            </button>
                            <button onClick={startImport} disabled={!file || isProcessing} className="btn btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", fontSize: 14, fontWeight: 800, opacity: (file && !isProcessing) ? 1 : 0.5 }}>
                                <Upload size={16} /> {isProcessing ? "Processing..." : "Start Import"}
                            </button>
                        </div>
                    </>
                )}

                {/* ── Phase: UPLOADING / PROCESSING ── */}
                {isProcessing && (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(79,70,229,0.12)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                            <Loader2 size={28} color="#818cf8" style={{ animation: "spin 0.9s linear infinite" }} />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
                            {phase === "uploading" ? "Uploading file…" : "Processing products…"}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
                            {phase === "uploading" ? "Sending your file to the cloud" : "Lambda is reading, validating and importing rows"}
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#4f46e5,#10b981)", borderRadius: 99, transition: "width 0.5s ease" }} />
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{Math.round(progress)}%</div>
                    </div>
                )}

                {/* ── Phase: DONE ── */}
                {phase === "done" && result && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <CheckCircle size={28} color="#10b981" />
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>Import Complete!</div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>Your products are now in your catalogue</div>

                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                            {[
                                { label: "Imported", value: result.imported, color: "#10b981" },
                                { label: "Skipped", value: result.skipped, color: "#f59e0b" },
                                { label: "Total Rows", value: result.totalRows, color: "#818cf8" },
                            ].map(s => (
                                <div key={s.label} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 10px" }}>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value ?? 0}</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Errors */}
                        {result.errors?.length > 0 && (
                            <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, textAlign: "left", maxHeight: 180, overflowY: "auto" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                    <AlertTriangle size={13} /> {result.errors.length} row(s) skipped
                                </div>
                                {result.errors.map((e: any, i: number) => (
                                    <div key={i} style={{ fontSize: 11, color: "var(--muted)", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 6, marginBottom: 6 }}>
                                        <span style={{ color: "var(--text)", fontWeight: 600 }}>Row {e.row}</span>
                                        {e.name && <span style={{ color: "var(--muted)" }}> · {e.name}</span>}
                                        <span style={{ color: "#fbbf24" }}> — {e.reason}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button onClick={handleClose} className="btn btn-primary" style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 800 }}>Done</button>
                    </div>
                )}

                {/* ── Phase: ERROR ── */}
                {phase === "error" && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <AlertTriangle size={28} color="#f87171" />
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>Import Failed</div>
                        <div style={{ fontSize: 13, color: "#f87171", marginBottom: 24, padding: "0 12px" }}>{errMsg}</div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={handleClose} className="btn btn-ghost" style={{ flex: 1, padding: "12px" }}>Close</button>
                            <button onClick={() => { setPhase("select"); setFile(null); setErrMsg(""); setProgress(0); }} className="btn btn-primary" style={{ flex: 1, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                                <RefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    </div>
                )}

                <style>{`
                    @keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Products Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [search, setSearch] = useState("");
    const { data, loading, refetch } = useQuery<any, any>(LIST_PRODUCTS, {
        fetchPolicy: "cache-and-network",
        variables: { search: "" },
    });

    // Debounced GraphQL search — fires 300 ms after user stops typing
    const handleSearch = (val: string) => {
        setSearch(val);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            refetch({ search: val.trim() || undefined });
        }, 300);
    };

    const [deleteProduct] = useMutation<any, any>(DELETE_PRODUCT);
    const [modal, setModal] = useState<"add" | "edit" | "import" | null>(null);
    const [editing, setEditing] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const products = data?.listProducts?.items || [];

    const handleDelete = (id: string, name: string) => setDeleteTarget({ id, name });
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
                    <div style={{ display: "flex", gap: 10 }}>
                        <button
                            className="btn btn-ghost"
                            onClick={() => setModal("import")}
                            style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", background: "rgba(16,185,129,0.06)" }}
                        >
                            <FileSpreadsheet size={15} /> Import Excel
                        </button>
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal("add"); }}>
                            <Plus size={16} /> Add Product
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                    <input
                        className="input"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search by name or SKU…"
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                    />
                    {loading && search && (
                        <Loader2 size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", animation: "spin 0.7s linear infinite" }} />
                    )}
                </div>

                {/* Table */}
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Product</th><th>SKU</th><th>HSN</th><th>Category</th>
                                <th>Cost</th><th>Price</th><th>GST</th><th>Margin</th>
                                <th>MRP (incl. GST)</th><th>Stock</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={11}>
                                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
                                            <Loader2 size={32} color="#4f46e5" style={{ animation: "spin 0.7s linear infinite" }} />
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && products.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="text-center py-16">
                                        <Package size={32} style={{ margin: "0 auto 8px", color: "var(--muted)" }} />
                                        <p style={{ color: "var(--muted)" }}>No products yet. Add your first product or import from Excel!</p>
                                    </td>
                                </tr>
                            )}
                            {products.map((p: any) => {
                                const stock = p.currentStock ?? null;
                                const isOut = stock !== null && stock <= 0;
                                const isLow = stock !== null && stock > 0 && stock <= p.lowStockAlert;
                                return (
                                    <tr key={p.productId}>
                                        <td><div style={{ fontWeight: 500, color: "var(--text)" }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{p.unit}</div></td>
                                        <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>{p.sku}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>{p.hsnCode || "—"}</td>
                                        <td><span className="badge badge-indigo">{p.category}</span></td>
                                        <td className="num" style={{ color: "var(--muted)" }}>₹{p.costPrice.toFixed(2)}</td>
                                        <td className="num" style={{ color: "var(--text)", fontWeight: 500 }}>₹{p.sellingPrice.toFixed(2)}</td>
                                        <td className="num" style={{ color: "var(--muted)" }}>{p.gstRate}%</td>
                                        <td className={`num font-semibold ${p.marginPercent > 0 ? "text-green-400" : "text-red-400"}`}>{p.marginPercent.toFixed(1)}%</td>
                                        <td className="num text-indigo-400">₹{p.sellingPriceWithGst.toFixed(2)}</td>
                                        <td className="num">
                                            {stock === null ? (
                                                <span style={{ color: "var(--muted)", fontSize: 11 }}>—</span>
                                            ) : (
                                                <span style={{
                                                    fontWeight: 800, fontSize: 13,
                                                    color: isOut ? "#f87171" : isLow ? "#f59e0b" : "#34d399",
                                                    display: "flex", alignItems: "center", gap: 4,
                                                }}>
                                                    {isOut ? "⚠" : isLow ? "▼" : "✓"} {stock}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button className="btn btn-ghost px-2 py-1.5" onClick={() => { setEditing(p); setModal("edit"); }}><Pencil size={13} /></button>
                                                <button className="btn btn-danger px-2 py-1.5" onClick={() => handleDelete(p.productId, p.name)}><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Modals */}
                {(modal === "add" || modal === "edit") && (
                    <ProductModal onClose={() => setModal(null)} refetch={refetch} existing={modal === "edit" ? editing : null} />
                )}
                {modal === "import" && (
                    <ImportModal onClose={() => setModal(null)} refetch={refetch} />
                )}
            </div>
        </AuthGuard>
    );
}

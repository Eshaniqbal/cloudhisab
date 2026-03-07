"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_PRODUCTS, GET_CUSTOMER_BY_PHONE } from "@/lib/graphql/queries";
import { CREATE_INVOICE } from "@/lib/graphql/mutations";
import {
    Plus, Minus, Trash2, Receipt, Loader2, CheckCircle2,
    Search, X, Printer, ShoppingCart, Tag, Zap, User,
    Phone, CreditCard, IndianRupee, AlertTriangle, Wallet,
    Package, Sparkles,
} from "lucide-react";

const PM = [
    { id: "CASH", label: "Cash", icon: "💵", color: "var(--green)" },
    { id: "UPI", label: "UPI", icon: "📱", color: "var(--indigo-l)" },
    { id: "CARD", label: "Card", icon: "💳", color: "var(--yellow)" },
    { id: "CREDIT", label: "Credit", icon: "📋", color: "var(--red)" },
    { id: "PARTIAL", label: "Partial", icon: "⚡", color: "var(--indigo)" },
];

interface CartItem {
    productId: string; name: string; sku: string;
    sellingPrice: number; costPrice: number; gstRate: number;
    quantity: number; unit: string; stock: number;
}

const fmtN = (n: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Consistent color per product category/initial
const getProductColor = (name: string) => {
    const colors = [
        "linear-gradient(135deg,var(--indigo),var(--indigo-l))",
        "linear-gradient(135deg,var(--green),var(--green))",
        "linear-gradient(135deg,var(--yellow),var(--yellow))",
        "linear-gradient(135deg,var(--red),var(--red))",
        "linear-gradient(135deg,var(--indigo-l),var(--indigo))",
        "linear-gradient(135deg,var(--green),var(--indigo-l))",
    ];
    return colors[name.charCodeAt(0) % colors.length];
};

export default function BillingPage() {
    const { data, loading: prodLoading, refetch: refetchProducts } = useQuery<any, any>(
        LIST_PRODUCTS,
        { fetchPolicy: "cache-and-network", variables: { search: "" } } as any
    );
    const [createInvoice, { loading: invoiceLoading }] = useMutation<any, any>(CREATE_INVOICE);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [customer, setCustomer] = useState({ name: "", phone: "", gstin: "" });
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [amountPaid, setAmountPaid] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [search, setSearch] = useState("");
    const [success, setSuccess] = useState<any>(null);
    const [error, setError] = useState("");
    const [stockAlert, setStockAlert] = useState("");
    const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});  // raw typed value per productId
    const searchRef = useRef<HTMLInputElement>(null);
    const stockAlertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [foundCustomer, setFoundCustomer] = useState<any>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // Debounced GraphQL product search
    const handleSearch = (val: string) => {
        setSearch(val);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        setSearchLoading(true);
        searchDebounce.current = setTimeout(async () => {
            await refetchProducts({ search: val.trim() || undefined });
            setSearchLoading(false);
        }, 250);
    };

    const showStockAlert = (msg: string) => {
        setStockAlert(msg);
        if (stockAlertTimer.current) clearTimeout(stockAlertTimer.current);
        stockAlertTimer.current = setTimeout(() => setStockAlert(""), 2800);
    };

    const [lookupCustomer] = useLazyQuery(GET_CUSTOMER_BY_PHONE, { fetchPolicy: "network-only" } as any);

    // Auto-lookup customer by phone (debounced 600 ms)
    const handlePhoneChange = useCallback((phone: string) => {
        setCustomer(c => ({ ...c, phone }));
        setFoundCustomer(null);
        if (phoneDebounce.current) clearTimeout(phoneDebounce.current);
        const digits = phone.replace(/\D/g, "");
        if (digits.length >= 7) {
            phoneDebounce.current = setTimeout(async () => {
                try {
                    const { data } = await (lookupCustomer as any)({ variables: { phone } });
                    const found = data?.getCustomerByPhone;
                    if (found) {
                        setFoundCustomer(found);
                        // auto-fill name only if user hasn't typed one yet
                        setCustomer(c => ({
                            phone: c.phone,
                            name: c.name.trim() ? c.name : found.name,
                            gstin: c.gstin.trim() ? c.gstin : (found.gstin || ""),
                        }));
                    }
                } catch { /* silent */ }
            }, 600);
        }
    }, [lookupCustomer]);

    const products = data?.listProducts?.items || [];
    const filtered = products.slice(0, search ? 20 : 50);

    useEffect(() => { if (paymentMethod !== "PARTIAL") setAmountPaid(""); }, [paymentMethod]);

    const addToCart = (p: any) => {
        const stock = p.currentStock ?? p.stock ?? 0;
        if (stock <= 0) { showStockAlert(`"${p.name}" is out of stock`); return; }
        setCart(c => {
            const ex = c.find(i => i.productId === p.productId);
            if (ex) {
                if (ex.quantity >= stock) { showStockAlert(`Only ${stock} unit(s) of "${p.name}" available`); return c; }
                return c.map(i => i.productId === p.productId ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...c, { productId: p.productId, name: p.name, sku: p.sku, sellingPrice: p.sellingPrice, costPrice: p.costPrice, gstRate: p.gstRate, unit: p.unit, quantity: 1, stock }];
        });
    };

    const updateQty = (id: string, delta: number) =>
        setCart(c => c.map(i => {
            if (i.productId !== id) return i;
            const next = Math.max(1, +(i.quantity + delta).toFixed(0));
            if (delta > 0 && next > i.stock) { showStockAlert(`Only ${i.stock} unit(s) of "${i.name}" available`); return i; }
            return { ...i, quantity: next };
        }).filter(i => i.quantity > 0));

    const commitQty = (id: string, raw: string) => {
        const val = parseInt(raw, 10);
        setCart(c => c.map(i => {
            if (i.productId !== id) return i;
            if (!raw || isNaN(val) || val < 1) return { ...i, quantity: 1 };
            if (val > i.stock) { showStockAlert(`Only ${i.stock} unit(s) of "${i.name}" available`); return { ...i, quantity: i.stock }; }
            return { ...i, quantity: val };
        }));
        setQtyDraft(d => ({ ...d, [id]: "" }));
    };

    const removeItem = (id: string) => setCart(c => c.filter(i => i.productId !== id));
    const clearCart = () => { setCart([]); setCustomer({ name: "", phone: "", gstin: "" }); setDiscount(0); setNotes(""); setAmountPaid(""); };

    const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
    const totalGst = cart.reduce((s, i) => s + i.sellingPrice * i.gstRate / 100 * i.quantity, 0);
    const totalAmount = Math.max(0, subtotal + totalGst - discount);
    const totalProfit = cart.reduce((s, i) => s + (i.sellingPrice - i.costPrice) * i.quantity, 0);
    const paidNum = paymentMethod === "PARTIAL" && amountPaid !== "" ? Math.min(+amountPaid || 0, totalAmount) : totalAmount;
    const balanceDue = Math.max(0, totalAmount - paidNum);

    const submitInvoice = async () => {
        setError("");
        if (!customer.name.trim()) { setError("Customer name is required"); return; }
        if (cart.length === 0) { setError("Add at least one product"); return; }
        if (paymentMethod === "PARTIAL" && !customer.phone) { setError("Phone required for partial payment (for ledger tracking)"); return; }
        try {
            const { data } = await createInvoice({
                variables: {
                    input: {
                        customerName: customer.name,
                        customerPhone: customer.phone || null,
                        customerGstin: customer.gstin || null,
                        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, sellingPrice: i.sellingPrice })),
                        discountAmount: discount,
                        paymentMethod,
                        notes: notes || null,
                        amountPaid: paymentMethod === "PARTIAL" ? paidNum : null,
                    },
                },
            } as any) as any;
            setSuccess(data.createInvoice);
            clearCart();
        } catch (e: any) {
            setError(e.message || "Failed to create invoice");
        }
    };

    /* ── Success screen ──────────────────────────────────── */
    if (success) {
        const hasBal = success.balanceDue > 0;
        return (
            <AuthGuard>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 24 }}>
                    <div style={{
                        width: 88, height: 88, borderRadius: 26,
                        background: hasBal ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#10b981,#34d399)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: `0 12px 40px ${hasBal ? "rgba(245,158,11,0.45)" : "rgba(16,185,129,0.45)"}`,
                    }}>
                        <CheckCircle2 size={44} color="#fff" strokeWidth={2.5} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <h2 style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>Invoice Created!</h2>
                        <div style={{ display: "inline-block", marginTop: 8, padding: "5px 16px", background: "rgba(99,102,241,0.12)", borderRadius: 20, fontSize: 13, fontWeight: 700, color: "#818cf8", letterSpacing: "0.3px" }}>
                            # {success.invoiceNumber}
                        </div>
                    </div>
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 22, padding: "24px 36px", minWidth: 360, display: "flex", flexDirection: "column", gap: 0 }}>
                        {[
                            { label: "Invoice Total", val: `₹${fmtN(success.totalAmount)}`, color: "var(--text)", size: 24, bold: true },
                            { label: "Paid Now", val: `₹${fmtN(success.amountPaid)}`, color: "#10b981", size: 15, bold: false },
                            { label: "Balance Due", val: `₹${fmtN(success.balanceDue)}`, color: hasBal ? "#f87171" : "#10b981", size: 15, bold: false },
                            { label: "GST Collected", val: `₹${fmtN(success.totalGst)}`, color: "#818cf8", size: 13, bold: false },
                        ].map((row, i) => (
                            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                                <span style={{ fontSize: 13, color: "var(--muted)" }}>{row.label}</span>
                                <span style={{ fontSize: row.size, fontWeight: row.bold ? 900 : 700, color: row.color, fontVariantNumeric: "tabular-nums" }}>{row.val}</span>
                            </div>
                        ))}
                    </div>
                    {hasBal && (
                        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 12, padding: "11px 18px", display: "flex", gap: 10, alignItems: "center", maxWidth: 360 }}>
                            <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#fbbf24" }}>₹{fmtN(success.balanceDue)} balance recorded in customer ledger</span>
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 10 }}>
                        <button className="btn btn-ghost" onClick={() => setSuccess(null)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 22px", fontSize: 13, fontWeight: 700 }}>
                            <Plus size={14} /> New Invoice
                        </button>
                        <a href={`/billing/${success.saleId}`} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 22px", fontSize: 13, fontWeight: 700 }}>
                            <Printer size={14} /> View &amp; Print
                        </a>
                    </div>
                </div>
            </AuthGuard>
        );
    }

    /* ── Main POS layout ─────────────────────────────────── */
    return (
        <AuthGuard>
            {/* Stock Alert Toast */}
            {stockAlert && (
                <div style={{
                    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
                    zIndex: 9999, background: "rgba(239,68,68,0.95)", color: "#fff",
                    padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                    boxShadow: "0 8px 30px rgba(239,68,68,0.4)",
                    display: "flex", alignItems: "center", gap: 8,
                    animation: "slideDown 0.2s ease",
                }}>
                    <AlertTriangle size={14} /> {stockAlert}
                </div>
            )}
            <div style={{ display: "flex", gap: 14, height: "calc(100vh - 64px)", overflow: "hidden" }}>

                {/* ══════════════════════════════════════════════
                    LEFT — Products (top) + Cart slides in at bottom
                ══════════════════════════════════════════════ */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, gap: 10 }}>

                    {/* ── Products section header ── */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <Package size={14} color="#818cf8" />
                            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>Products</span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--muted)", background: "var(--bg-input)", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
                            {products.length}
                        </span>
                    </div>

                    {/* ── Search ── */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                        <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                        <input ref={searchRef} className="input"
                            style={{ paddingLeft: 30, paddingRight: search ? 28 : 10, fontSize: 12, height: 36 }}
                            placeholder="Search products by name or SKU…"
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                            autoComplete="off" />
                        {searchLoading && (
                            <Loader2 size={11} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", animation: "spin 0.7s linear infinite" }} />
                        )}
                        {search && !searchLoading && (
                            <button onClick={() => handleSearch("")}
                                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                                <X size={11} />
                            </button>
                        )}
                    </div>

                    {/* ── Product list (flex:1 — fills remaining space, single column) ── */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                        {prodLoading && (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
                                <Loader2 size={32} color="#4f46e5" style={{ animation: "spin 0.7s linear infinite" }} />
                            </div>
                        )}
                        {filtered.map((p: any) => {
                            const inCart = cart.find(c => c.productId === p.productId);
                            const stock = p.currentStock ?? p.stock ?? 0;
                            const outOfStock = stock <= 0;
                            return (
                                <button key={p.productId} onClick={() => addToCart(p)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 12,
                                        background: outOfStock ? "rgba(239,68,68,0.03)" : inCart ? "rgba(79,70,229,0.05)" : "var(--bg-card)",
                                        border: outOfStock ? "1px solid rgba(239,68,68,0.2)" : inCart ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--border)",
                                        borderRadius: 11, padding: "10px 13px", cursor: outOfStock ? "not-allowed" : "pointer",
                                        textAlign: "left", width: "100%", transition: "all 0.12s",
                                        flexShrink: 0, opacity: outOfStock ? 0.65 : 1,
                                    }}
                                    onMouseEnter={e => {
                                        const b = e.currentTarget as HTMLButtonElement;
                                        b.style.borderColor = "rgba(99,102,241,0.5)";
                                        b.style.background = "rgba(79,70,229,0.08)";
                                        b.style.transform = "translateX(3px)";
                                    }}
                                    onMouseLeave={e => {
                                        const b = e.currentTarget as HTMLButtonElement;
                                        b.style.borderColor = inCart ? "rgba(99,102,241,0.3)" : "var(--border)";
                                        b.style.background = inCart ? "rgba(79,70,229,0.05)" : "var(--bg-card)";
                                        b.style.transform = "translateX(0)";
                                    }}
                                >
                                    {/* Gradient avatar */}
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                        background: getProductColor(p.name),
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 14, fontWeight: 900, color: "#fff",
                                        boxShadow: `0 3px 10px ${getProductColor(p.name).match(/#[a-f0-9]{6}/i)?.[0] ?? "#4f46e5"}33`,
                                    }}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Name + SKU */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {p.name}
                                        </div>
                                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1, fontFamily: "monospace" }}>{p.sku}</div>
                                    </div>

                                    {/* Price + GST + stock */}
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 900, color: "#818cf8", fontVariantNumeric: "tabular-nums" }}>
                                            ₹{fmtN(p.sellingPrice)}
                                        </div>
                                        <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}>
                                            {p.gstRate > 0 ? `+${p.gstRate}% GST` : p.unit}
                                        </div>
                                        {/* Stock indicator */}
                                        {(() => {
                                            const s = p.currentStock ?? p.stock ?? 0;
                                            if (s <= 0) return <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, marginTop: 2 }}>Out of stock</div>;
                                            if (s <= 5) return <div style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700, marginTop: 2 }}>Stock: {s}</div>;
                                            return <div style={{ fontSize: 9, color: "#34d399", marginTop: 2 }}>Stock: {s}</div>;
                                        })()}
                                    </div>

                                    {/* In-cart qty badge / out-of-stock */}
                                    {outOfStock ? (
                                        <div style={{
                                            fontSize: 9, fontWeight: 700, color: "#f87171",
                                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                                            borderRadius: 8, padding: "2px 7px", whiteSpace: "nowrap",
                                        }}>No stock</div>
                                    ) : inCart ? (
                                        <div style={{
                                            width: 22, height: 22, borderRadius: 22, flexShrink: 0,
                                            background: "linear-gradient(135deg,#10b981,#34d399)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 10, fontWeight: 900, color: "#fff",
                                            boxShadow: "0 2px 8px rgba(16,185,129,0.4)",
                                        }}>
                                            {inCart.quantity}
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: 22, height: 22, borderRadius: 22, flexShrink: 0,
                                            background: "rgba(79,70,229,0.1)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            color: "#818cf8",
                                        }}>
                                            <Plus size={11} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                        {!prodLoading && filtered.length === 0 && (
                            <div style={{ padding: "40px 0", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
                                No results for "{search}"
                            </div>
                        )}
                    </div>

                    {/* ── CART — hidden when empty, slides in at bottom ── */}
                    <div style={{
                        flexShrink: 0,
                        maxHeight: cart.length > 0 ? "300px" : "0px",
                        overflow: "hidden",
                        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
                    }}>
                        <div style={{
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: 14, overflow: "hidden",
                        }}>
                            {/* Cart header */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <ShoppingCart size={12} color="#fff" />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>Cart</span>
                                    <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>
                                        {cart.length} item{cart.length !== 1 ? "s" : ""} · {cart.reduce((s, i) => s + i.quantity, 0)} units
                                    </span>
                                </div>
                                <button onClick={clearCart} style={{
                                    background: "none", border: "1px solid var(--border)", borderRadius: 7,
                                    padding: "4px 9px", fontSize: 11, fontWeight: 700, color: "var(--muted)",
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: 3, transition: "all 0.12s",
                                }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
                                >
                                    <X size={10} /> Clear
                                </button>
                            </div>

                            <div style={{ maxHeight: 220, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                                {cart.map((item, idx) => {
                                    const gstAmt = item.sellingPrice * item.gstRate / 100 * item.quantity;
                                    const lineTotal = (item.sellingPrice + item.sellingPrice * item.gstRate / 100) * item.quantity;
                                    const stockLeft = item.stock - item.quantity;
                                    return (
                                        <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-input)", borderRadius: 10 }}>
                                            <span style={{ fontSize: 10, fontWeight: 900, color: "#818cf8", minWidth: 16, textAlign: "center" }}>{idx + 1}</span>
                                            <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: getProductColor(item.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff" }}>
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                                <div style={{ fontSize: 10, color: "var(--muted)" }}>₹{fmtN(item.sellingPrice)}/{item.unit}</div>
                                                {/* Remaining stock */}
                                                <div style={{ fontSize: 9, marginTop: 1, fontWeight: 700, color: stockLeft <= 0 ? "#f87171" : stockLeft <= 3 ? "#f59e0b" : "#34d399" }}>
                                                    {stockLeft <= 0 ? "⚠ Max stock reached" : `${stockLeft} left in stock`}
                                                </div>
                                            </div>
                                            {/* Qty controls — with direct input */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                                <button onClick={() => updateQty(item.productId, -1)} style={{ width: 22, height: 22, borderRadius: 6, background: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={10} /></button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={item.stock}
                                                    value={qtyDraft[item.productId] !== undefined && qtyDraft[item.productId] !== ""
                                                        ? qtyDraft[item.productId]
                                                        : item.quantity}
                                                    onChange={e => setQtyDraft(d => ({ ...d, [item.productId]: e.target.value }))}
                                                    onBlur={e => commitQty(item.productId, e.target.value)}
                                                    onKeyDown={e => { if (e.key === "Enter") commitQty(item.productId, (e.target as HTMLInputElement).value); }}
                                                    style={{
                                                        width: 44, height: 22, borderRadius: 6,
                                                        border: "1px solid var(--border)",
                                                        background: "var(--bg-card)",
                                                        color: "var(--text)",
                                                        fontWeight: 900, fontSize: 12,
                                                        textAlign: "center",
                                                        fontVariantNumeric: "tabular-nums",
                                                        padding: 0,
                                                    }}
                                                />
                                                <button onClick={() => updateQty(item.productId, 1)} style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(79,70,229,0.12)", border: "1px solid rgba(79,70,229,0.2)", cursor: "pointer", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={10} /></button>
                                            </div>
                                            <div style={{ textAlign: "right", flexShrink: 0, minWidth: 72 }}>
                                                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>₹{fmtN(lineTotal)}</div>
                                                {item.gstRate > 0 && <div style={{ fontSize: 9, color: "#818cf8" }}>GST ₹{fmtN(gstAmt)}</div>}
                                            </div>
                                            <button onClick={() => removeItem(item.productId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", opacity: 0.55, display: "flex", padding: 4, borderRadius: 5, transition: "opacity 0.12s" }}
                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.55"}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>


                {/* ═══════════════════════════════════════
                    COL 3 — Invoice panel (330px)
                ═══════════════════════════════════════ */}
                <div style={{ width: 330, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>

                    {/* Panel header */}
                    <div style={{
                        background: "linear-gradient(135deg,rgba(79,70,229,0.12),rgba(99,102,241,0.06))",
                        border: "1px solid rgba(99,102,241,0.2)",
                        borderRadius: 14, padding: "12px 16px",
                        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Receipt size={13} color="#fff" />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>Invoice Summary</span>
                        </div>
                        <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 700 }}>New Invoice</span>
                    </div>

                    {/* Customer */}
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <User size={11} color="#a5b4fc" />
                                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Customer</span>
                            </div>
                            {foundCustomer && (
                                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", padding: "2px 8px", borderRadius: 20 }}>
                                    <CheckCircle2 size={9} /> Found — {foundCustomer.invoiceCount} invoice{foundCustomer.invoiceCount !== 1 ? "s" : ""}
                                </div>
                            )}
                        </div>

                        {/* Outstanding warning */}
                        {foundCustomer && foundCustomer.outstanding > 0 && (
                            <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, color: "var(--muted)" }}>Outstanding balance</span>
                                <span style={{ fontSize: 13, fontWeight: 900, color: "#f87171", fontVariantNumeric: "tabular-nums" }}>₹{fmtN(foundCustomer.outstanding)}</span>
                            </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                            <input className="input" style={{ fontSize: 13 }} placeholder="Customer name *"
                                value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                                <div style={{ position: "relative" }}>
                                    <Phone size={10} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: foundCustomer ? "#10b981" : "var(--muted)", pointerEvents: "none" }} />
                                    <input className="input"
                                        style={{ fontSize: 12, paddingLeft: 26, borderColor: foundCustomer ? "rgba(16,185,129,0.4)" : undefined }}
                                        placeholder="Phone" type="tel"
                                        value={customer.phone}
                                        onChange={e => handlePhoneChange(e.target.value)} />
                                </div>
                                <div style={{ position: "relative" }}>
                                    <CreditCard size={10} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                                    <input className="input" style={{ fontSize: 12, paddingLeft: 26 }} placeholder="GSTIN" maxLength={15}
                                        value={customer.gstin} onChange={e => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Totals */}
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", flexShrink: 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span style={{ color: "var(--muted)" }}>Subtotal (ex-GST)</span>
                                <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>₹{fmtN(subtotal)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span style={{ color: "var(--muted)" }}>GST</span>
                                <span style={{ color: "#818cf8", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>₹{fmtN(totalGst)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                                <span style={{ color: "var(--muted)" }}>Discount (₹)</span>
                                <input type="number" min={0} className="input"
                                    style={{ width: 80, textAlign: "right", fontSize: 12, padding: "4px 8px" }}
                                    value={discount} onChange={e => setDiscount(Math.max(0, +e.target.value))} />
                            </div>
                            {/* Grand total */}
                            <div style={{
                                marginTop: 2, padding: "12px 14px", borderRadius: 11,
                                background: "linear-gradient(135deg,rgba(79,70,229,0.12),rgba(99,102,241,0.06))",
                                border: "1px solid rgba(99,102,241,0.2)",
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                            }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>Total</span>
                                <span style={{ fontSize: 22, fontWeight: 900, color: "#818cf8", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
                                    ₹{fmtN(totalAmount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 11 }}>
                            <IndianRupee size={11} color="#a5b4fc" />
                            <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Payment Method</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            {PM.map(m => {
                                const active = paymentMethod === m.id;
                                return (
                                    <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                                        style={{
                                            padding: "9px 6px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                                            border: active ? `1.5px solid ${m.color}40` : "1px solid var(--border)",
                                            background: active ? `${m.color}18` : "var(--bg-input)",
                                            color: active ? m.color : "var(--muted)",
                                            cursor: "pointer", transition: "all 0.15s",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                                        }}>
                                        <span style={{ fontSize: 14 }}>{m.icon}</span> {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Partial fields */}
                        {paymentMethod === "PARTIAL" && (
                            <div style={{ marginTop: 11, padding: "11px 12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 10 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#f87171", marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}>
                                    <Wallet size={10} /> Partial Payment — balance goes to customer ledger
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 7 }}>
                                    <span style={{ color: "var(--muted)" }}>Paying now (₹)</span>
                                    <input type="number" min={0} max={totalAmount} className="input"
                                        style={{ width: 110, textAlign: "right", fontSize: 13, padding: "5px 8px", fontWeight: 700 }}
                                        placeholder="0.00"
                                        value={amountPaid}
                                        onChange={e => setAmountPaid(e.target.value)} />
                                </div>
                                {amountPaid !== "" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(248,113,113,0.15)" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                            <span style={{ color: "var(--muted)" }}>Paid now</span>
                                            <span style={{ color: "#10b981", fontWeight: 700 }}>₹{fmtN(paidNum)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                            <span style={{ color: "#f87171", fontWeight: 700 }}>Balance due</span>
                                            <span style={{ color: "#f87171", fontWeight: 900 }}>₹{fmtN(balanceDue)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <textarea className="input"
                        style={{ fontSize: 12, resize: "none", height: 52, borderRadius: 12, flexShrink: 0 }}
                        placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: 10, padding: "9px 14px", color: "#f87171", fontSize: 12, fontWeight: 500, flexShrink: 0,
                        }}>
                            {error}
                        </div>
                    )}

                    {/* CTA */}
                    <button className="btn btn-primary" onClick={submitInvoice}
                        disabled={invoiceLoading || cart.length === 0}
                        style={{
                            width: "100%", padding: "14px", fontSize: 14, fontWeight: 800,
                            display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
                            borderRadius: 14, letterSpacing: "0.2px", flexShrink: 0,
                            opacity: cart.length === 0 ? 0.55 : 1,
                            boxShadow: cart.length > 0 ? "0 4px 20px rgba(79,70,229,0.3)" : "none",
                            transition: "all 0.2s",
                        }}>
                        {invoiceLoading
                            ? <><Loader2 size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Creating…</>
                            : <><Zap size={15} />
                                {totalAmount > 0
                                    ? `Create Invoice · ₹${fmtN(paymentMethod === "PARTIAL" && amountPaid !== "" ? paidNum : totalAmount)}`
                                    : "Create Invoice"
                                }
                            </>
                        }
                    </button>
                </div>
            </div>
        </AuthGuard>
    );
}

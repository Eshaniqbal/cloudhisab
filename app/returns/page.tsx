"use client";
import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_RETURNS, GET_INVOICE, SEARCH_INVOICES, GET_CUSTOMER_BY_PHONE } from "@/lib/graphql/queries";
import { CREATE_RETURN } from "@/lib/graphql/mutations";
import {
    RotateCcw, Plus, X, Loader2, FileText, Search,
    Package, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft,
    Printer, Phone, Hash, ArrowLeft, RefreshCw, Banknote,
    Tag, User, Calendar, IndianRupee, ClipboardList,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    "₹" + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const REASONS = [
    { key: "DAMAGED", label: "Damaged Goods", color: "#ef4444" },
    { key: "WRONG_ITEM", label: "Wrong Item", color: "#f59e0b" },
    { key: "QUALITY", label: "Quality Issue", color: "#8b5cf6" },
    { key: "OTHER", label: "Other", color: "#64748b" },
];

const REASON_COLOR: Record<string, string> = {
    DAMAGED: "#ef4444", WRONG_ITEM: "#f59e0b", QUALITY: "#8b5cf6", OTHER: "#64748b",
};

const REFUND_LABELS: Record<string, string> = {
    CREDIT_NOTE: "Credit Note",
    CASH_REFUND: "Cash Refund",
};

// ─── Step indicator ──────────────────────────────────────────────────────────
function Steps({ current }: { current: number }) {
    const steps = ["Find Invoice", "Select Items", "Confirm"];
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
            {steps.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: done ? "var(--green)" : active ? "var(--indigo)" : "var(--bg-card2)",
                                border: `2px solid ${done ? "var(--green)" : active ? "var(--indigo)" : "var(--border)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, color: done || active ? "#fff" : "var(--muted)",
                                transition: "all 0.3s",
                                boxShadow: active ? "0 0 0 4px rgba(79,70,229,0.15)" : "none",
                            }}>
                                {done ? <CheckCircle2 size={13} /> : i + 1}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "var(--text)" : "var(--muted)", transition: "color 0.3s" }}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: 2, margin: "0 12px", background: done ? "var(--green)" : "var(--border)", transition: "background 0.4s", borderRadius: 2 }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Create Return Workspace ─────────────────────────────────────────────────
function CreateReturnModal({ onClose, refetch }: { onClose: () => void; refetch: () => void }) {
    const searchParams = useSearchParams();
    const invoiceIdParam = searchParams.get("invoiceId");

    const [step, setStep] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [reason, setReason] = useState("DAMAGED");
    const [refundType, setRefundType] = useState("CREDIT_NOTE");
    const [restock, setRestock] = useState(true);
    const [notes, setNotes] = useState("");
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const [invoice, setInvoice] = useState<any>(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
    const [selectedCustomerKey, setSelectedCustomerKey] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<any>(null);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;
    const debounceRef = useRef<any>(null);
    const customerListRef = useRef<HTMLDivElement | null>(null);

    const { data: searchData, loading: searching, refetch: refetchInvoices } = useQuery<any>(SEARCH_INVOICES, {
        variables: {
            query: debouncedSearchQuery || "",
            limit: debouncedSearchQuery ? 60 : 80,
        },
        fetchPolicy: "cache-and-network",
        nextFetchPolicy: "cache-first",
    });
    const [fetchInvoice, { loading: loadingInv }] = useLazyQuery<any>(GET_INVOICE);
    const [fetchCustomer, { data: customerData }] = useLazyQuery<any>(GET_CUSTOMER_BY_PHONE);
    const [createReturn, { loading: creating }] = useMutation<any, any>(CREATE_RETURN);

    const suggestions = searchData?.searchInvoices?.items || [];
    const rankedSuggestions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return suggestions;

        const norm = (v: any) => String(v || "").toLowerCase();
        const score = (sug: any) => {
            const invoiceNo = norm(sug.invoiceNumber);
            const customer = norm(sug.customerName);
            const phone = norm(sug.customerPhone).replace(/\D/g, "");
            const qDigits = q.replace(/\D/g, "");

            let rank = 0;
            if (invoiceNo === q) rank += 120;
            else if (invoiceNo.startsWith(q)) rank += 90;
            else if (invoiceNo.includes(q)) rank += 55;

            if (customer.startsWith(q)) rank += 45;
            else if (customer.includes(q)) rank += 25;

            if (qDigits) {
                if (phone.startsWith(qDigits)) rank += 40;
                else if (phone.includes(qDigits)) rank += 20;
            }

            return rank;
        };

        return [...suggestions].sort((a, b) => score(b) - score(a));
    }, [suggestions, searchQuery]);
    const groupedCustomers = useMemo(() => {
        const groups = new Map<string, any>();
        rankedSuggestions.forEach((inv: any) => {
            const key = inv.customerPhone || inv.customerName || inv.saleId;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    customerName: inv.customerName || "Walk-in customer",
                    customerPhone: inv.customerPhone || "—",
                    invoices: [],
                    latestAt: inv.createdAt,
                });
            }
            const g = groups.get(key);
            g.invoices.push(inv);
            if (new Date(inv.createdAt).getTime() > new Date(g.latestAt).getTime()) g.latestAt = inv.createdAt;
        });
        return Array.from(groups.values())
            .map(g => ({
                ...g,
                invoices: g.invoices.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            }))
            .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
    }, [rankedSuggestions]);
    const totalPages = Math.max(1, Math.ceil(groupedCustomers.length / itemsPerPage));
    const visibleCustomers = useMemo(
        () => groupedCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
        [groupedCustomers, currentPage],
    );
    const hasSearchText = searchQuery.trim().length > 0;
    const isSearching = hasSearchText && searching;
    const isLoadingCustomers = searching;

    // Auto-fetch selected invoice when invoiceId is present.
    useEffect(() => {
        if (invoiceIdParam) {
            handleSelectSuggestion({ saleId: invoiceIdParam }, true);
        }
    }, [invoiceIdParam]);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setDebouncedSearchQuery("");
            return;
        }
        if (trimmed.length < 3) return;
        debounceRef.current = setTimeout(() => {
            setDebouncedSearchQuery(trimmed);
        }, 450);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchQuery]);

    useEffect(() => {
        if (!groupedCustomers.length) return;
        if (selectedCustomerKey && !groupedCustomers.some((c: any) => c.key === selectedCustomerKey)) {
            setSelectedCustomerKey("");
        }
    }, [groupedCustomers, selectedCustomerKey]);
    useEffect(() => {
        setCurrentPage(1);
        if (customerListRef.current) customerListRef.current.scrollTop = 0;
    }, [searchQuery]);

    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        setInvoice(null);
        setSelectedSuggestion(null);
        setSelectedCustomerKey("");
        if (!val.trim()) {
            setDebouncedSearchQuery("");
            refetchInvoices({ query: "", limit: 80 });
        }
    };

    const handleSelectSuggestion = async (sug: any, goNext = false) => {
        setError("");
        setSelectedSuggestion(sug);
        const r = await fetchInvoice({ variables: { saleId: sug.saleId } });
        if (!r.data?.getInvoice) { setError("Could not load invoice details."); return; }
        const init: Record<string, number> = {};
        r.data.getInvoice.items.forEach((it: any) => { init[it.productId] = 0; });
        setSelectedItems(init);
        setInvoice(r.data.getInvoice);
        
        if (r.data.getInvoice.customerPhone) {
            fetchCustomer({ variables: { phone: r.data.getInvoice.customerPhone } });
        }
        
        if (goNext) setStep(1);
    };

    const totalSelected = invoice?.items?.reduce((s: number, it: any) =>
        s + (it.sellingPrice || 0) * (selectedItems[it.productId] || 0), 0) || 0;
    const totalGst = invoice?.gstExempt ? 0 : (invoice?.items?.reduce((s: number, it: any) =>
        s + (it.gstRate / 100) * (it.sellingPrice || 0) * (selectedItems[it.productId] || 0), 0) || 0);
    const itemsSelected = Object.values(selectedItems).some(v => v > 0);

    const customerOutstanding = customerData?.getCustomerByPhone?.outstanding || 0;
    const hasPending = customerOutstanding > 0;

    useEffect(() => {
        if (invoice) {
            setRefundType(hasPending ? "CREDIT_NOTE" : "CASH_REFUND");
        }
    }, [invoice, hasPending]);

    const handleSubmit = async () => {
        setError("");
        const items = invoice.items
            .filter((it: any) => (selectedItems[it.productId] || 0) > 0)
            .map((it: any) => ({
                productId: it.productId, productName: it.productName,
                quantity: selectedItems[it.productId], sellingPrice: it.sellingPrice, gstRate: it.gstRate,
            }));
        if (!items.length) { setError("Select at least one item to return."); return; }
        try {
            const res = await createReturn({
                variables: { input: { originalInvoiceId: invoice.saleId, items, reason, refundType, restock, notes: notes || null } },
            } as any);
            setSuccess(res.data?.createReturn);
            refetch();
        } catch (e: any) { setError(e.message); }
    };

    // ── Success screen ───────────────────────────────────────────────────────
    if (success) return (
        <ModalShell onClose={onClose} maxWidth={900} inline>
            <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
                {/* Animated checkmark */}
                <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 20px" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(16,185,129,0.12)", animation: "pulse 2s infinite" }} />
                    <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "rgba(16,185,129,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={34} color="var(--green)" />
                    </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, letterSpacing: "-0.3px" }}>Return Processed!</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
                    {success.refundType === "CREDIT_NOTE" 
                        ? "Amount has been adjusted against pending balance."
                        : "Cash refund has been processed."}
                </div>

                {/* CN card */}
                <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f87171", marginBottom: 8 }}>Credit Note</div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: "var(--text)", letterSpacing: "0.05em", marginBottom: 16 }}>{success.creditNoteNumber}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[
                            { label: "Customer", value: success.customerName },
                            { label: "Refund Type", value: REFUND_LABELS[success.refundType] },
                        ].map(item => (
                            <div key={item.label} style={{ textAlign: "left" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 4 }}>{item.label}</div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ borderTop: "1px solid rgba(239,68,68,0.15)", marginTop: 14, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>Total Refund Amount</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: "#ef4444" }}>{fmt(success.totalAmount)}</span>
                    </div>
                </div>
                <button className="btn btn-primary" style={{ width: "100%", height: 44, fontSize: 14 }} onClick={onClose}>Done</button>
            </div>
        </ModalShell>
    );

    return (
        <ModalShell onClose={onClose} maxWidth={1100} inline>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.2px" }}>Return Management</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Process returns in a full page view with invoice, items, and refund details.</div>
                </div>
                <button className="btn btn-ghost" onClick={onClose}>Back to list</button>
            </div>
            <Steps current={step} />

            {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 12, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", fontSize: 13, marginBottom: 20 }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}
                </div>
            )}

            {/* ── Step 0: Search ───────────────────────────────────────── */}
            {step === 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, alignItems: "stretch", flex: 1, minHeight: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, letterSpacing: "-0.2px" }}>Customer Return Dashboard</div>
                            <div style={{ fontSize: 13, color: "var(--muted)" }}>Search invoices by customer name, phone, or invoice number and select the one for return.</div>
                            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Type at least 3 characters for live search.</div>
                        </div>

                        <div style={{ position: "relative" }}>
                            <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: isSearching ? "var(--indigo-l)" : "var(--muted)", pointerEvents: "none", transition: "color 0.2s" }} />
                            <input
                                className="input"
                                style={{ paddingLeft: 40, paddingRight: 40, height: 48, fontSize: 14 }}
                                placeholder="Type phone, customer, or invoice number..."
                                value={searchQuery}
                                onChange={e => handleSearchChange(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && groupedCustomers.length > 0) {
                                        e.preventDefault();
                                        const firstCustomer = groupedCustomers[0];
                                        setSelectedCustomerKey(firstCustomer.key);
                                    }
                                }}
                                autoFocus autoComplete="off"
                            />
                            {searchQuery.trim() && !isSearching && (
                                <button
                                    type="button"
                                    onClick={() => handleSearchChange("")}
                                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card2)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                    aria-label="Clear search"
                                >
                                    <X size={12} />
                                </button>
                            )}
                            {isSearching && <Loader2 size={14} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: "var(--indigo-l)", animation: "spin 0.7s linear infinite" }} />}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 4px" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
                                {searchQuery.trim() ? "Matching Customers" : "Recent Customers"}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{groupedCustomers.length} customers</div>
                        </div>

                        <div
                            ref={customerListRef}
                            style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto", paddingRight: 6 }}
                        >
                            {groupedCustomers.length > 0 ? visibleCustomers.map((cx: any) => {
                                const isCustomerOpen = selectedCustomerKey === cx.key;
                                return (
                                    <div key={cx.key} style={{ border: `1px solid ${isCustomerOpen ? "rgba(79,70,229,0.45)" : "var(--border)"}`, borderRadius: 12, background: isCustomerOpen ? "rgba(79,70,229,0.05)" : "var(--bg-card2)", overflow: "hidden" }}>
                                        <div
                                            onClick={() => {
                                                if (selectedCustomerKey === cx.key) {
                                                    setSelectedCustomerKey("");
                                                } else {
                                                    setSelectedCustomerKey(cx.key);
                                                    setInvoice(null);
                                                    setSelectedSuggestion(null);
                                                }
                                            }}
                                            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", minHeight: 72, cursor: "pointer" }}
                                        >
                                            <div style={{ width: 38, height: 38, borderRadius: 10, background: isCustomerOpen ? "rgba(79,70,229,0.12)" : "rgba(239,68,68,0.12)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <User size={16} color={isCustomerOpen ? "var(--indigo-l)" : "#ef4444"} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 900, color: isCustomerOpen ? "var(--indigo-l)" : "#ef4444" }}>{cx.customerName}</span>
                                                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{cx.invoices.length} invoices</span>
                                                </div>
                                                <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--muted)", flexWrap: "wrap" }}>
                                                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={11} />{cx.customerPhone}</span>
                                                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={11} />Latest {fmtDate(cx.latestAt)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {isCustomerOpen && (
                                            <div style={{ borderTop: "1px solid var(--border)", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 7, maxHeight: 320, overflowY: "auto" }}>
                                                {cx.invoices.map((sug: any) => {
                                                    const activeInvoice = (selectedSuggestion?.saleId || invoice?.saleId) === sug.saleId;
                                                    return (
                                                        <div
                                                            key={sug.saleId}
                                                            onClick={() => handleSelectSuggestion(sug, false)}
                                                            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", borderRadius: 9, border: `1px solid ${activeInvoice ? "rgba(79,70,229,0.55)" : "var(--border)"}`, background: activeInvoice ? "rgba(79,70,229,0.10)" : "var(--bg-card)", padding: "9px 10px", cursor: "pointer" }}
                                                        >
                                                            <FileText size={13} color={activeInvoice ? "var(--indigo-l)" : "#ef4444"} />
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2, flexWrap: "wrap" }}>
                                                                    <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 900, color: activeInvoice ? "var(--indigo-l)" : "var(--text)" }}>{sug.invoiceNumber}</span>
                                                                    {sug.returns?.length > 0 && (
                                                                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", padding: "1px 5px", borderRadius: 4, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--orange)" }}>Returned</span>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(sug.createdAt)}</div>
                                                            </div>
                                                            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--green)" }}>{fmt(sug.totalAmount)}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : !isLoadingCustomers ? (
                                <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, background: "var(--bg-card2)", borderRadius: 14, border: "1px dashed var(--border)" }}>
                                    No customers found{searchQuery.trim() ? ` for "${searchQuery}"` : ""}
                                </div>
                            ) : (
                                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                                    <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite", marginBottom: 8 }} />
                                    <div>Loading customers...</div>
                                </div>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--border)", marginTop: 4 }}>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1, color: "var(--text)" }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        // Show first, last, current, and pages around current
                                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${currentPage === pageNum ? "var(--indigo-l)" : "var(--border)"}`,
                                                        background: currentPage === pageNum ? "rgba(79,70,229,0.1)" : "var(--bg-card2)",
                                                        color: currentPage === pageNum ? "var(--indigo-l)" : "var(--text)",
                                                        fontSize: 12, fontWeight: currentPage === pageNum ? 800 : 500, cursor: "pointer", transition: "all 0.2s"
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        }
                                        if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                            return <span key={pageNum} style={{ color: "var(--muted)", fontSize: 12 }}>...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1, color: "var(--text)" }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg-card2)", padding: 16, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
                        {loadingInv ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, height: "100%", color: "var(--muted)", fontSize: 13 }}>
                                <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite", color: "var(--indigo-l)" }} /> Loading invoice details...
                            </div>
                        ) : invoice ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Selected Invoice</div>
                                <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.06)" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800 }}>{invoice.invoiceNumber}</span>
                                        <span style={{ fontSize: 14, fontWeight: 900, color: "var(--green)" }}>{fmt(invoice.totalAmount)}</span>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{invoice.customerName || "Walk-in customer"}</div>
                                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{invoice.customerPhone || "No phone"} • {fmtDate(invoice.createdAt)}</div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}>
                                        <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Line Items</div>
                                        <div style={{ fontSize: 20, fontWeight: 900 }}>{invoice.items?.length || 0}</div>
                                    </div>
                                    <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}>
                                        <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Returnable Qty</div>
                                        <div style={{ fontSize: 20, fontWeight: 900 }}>
                                            {invoice.items?.reduce((s: number, it: any) => s + (it.remainingQuantity || 0), 0) || 0}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>Products in invoice</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, overflowY: "auto", paddingRight: 2, minHeight: "150px" }}>
                                    {invoice.items?.map((it: any) => (
                                        <div key={it.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px" }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.productName}</div>
                                                <div style={{ fontSize: 11, color: "var(--muted)" }}>{it.sku || "—"} · Sold {it.quantity}</div>
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--muted)" }}>Returnable {it.remainingQuantity}</div>
                                        </div>
                                    ))}
                                </div>

                                <button className="btn btn-primary" style={{ width: "100%", marginTop: 4 }} onClick={() => setStep(1)}>
                                    Select Items for Return <ChevronRight size={14} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", color: "var(--muted)" }}>
                                <FileText size={28} />
                                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>Pick an invoice to continue</div>
                                <div style={{ fontSize: 12.5, maxWidth: 260 }}>Select any invoice from the list to preview full details and process return.</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Step 1: Select items ─────────────────────────────────── */}
            {step === 1 && invoice && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Invoice banner */}
                    <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--bg-card2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FileText size={16} color="var(--indigo-l)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>{invoice.invoiceNumber}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{invoice.customerName} · {invoice.customerPhone} · {fmtDate(invoice.createdAt)}</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: "var(--green)" }}>{fmt(invoice.totalAmount)}</div>
                    </div>

                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>Select Items to Return</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 500px)", minHeight: "300px", overflowY: "auto", paddingRight: 4 }}>
                            {invoice.items.map((it: any) => {
                                const qty = selectedItems[it.productId] || 0;
                                const selected = qty > 0;
                                return (
                                    <div key={it.productId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 13, background: selected ? "rgba(239,68,68,0.04)" : "var(--bg-card2)", border: `1.5px solid ${selected ? "rgba(239,68,68,0.25)" : "var(--border)"}`, transition: "all 0.18s" }}>
                                        {/* Select toggle — sets to 1 if unchecked, 0 if checked */}
                                        <button type="button" onClick={() => setSelectedItems(p => ({ ...p, [it.productId]: qty > 0 ? 0 : 1 }))}
                                            style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selected ? "var(--red)" : "var(--border)"}`, background: selected ? "var(--red)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                                            {selected && <CheckCircle2 size={11} color="#fff" />}
                                        </button>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>{it.productName}</div>
                                            <div style={{ fontSize: 11, color: "var(--muted)" }}>
                                                {it.sku} · {fmt(it.sellingPrice)}/unit · sold: {it.quantity} 
                                                {it.returnedQuantity > 0 && <span style={{ color: "var(--orange)", marginLeft: 6 }}>({it.returnedQuantity} already returned)</span>}
                                            </div>
                                        </div>
                                        {/* Qty stepper with direct input */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <button type="button" onClick={() => setSelectedItems(p => ({ ...p, [it.productId]: Math.max(0, (p[it.productId] || 0) - 1) }))}
                                                style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-input)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "var(--muted)", flexShrink: 0 }}
                                            >−</button>
                                            <input
                                                type="number"
                                                min={0}
                                                max={it.remainingQuantity}
                                                value={qty === 0 ? "" : qty}
                                                placeholder="0"
                                                onChange={e => {
                                                    const v = parseInt(e.target.value, 10);
                                                    if (isNaN(v) || e.target.value === "") {
                                                        setSelectedItems(p => ({ ...p, [it.productId]: 0 }));
                                                    } else {
                                                        setSelectedItems(p => ({ ...p, [it.productId]: Math.min(it.remainingQuantity, Math.max(0, v)) }));
                                                    }
                                                }}
                                                style={{
                                                    width: 52, height: 28, textAlign: "center", borderRadius: 7,
                                                    border: `1.5px solid ${selected ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
                                                    background: "var(--bg-input)", color: selected ? "#ef4444" : "var(--text)",
                                                    fontSize: 14, fontWeight: 800, outline: "none",
                                                    MozAppearance: "textfield",
                                                }}
                                            />
                                            <button type="button" onClick={() => setSelectedItems(p => ({ ...p, [it.productId]: Math.min(it.remainingQuantity, (p[it.productId] || 0) + 1) }))}
                                                style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(79,70,229,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "var(--indigo-l)", flexShrink: 0 }}
                                            >+</button>
                                            <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>/ {it.remainingQuantity}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Totals strip */}
                    {itemsSelected && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                            {[{ l: "Subtotal", v: fmt(totalSelected) }, { l: "GST", v: fmt(totalGst) }, { l: "Refund Total", v: fmt(totalSelected + totalGst) }].map((x, i) => (
                                <div key={i} style={{ textAlign: i === 2 ? "right" : i === 0 ? "left" : "center" }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 4 }}>{x.l}</div>
                                    <div style={{ fontSize: i === 2 ? 16 : 13, fontWeight: 900, color: i === 2 ? "#ef4444" : "var(--text)" }}>{x.v}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10 }}>
                        <button className="btn btn-ghost" style={{ gap: 6 }} onClick={() => { setStep(0); setInvoice(null); setSearchQuery(""); }}>
                            <ArrowLeft size={14} /> Back
                        </button>
                        <button className="btn btn-primary" style={{ flex: 1 }} disabled={!itemsSelected} onClick={() => setStep(2)}>
                            Continue <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 2: Confirm ──────────────────────────────────────── */}
            {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Confirm Return Details</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>Review and finalize return settings</div>
                    </div>

                    {/* Summary of selected items */}
                    <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>Items Being Returned</div>
                        {invoice?.items?.filter((it: any) => (selectedItems[it.productId] || 0) > 0).map((it: any) => (
                            <div key={it.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{it.productName}</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)" }}>×{selectedItems[it.productId]} units</div>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(it.sellingPrice * (1 + it.gstRate / 100) * selectedItems[it.productId])}</div>
                            </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, marginTop: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>Total Refund</span>
                            <span style={{ fontSize: 18, fontWeight: 900, color: "#ef4444" }}>{fmt(totalSelected + totalGst)}</span>
                        </div>
                    </div>

                    {/* Return reason — styled pills */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>Return Reason</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {REASONS.map(r => (
                                <button key={r.key} type="button" onClick={() => setReason(r.key)}
                                    style={{ padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${reason === r.key ? r.color + "60" : "var(--border)"}`, background: reason === r.key ? r.color + "12" : "var(--bg-card2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, fontWeight: reason === r.key ? 700 : 500, color: reason === r.key ? "var(--text)" : "var(--muted)" }}>{r.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Refund type - Auto calculated */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>Refund Method</div>
                        <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                            {hasPending ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <ClipboardList size={16} color="var(--indigo-l)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Deduct from Balance</div>
                                        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Customer owes {fmt(customerOutstanding)}. Amount will be adjusted against their pending balance.</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Banknote size={16} color="var(--green)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Cash Refund</div>
                                        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Customer has no pending balance. Amount will be refunded via cash.</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Restock toggle */}
                    <div onClick={() => setRestock(r => !r)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: restock ? "rgba(16,185,129,0.05)" : "var(--bg-card2)", border: `1.5px solid ${restock ? "rgba(16,185,129,0.25)" : "var(--border)"}`, cursor: "pointer", transition: "all 0.18s" }}>
                        <div style={{ width: 40, height: 22, borderRadius: 11, background: restock ? "var(--green)" : "var(--border)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                            <div style={{ position: "absolute", top: 3, left: restock ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Restock Items</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>Returned items will be added back to inventory</div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <label>Notes <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                        <input className="input" placeholder="e.g. Customer reported damaged packaging" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                        <button className="btn btn-ghost" style={{ gap: 6 }} onClick={() => setStep(1)}>
                            <ArrowLeft size={14} /> Back
                        </button>
                        <button className="btn" disabled={creating} onClick={handleSubmit}
                            style={{ flex: 1, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", boxShadow: "0 4px 14px rgba(239,68,68,0.35)", fontWeight: 700, fontSize: 14, height: 44 }}>
                            {creating ? <Loader2 size={15} style={{ animation: "spin 0.7s linear infinite" }} /> : <RotateCcw size={15} />}
                            {creating ? "Processing..." : "Create Return"}
                        </button>
                    </div>
                </div>
            )}
        </ModalShell>
    );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────
function ModalShell({ onClose, children, maxWidth = 600, inline = false }: { onClose: () => void; children: React.ReactNode; maxWidth?: number; inline?: boolean }) {
    if (inline) {
        return (
            <div style={{ 
                width: "100%", 
                maxWidth, 
                margin: "0 auto", 
                borderRadius: 22, 
                padding: "24px 24px", 
                boxShadow: "0 20px 45px rgba(0,0,0,0.35)", 
                position: "relative", 
                background: "var(--bg-card)", 
                border: "1px solid var(--border)", 
                overflow: "visible",
                display: "flex",
                flexDirection: "column",
                minHeight: "calc(100vh - 140px)"
            }}>
                {children}
            </div>
        );
    }
    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 22, padding: "28px 28px", width: "100%", maxWidth, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", animation: "modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)", position: "relative" }}>
                <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--text)"; (e.currentTarget as any).style.background = "var(--bg-card2)"; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--muted)"; (e.currentTarget as any).style.background = "var(--bg-input)"; }}>
                    <X size={14} />
                </button>
                {children}
            </div>
        </div>
    );
}

// ─── Credit Note View Modal ───────────────────────────────────────────────────
function CreditNoteModal({ ret, onClose }: { ret: any; onClose: () => void }) {
    const reasonColor = REASON_COLOR[ret.reason] || "#64748b";
    return (
        <ModalShell onClose={onClose} maxWidth={580}>
            {/* Header bar */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, paddingRight: 36 }}>
                <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f87171", marginBottom: 6 }}>Credit Note</div>
                    <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.05em" }}>{ret.creditNoteNumber}</div>
                </div>
                <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--indigo-l)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    <Printer size={13} /> Print
                </button>
            </div>

            {/* Business + meta */}
            <div style={{ padding: "16px 20px", borderRadius: 16, background: "var(--bg-card2)", border: "1px solid var(--border)", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>{ret.businessName || "—"}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
                            {ret.businessAddress}<br />
                            {ret.businessGstin && <>GSTIN: {ret.businessGstin}</>}
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{fmtDate(ret.createdAt)}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${reasonColor}15`, color: reasonColor, border: `1px solid ${reasonColor}30` }}>
                            {ret.reason?.replace("_", " ")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Customer + original invoice */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                    { label: "Customer", lines: [ret.customerName, ret.customerPhone] },
                    { label: "Against Invoice", lines: [ret.originalInvoiceNumber, REFUND_LABELS[ret.refundType]] },
                ].map(card => (
                    <div key={card.label} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>{card.label}</div>
                        {card.lines.map((l, i) => <div key={i} style={{ fontSize: i === 0 ? 13 : 12, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? "var(--text)" : "var(--muted)", fontFamily: card.label === "Against Invoice" && i === 0 ? "monospace" : "inherit" }}>{l}</div>)}
                    </div>
                ))}
            </div>

            {/* Items table */}
            <div className="table-wrapper" style={{ marginBottom: 16 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            {["Item", "Qty", "Price", "GST", "Total"].map((h, i) => (
                                <th key={h} style={{ textAlign: i > 0 ? "right" : "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ret.items.map((it: any, i: number) => (
                            <tr key={i}>
                                <td>{it.productName}</td>
                                <td style={{ textAlign: "right" }}>{it.quantity}</td>
                                <td style={{ textAlign: "right" }}>{fmt(it.sellingPrice)}</td>
                                <td style={{ textAlign: "right", color: "var(--muted)" }}>{fmt(it.gstAmount)}</td>
                                <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(it.lineTotalWithGst)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}>
                {[{ l: "Subtotal", v: fmt(ret.subtotal) }, { l: "GST", v: fmt(ret.totalGst) }].map(row => (
                    <div key={row.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
                        <span>{row.l}</span><span>{row.v}</span>
                    </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(239,68,68,0.15)", paddingTop: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Total Refund</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#ef4444" }}>{fmt(ret.totalAmount)}</span>
                </div>
            </div>

            {ret.notes && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "var(--bg-card2)", border: "1px solid var(--border)", fontSize: 12.5, color: "var(--muted)", fontStyle: "italic" }}>
                    📝 {ret.notes}
                </div>
            )}
        </ModalShell>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function ReturnsPageContent() {
    const searchParams = useSearchParams();
    const invoiceId = searchParams.get("invoiceId");

    const [showCreate, setShowCreate] = useState(false);
    const [viewReturn, setViewReturn] = useState<any>(null);
    const [historySearch, setHistorySearch] = useState("");

    // Auto-open modal if invoiceId is in URL
    useEffect(() => {
        if (invoiceId) setShowCreate(true);
    }, [invoiceId]);

    const { data, loading, refetch } = useQuery<any>(LIST_RETURNS, {
        fetchPolicy: "cache-and-network",
        variables: { limit: 200 },
    });

    const returns: any[] = data?.listReturns?.items || [];
    
    const filteredReturns = useMemo(() => {
        const q = historySearch.toLowerCase().trim();
        if (!q) return returns;
        return returns.filter(r => 
            r.customerName?.toLowerCase().includes(q) ||
            r.customerPhone?.includes(q) ||
            r.creditNoteNumber?.toLowerCase().includes(q) ||
            r.originalInvoiceNumber?.toLowerCase().includes(q)
        );
    }, [returns, historySearch]);

    const total = data?.listReturns?.total || 0;
    const totalRefunded = returns.reduce((s, r) => s + r.totalAmount, 0);
    const cashRefunds = returns.filter(r => r.refundType === "CASH_REFUND").length;
    const creditNotes = returns.filter(r => r.refundType === "CREDIT_NOTE").length;

    if (showCreate) {
        return (
            <AuthGuard>
                {viewReturn && <CreditNoteModal ret={viewReturn} onClose={() => setViewReturn(null)} />}
                <div className="page-header" style={{ marginBottom: 16 }}>
                    <div>
                        <h1 className="page-title" style={{ margin: 0 }}>New Return</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Full page return processing and invoice selection.</p>
                    </div>
                    <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Back</button>
                </div>
                <CreateReturnModal onClose={() => setShowCreate(false)} refetch={refetch} />
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            {viewReturn && <CreditNoteModal ret={viewReturn} onClose={() => setViewReturn(null)} />}

            {/* ── Page Header ──────────────────────────────────────────── */}
            <div className="page-header">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(239,68,68,0.35)", flexShrink: 0 }}>
                            <RotateCcw size={20} color="#fff" />
                        </div>
                        <div>
                            <h1 className="page-title" style={{ margin: 0 }}>Returns</h1>
                            <p className="page-subtitle" style={{ margin: 0 }}>Manage customer returns &amp; credit notes</p>
                        </div>
                    </div>
                </div>
                <button
                    className="btn"
                    onClick={() => setShowCreate(true)}
                    style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", boxShadow: "0 4px 14px rgba(239,68,68,0.35)", fontWeight: 700, gap: 8 }}
                    onMouseEnter={e => (e.currentTarget as any).style.transform = "translateY(-1px)"}
                    onMouseLeave={e => (e.currentTarget as any).style.transform = "none"}
                >
                    <Plus size={15} /> New Return
                </button>
            </div>

            {/* ── Stat cards ───────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
                {[
                    { label: "Total Returns", value: total, icon: <RotateCcw size={18} />, color: "#ef4444", gradient: "rgba(239,68,68,0.08)" },
                    { label: "Total Refunded", value: fmt(totalRefunded), icon: <IndianRupee size={18} />, color: "#f59e0b", gradient: "rgba(245,158,11,0.08)" },
                    { label: "Credit Notes", value: creditNotes, icon: <ClipboardList size={18} />, color: "#818cf8", gradient: "rgba(129,140,248,0.08)" },
                    { label: "Cash Refunds", value: cashRefunds, icon: <Banknote size={18} />, color: "#10b981", gradient: "rgba(16,185,129,0.08)" },
                ].map(stat => (
                    <div key={stat.label} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 13, background: stat.gradient, border: `1px solid ${stat.color}25`, display: "flex", alignItems: "center", justifyContent: "center", color: stat.color, flexShrink: 0 }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>{stat.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>{stat.value}</div>
                        </div>
                        {/* Glow blob */}
                        <div style={{ position: "absolute", top: -10, right: -10, width: 70, height: 70, borderRadius: "50%", background: `radial-gradient(circle, ${stat.color}18 0%, transparent 70%)`, pointerEvents: "none" }} />
                    </div>
                ))}
            </div>

            {/* ── Table ────────────────────────────────────────────────── */}
            <div className="table-wrapper">
                {/* Table header bar */}
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "rgba(79,70,229,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <FileText size={15} color="var(--red)" />
                        <span style={{ fontSize: 13.5, fontWeight: 700 }}>Credit Note History</span>
                        {total > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}>{total}</span>}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
                        <div style={{ position: "relative", width: "100%", maxWidth: 300 }}>
                            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                            <input 
                                className="input" 
                                placeholder="Search by name, phone or CN..." 
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                style={{ height: 36, paddingLeft: 36, fontSize: 13, background: "var(--bg-card)" }}
                            />
                            {historySearch && (
                                <button 
                                    onClick={() => setHistorySearch("")}
                                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <button onClick={() => refetch()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--muted)", transition: "all 0.15s", height: 36 }}
                            onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--text)"; }}
                            onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--muted)"; }}>
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>
                </div>

                {loading && !data ? (
                    <div style={{ padding: "72px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite", color: "var(--muted)" }} />
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>Loading returns...</span>
                    </div>
                ) : filteredReturns.length === 0 ? (
                    <div style={{ padding: "80px 24px", textAlign: "center" }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--bg-card2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <Package size={28} color="var(--muted)" />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                            {historySearch ? "No matching results" : "No returns yet"}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
                            {historySearch ? `No credit notes found for "${historySearch}"` : 'Click "New Return" to start processing a customer return'}
                        </div>
                        {historySearch && (
                            <button className="btn btn-ghost" onClick={() => setHistorySearch("")}>Clear Search</button>
                        )}
                        {!historySearch && (
                            <button className="btn" onClick={() => setShowCreate(true)}
                                style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", boxShadow: "0 4px 14px rgba(239,68,68,0.3)", gap: 8 }}>
                                <Plus size={14} /> New Return
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                {["Credit Note", "Invoice", "Customer", "Items", "Reason", "Refund", "Amount", "Date", ""].map((h, i) => (
                                    <th key={h + i}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReturns.map(ret => {
                                const rColor = REASON_COLOR[ret.reason] || "#64748b";
                                return (
                                    <tr key={ret.returnId}>
                                        <td>
                                            <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 800, color: "#f87171", background: "rgba(239,68,68,0.07)", padding: "3px 8px", borderRadius: 6 }}>
                                                {ret.creditNoteNumber}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{ret.originalInvoiceNumber}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{ret.customerName}</div>
                                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{ret.customerPhone}</div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 12, color: "var(--muted)" }}>
                                                {ret.items.length} item{ret.items.length !== 1 ? "s" : ""}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: `${rColor}12`, color: rColor, border: `1px solid ${rColor}30` }}>
                                                {ret.reason?.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${ret.refundType === "CASH_REFUND" ? "badge-green" : "badge-indigo"}`}>
                                                {ret.refundType === "CASH_REFUND" ? <Banknote size={10} /> : <ClipboardList size={10} />}
                                                {REFUND_LABELS[ret.refundType]}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 14, fontWeight: 900, color: "#ef4444" }}>{fmt(ret.totalAmount)}</span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(ret.createdAt)}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <a href={`/returns/${ret.returnId}`}
                                                    target="_blank" rel="noreferrer"
                                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#ef4444", textDecoration: "none", transition: "all 0.15s", whiteSpace: "nowrap" }}
                                                    onMouseEnter={e => { (e.currentTarget as any).style.background = "rgba(239,68,68,0.14)"; }}
                                                    onMouseLeave={e => { (e.currentTarget as any).style.background = "rgba(239,68,68,0.07)"; }}>
                                                    <Printer size={11} /> Print Bill
                                                </a>
                                                <button onClick={() => setViewReturn(ret)}
                                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--muted)", transition: "all 0.15s", whiteSpace: "nowrap" }}
                                                    onMouseEnter={e => { (e.currentTarget as any).style.color = "var(--text)"; (e.currentTarget as any).style.borderColor = "rgba(99,102,241,0.3)"; }}
                                                    onMouseLeave={e => { (e.currentTarget as any).style.color = "var(--muted)"; (e.currentTarget as any).style.borderColor = "var(--border)"; }}>
                                                    View <ChevronRight size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
                @keyframes modalIn { from { opacity:0; transform:scale(0.93) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
                .form-group label { display:block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--muted); margin-bottom:7px; }
            `}</style>
        </AuthGuard>
    );
}

export default function ReturnsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReturnsPageContent />
        </Suspense>
    );
}

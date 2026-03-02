"use client";
import { useQuery, useLazyQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_INVOICE, GET_INVOICE_DOWNLOAD_URL } from "@/lib/graphql/queries";
import { Printer, Download, ArrowLeft, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const PM_COLOR: Record<string, string> = {
    CASH: "#10b981",
    UPI: "#818cf8",
    CARD: "#f59e0b",
    CREDIT: "#f87171",
};

export default function InvoiceDetailPage() {
    const params = useParams();
    const saleId = params.saleId as string;
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const { data, loading, error, refetch } = useQuery<any, any>(GET_INVOICE, {
        variables: { saleId },
        fetchPolicy: "network-only",
        skip: !saleId,
    } as any);

    const [fetchDownloadUrl, { loading: urlLoading }] = useLazyQuery<any, any>(
        GET_INVOICE_DOWNLOAD_URL,
        {
            variables: { saleId },
            fetchPolicy: "no-cache",
            onCompleted: (d: any) => {
                if (d?.getInvoiceDownloadUrl) setDownloadUrl(d.getInvoiceDownloadUrl);
            },
        } as any
    );

    const inv = data?.getInvoice;

    // Auto-fetch presigned URL once invoice is loaded and pdf_status is READY
    useEffect(() => {
        if (inv?.pdfUrl !== undefined) {
            // pdfUrl set means READY — but we always generate a fresh presigned URL
            fetchDownloadUrl();
        }
    }, [inv?.saleId]);

    // Also check pdf_status to know if PDF is ready
    const pdfReady = inv?.pdfUrl != null || downloadUrl != null;

    const handlePrint = () => window.print();

    if (loading) {
        return (
            <AuthGuard>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 12, color: "#64748b" }}>
                    <Loader2 size={22} style={{ animation: "spin 0.8s linear infinite" }} />
                    <span>Loading invoice…</span>
                </div>
            </AuthGuard>
        );
    }

    if (error || !inv) {
        return (
            <AuthGuard>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 14, color: "#64748b" }}>
                    <div style={{ fontSize: 40 }}>📄</div>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>Invoice not found</p>
                    {error && <p style={{ fontSize: 12, color: "#f87171", maxWidth: 400, textAlign: "center" }}>{error.message}</p>}
                    <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => refetch()} className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <RefreshCw size={13} /> Retry
                        </button>
                        <a href="/invoices" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <ArrowLeft size={13} /> All Invoices
                        </a>
                    </div>
                </div>
            </AuthGuard>
        );
    }

    const pmColor = PM_COLOR[inv.paymentMethod] || "#64748b";

    return (
        <AuthGuard>
            {/* ── Screen chrome (hidden on print) ───── */}
            <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <a href="/invoices" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", textDecoration: "none" }}>
                    <ArrowLeft size={14} /> All Invoices
                </a>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {/* PDF download */}
                    {downloadUrl ? (
                        <a href={downloadUrl} target="_blank" rel="noreferrer"
                            className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <Download size={14} /> Download PDF
                        </a>
                    ) : urlLoading ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94a3b8" }}>
                            <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> Fetching PDF…
                        </span>
                    ) : (
                        <button onClick={() => fetchDownloadUrl()}
                            className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#f59e0b" }}>
                            <Clock size={13} /> PDF pending — refresh
                        </button>
                    )}
                    <button onClick={handlePrint} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                        <Printer size={14} /> Print
                    </button>
                </div>
            </div>

            {/* ── Invoice paper ──────────────────────── */}
            <div id="invoice-paper" style={{
                background: "#fff", color: "#111827", borderRadius: 16,
                padding: "40px 44px", maxWidth: 820, margin: "0 auto",
                boxShadow: "0 8px 40px rgba(0,0,0,0.4)", fontFamily: "'Inter', sans-serif",
            }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                    <div>
                        {/* Shop name — registered business */}
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.5px" }}>
                            {inv.businessName || "My Business"}
                        </div>
                        {(inv.businessAddress || inv.businessCity) && (
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
                                {[inv.businessAddress, inv.businessCity, inv.businessState].filter(Boolean).join(", ")}
                            </div>
                        )}
                        {inv.businessPhone && (
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>📞 {inv.businessPhone}</div>
                        )}
                        {inv.businessGstin && (
                            <div style={{ fontSize: 11, color: "#4f46e5", marginTop: 1, fontFamily: "monospace", fontWeight: 600 }}>
                                GSTIN: {inv.businessGstin}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{
                            display: "inline-block", background: "#4f46e5", color: "#fff",
                            fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: "3px 12px",
                            borderRadius: 20, marginBottom: 8, textTransform: "uppercase",
                        }}>Tax Invoice</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{inv.invoiceNumber}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                            {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                    </div>
                </div>

                <hr style={{ border: "none", borderTop: "2px solid #4f46e5", marginBottom: 24 }} />

                {/* Bill to + payment */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                    <div>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: "#9ca3af", fontWeight: 700, marginBottom: 5 }}>Bill To</div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{inv.customerName}</div>
                        {inv.customerPhone && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>📞 {inv.customerPhone}</div>}
                        {inv.customerGstin && <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>GSTIN: {inv.customerGstin}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <span style={{
                            display: "inline-block",
                            background: `${pmColor}18`, border: `1px solid ${pmColor}44`, color: pmColor,
                            padding: "5px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        }}>
                            {inv.paymentMethod}
                        </span>
                    </div>
                </div>

                {/* Items table */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: "#4f46e5" }}>
                            {["#", "Product", "SKU", "Qty", "Rate (₹)", "GST%", "GST (₹)", "Amount (₹)"].map((h, i) => (
                                <th key={h} style={{
                                    padding: "9px 11px", color: "#fff", fontWeight: 700, fontSize: 10,
                                    textTransform: "uppercase", letterSpacing: 0.5,
                                    textAlign: i >= 3 ? "right" : "left",
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(inv.items || []).map((item: any, idx: number) => (
                            <tr key={item.productId || idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "9px 11px", color: "#9ca3af" }}>{idx + 1}</td>
                                <td style={{ padding: "9px 11px" }}><div style={{ fontWeight: 600 }}>{item.productName}</div></td>
                                <td style={{ padding: "9px 11px", color: "#9ca3af", fontSize: 11, fontFamily: "monospace" }}>{item.sku}</td>
                                <td style={{ padding: "9px 11px", textAlign: "right" }}>{item.quantity}</td>
                                <td style={{ padding: "9px 11px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{fmt(item.sellingPrice)}</td>
                                <td style={{ padding: "9px 11px", textAlign: "right", color: "#6b7280" }}>{item.gstRate}%</td>
                                <td style={{ padding: "9px 11px", textAlign: "right", color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>₹{fmt(item.gstAmount)}</td>
                                <td style={{ padding: "9px 11px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>₹{fmt(item.lineTotalWithGst)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* GST summary */}
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 11, color: "#1e40af" }}>
                    <strong style={{ display: "block", marginBottom: 4, fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#3730a3" }}>GST Summary</strong>
                    <span>Taxable Value (ex-GST): ₹{fmt(inv.subtotal)}</span>
                    <span style={{ marginLeft: 24 }}>Total GST: ₹{fmt(inv.totalGst)}</span>
                </div>

                {/* Totals */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
                    <div style={{ width: 280 }}>
                        {[
                            { label: "Subtotal (ex-GST)", val: `₹${fmt(inv.subtotal)}`, color: "#374151" },
                            { label: "GST", val: `₹${fmt(inv.totalGst)}`, color: "#374151" },
                            ...(inv.discountAmount > 0 ? [{ label: "Discount", val: `−₹${fmt(inv.discountAmount)}`, color: "#dc2626" }] : []),
                        ].map(r => (
                            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid #f3f4f6", color: r.color }}>
                                <span>{r.label}</span>
                                <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.val}</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: "2px solid #4f46e5", marginTop: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 800 }}>Total</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: "#4f46e5", fontVariantNumeric: "tabular-nums" }}>₹{fmt(inv.totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Summary */}
                {(() => {
                    const amountPaid = inv.amountPaid ?? inv.totalAmount;
                    const balanceDue = inv.balanceDue ?? 0;
                    const totalAmount = inv.totalAmount ?? 0;
                    return (
                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, border: "1px solid #e5e7eb" }}>
                            <thead>
                                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                                    <th colSpan={2} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", textAlign: "left" }}>
                                        Payment Summary
                                    </th>
                                    <th style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", textAlign: "right" }}>
                                        Mode: {inv.paymentMethod}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: "14px 16px", width: "33.33%", borderRight: "1px solid #f0f0f0", verticalAlign: "top" }}>
                                        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>Invoice Total</div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: "#4f46e5", fontVariantNumeric: "tabular-nums" }}>₹{fmt(totalAmount)}</div>
                                    </td>
                                    <td style={{ padding: "14px 16px", width: "33.33%", borderRight: "1px solid #f0f0f0", verticalAlign: "top" }}>
                                        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>Amount Paid</div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: "#15803d", fontVariantNumeric: "tabular-nums" }}>₹{fmt(amountPaid)}</div>
                                    </td>
                                    <td style={{ padding: "14px 16px", width: "33.33%", verticalAlign: "top" }}>
                                        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>Balance Due</div>
                                        {balanceDue <= 0
                                            ? <div style={{ fontSize: 16, fontWeight: 800, color: "#9ca3af" }}>✓ Nil</div>
                                            : <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", fontVariantNumeric: "tabular-nums" }}>₹{fmt(balanceDue)}</div>
                                        }
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    );
                })()
                }

                {/* Outstanding balance alert */}
                {(inv.balanceDue ?? 0) > 0 && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 11.5, color: "#b91c1c" }}>
                        ⚠ <strong>Outstanding Balance:</strong> ₹{fmt(inv.balanceDue)} is pending. Please settle at the earliest.
                    </div>
                )}

                {/* Notes */}
                {inv.notes && (
                    <div style={{ background: "#f9fafb", borderLeft: "3px solid #4f46e5", padding: "10px 16px", borderRadius: "0 6px 6px 0", marginBottom: 24 }}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", fontWeight: 700, marginBottom: 3 }}>Notes</div>
                        <div style={{ fontSize: 12, color: "#374151" }}>{inv.notes}</div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ textAlign: "center", fontSize: 10.5, color: "#9ca3af", borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
                    <p>Thank you for your business!&nbsp;·&nbsp;Powered by <strong style={{ color: "#4f46e5" }}>CloudHisaab</strong></p>
                    <p style={{ marginTop: 3 }}>This is a computer-generated invoice and does not require a physical signature.</p>
                </div>
            </div>

            {/* ── Profit & PDF status badges ─────── */}
            <div className="no-print" style={{ maxWidth: 820, margin: "16px auto 0", display: "flex", gap: 12 }}>
                <div className="glass" style={{ flex: 1, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Your Profit</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#34d399", fontVariantNumeric: "tabular-nums" }}>₹{fmt(inv.totalProfit)}</span>
                </div>
                <div className="glass" style={{ flex: 1, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>PDF Status</span>
                    <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, color: downloadUrl ? "#34d399" : "#f59e0b" }}>
                        {downloadUrl ? <><CheckCircle2 size={14} /> Ready — <a href={downloadUrl} target="_blank" rel="noreferrer" style={{ color: "#818cf8", textDecoration: "underline" }}>Download</a></> : <><Clock size={14} /> Generating…</>}
                    </span>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    #invoice-paper { box-shadow: none !important; border-radius: 0 !important; padding: 20px 28px !important; max-width: 100% !important; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </AuthGuard>
    );
}

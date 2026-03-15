"use client";
import { useQuery, useLazyQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_INVOICE, GET_INVOICE_DOWNLOAD_URL } from "@/lib/graphql/queries";
import { Download, ArrowLeft, CheckCircle2, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const f2 = (n: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

function num2wordsIndian(n: number): string {
    const nInt = Math.floor(n);
    if (nInt === 0) return "Zero";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convertLessThan100(val: number): string {
        if (val < 20) return ones[val];
        return tens[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + ones[val % 10] : "");
    }

    function convertLessThan1000(val: number): string {
        if (val < 100) return convertLessThan100(val);
        return ones[Math.floor(val / 100)] + " Hundred" + (val % 100 !== 0 ? " and " + convertLessThan100(val % 100) : "");
    }

    let res = "";
    let num = nInt;
    if (num >= 10000000) {
        res += convertLessThan100(Math.floor(num / 10000000)) + " Crore ";
        num %= 10000000;
    }
    if (num >= 100000) {
        res += convertLessThan100(Math.floor(num / 100000)) + " Lakh ";
        num %= 100000;
    }
    if (num >= 1000) {
        res += convertLessThan100(Math.floor(num / 1000)) + " Thousand ";
        num %= 1000;
    }
    if (num > 0) {
        res += convertLessThan1000(num);
    }
    return res.trim();
}

export default function InvoiceDetailPage() {
    const params = useParams();
    const saleId = params.saleId as string;
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
                if (d?.getInvoiceDownloadUrl) {
                    setDownloadUrl(d.getInvoiceDownloadUrl);
                    // PDF is ready — stop polling
                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                }
            },
        } as any
    );

    const inv = data?.getInvoice;

    // Auto-poll every 5s until we get the download URL
    useEffect(() => {
        if (!inv) return;

        // Kick off immediately
        fetchDownloadUrl();

        // Start polling interval
        pollRef.current = setInterval(() => {
            if (!downloadUrl) fetchDownloadUrl();
        }, 5000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inv?.saleId]);

    // Stop polling once URL is found
    useEffect(() => {
        if (downloadUrl && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, [downloadUrl]);

    if (loading) return (
        <AuthGuard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 12, color: "var(--muted)" }}>
                <Loader2 size={22} style={{ animation: "spin 0.8s linear infinite" }} />
                <span>Loading invoice…</span>
            </div>
        </AuthGuard>
    );

    if (error || !inv) return (
        <AuthGuard>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 14, color: "var(--muted)" }}>
                <div style={{ fontSize: 40 }}>📄</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Invoice not found</p>
                {error && <p style={{ fontSize: 12, color: "var(--red)", maxWidth: 400, textAlign: "center" }}>{error.message}</p>}
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

    const totalGst = inv.totalGst ?? 0;
    const totalAmount = inv.totalAmount ?? 0;
    const discountAmount = inv.discountAmount ?? 0;
    const amountPaid = inv.amountPaid ?? totalAmount;
    const balanceDue = inv.balanceDue ?? 0;
    const subtotal = totalAmount - totalGst;
    const grossTotal = subtotal + discountAmount;
    const paymentMethod = (inv.paymentMethod || "CASH").toUpperCase();
    const items = inv.items || [];
    const SPACER_ROWS = Math.max(0, 12 - items.length);
    const dateStr = inv.date || new Date(inv.createdAt).toLocaleDateString("en-IN");

    /* ── Shared cell styles ── */
    const th: React.CSSProperties = {
        borderRight: "1px solid #000",
        padding: "4px 5px",
        textAlign: "left",
        fontSize: 9,
        fontWeight: "bold",
        textTransform: "uppercase",
        background: "#87CEEB",
        color: "#000",
    };
    const td: React.CSSProperties = {
        borderRight: "1px solid #000",
        padding: "4px 5px",
        textAlign: "left",
        fontSize: 9,
        height: 25,
    };
    const noRightBorder = { borderRight: "none" };
    const R: React.CSSProperties = { textAlign: "right" };
    const C: React.CSSProperties = { textAlign: "center" };

    return (
        <AuthGuard>
            {/* ── Screen nav bar (hidden on print) ── */}
            <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <a href="/invoices" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>
                    <ArrowLeft size={14} /> All Invoices
                </a>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {downloadUrl ? (
                        <a href={downloadUrl} target="_blank" rel="noreferrer"
                            className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <Download size={14} /> Download PDF
                        </a>
                    ) : (
                        <span style={{
                            display: "flex", alignItems: "center", gap: 7,
                            fontSize: 12, color: "var(--muted)",
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: 10, padding: "7px 14px",
                        }}>
                            <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite", color: "#818cf8" }} />
                            Generating PDF…
                        </span>
                    )}
                </div>
            </div>

            {/* ════════════════ INVOICE PAPER ════════════════ */}
            <div id="invoice-paper" style={{
                background: "#fff",
                color: "#000",
                border: "1px solid #000",
                width: "100%",
                maxWidth: 860,
                margin: "0 auto",
                fontFamily: "Arial, sans-serif",
                fontSize: 10,
                lineHeight: 1.3,
                boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
            }}>

                {/* ── TOP HEADER ── */}
                <div style={{ display: "table", width: "100%", borderBottom: "1px solid #000" }}>
                    {/* Left — Logo */}
                    <div style={{ display: "table-cell", width: "25%", padding: 5, verticalAlign: "middle" }}>
                        <div style={{ fontSize: 18, fontWeight: "bold", color: "#ff0000", fontStyle: "italic" }}>CloudHisaab</div>
                        <div style={{ fontSize: 8, color: "#555" }}>Smart Inventory Management</div>
                    </div>

                    {/* Center — Business */}
                    <div style={{ display: "table-cell", width: "50%", padding: 5, textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ fontSize: 18, fontWeight: "bold", color: "#000080", textTransform: "uppercase", marginBottom: 2 }}>
                            {inv.businessName}
                        </div>
                        {inv.businessCategory && (
                            <div style={{ fontSize: 9, fontWeight: "bold", color: "#0000ff", fontStyle: "italic", marginBottom: 5 }}>
                                {inv.businessCategory}
                            </div>
                        )}
                        <div style={{ fontSize: 9 }}>
                            {[inv.businessAddress, inv.businessCity, inv.businessState].filter(Boolean).join(", ")}
                        </div>
                        {(inv.businessPhone || inv.businessEmail) && (
                            <div style={{ marginTop: 3, fontSize: 9 }}>
                                {inv.businessPhone && <>Phone: {inv.businessPhone}</>}
                                {inv.businessPhone && inv.businessEmail && " | "}
                                {inv.businessEmail && <>Email: {inv.businessEmail}</>}
                            </div>
                        )}

                        {/* TAX INVOICE badge */}
                        <div style={{
                            display: "inline-block",
                            border: "1px solid #000",
                            background: "#f0f0f0",
                            fontWeight: "bold",
                            padding: "2px 10px",
                            margin: "5px auto 0",
                            textTransform: "uppercase",
                            fontSize: 10,
                        }}>Tax Invoice</div>
                    </div>

                    {/* Right — GSTIN only */}
                    <div style={{ display: "table-cell", width: "25%", padding: 5, textAlign: "right", fontSize: 8, verticalAlign: "middle" }}>
                        {inv.businessGstin && <div><strong>GSTIN:</strong> {inv.businessGstin}</div>}
                    </div>
                </div>

                {/* ── BILLING + META ── */}
                <div style={{ display: "table", width: "100%", borderBottom: "1px solid #000" }}>
                    {/* Customer */}
                    <div style={{ display: "table-cell", width: "50%", padding: 8, borderRight: "1px solid #000", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "bold", marginBottom: 4 }}>M/s {inv.customerName}</div>
                        {inv.customerAddress && <div>{inv.customerAddress}</div>}
                        {inv.customerCity && <div>{inv.customerCity}</div>}
                        {(inv.customerPhone || inv.customerGstin) && (
                            <div style={{ marginTop: 5 }}>
                                {inv.customerPhone && <div>Phone: {inv.customerPhone}</div>}
                                {inv.customerGstin && <div>GSTIN: {inv.customerGstin}</div>}
                            </div>
                        )}
                    </div>

                    {/* Meta table */}
                    <div style={{ display: "table-cell", width: "50%", padding: 8, verticalAlign: "top" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody style={{ fontSize: 9 }}>
                                {[
                                    ["Invoice No.", inv.invoiceNumber, "Date", dateStr],
                                    ["Due Date", inv.dueDate || "---", "Mode", paymentMethod],
                                ].map(([l1, v1, l2, v2]) => (
                                    <tr key={l1 as string}>
                                        <td style={{ width: "25%", fontWeight: "bold", padding: "2px 0" }}>{l1}</td>
                                        <td style={{ padding: "2px 0" }}>: {v1}</td>
                                        <td style={{ fontWeight: "bold", padding: "2px 0" }}>{l2}</td>
                                        <td style={{ padding: "2px 0" }}>: {v2}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── ITEMS TABLE ── */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#87CEEB", borderBottom: "1px solid #000" }}>
                        <tr>
                            <th style={{ ...th, ...C, width: 28 }}>#</th>
                            <th style={{ ...th }}>Product</th>
                            <th style={{ ...th, ...R, width: 38 }}>Qty.</th>
                            <th style={{ ...th, ...R, width: 48 }}>Rate</th>
                            <th style={{ ...th, ...R, width: 38 }}>Tax%</th>
                            <th style={{ ...th, ...R, ...noRightBorder, width: 68 }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item: any, idx: number) => (
                            <tr key={item.productId || idx} style={{ borderBottom: "0.5px dotted #ccc" }}>
                                <td style={{ ...td, ...C }}>{idx + 1}</td>
                                <td style={{ ...td }}><b>{item.productName}</b></td>
                                <td style={{ ...td, ...R }}>{Number(item.quantity)} {item.unit}</td>
                                <td style={{ ...td, ...R }}>{f2(item.sellingPrice)}</td>
                                <td style={{ ...td, ...R }}>{item.gstRate}%</td>
                                <td style={{ ...td, ...R, ...noRightBorder }}>
                                    <b>{f2((item.lineTotal ?? item.sellingPrice * item.quantity) + (item.gstAmount ?? 0))}</b>
                                </td>
                            </tr>
                        ))}
                        {/* Spacer rows */}
                        {Array.from({ length: SPACER_ROWS }).map((_, i) => (
                            <tr key={`sp${i}`} style={{ borderBottom: "0.5px dotted #ccc", height: 25 }}>
                                {[0, 1, 2, 3, 4, 5].map(j => (
                                    <td key={j} style={{ ...td, ...(j === 5 ? noRightBorder : {}) }}>&nbsp;</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── CALCULATION SECTION ── */}
                <div style={{ display: "table", width: "100%", borderTop: "1px solid #000" }}>
                    {/* Left — words & summary */}
                    <div style={{ display: "table-cell", width: "65%", padding: 10, verticalAlign: "top", borderRight: "1px solid #000", position: "relative" }}>
                        {/* Watermark */}
                        <div style={{
                            position: "absolute", top: "50%", left: "50%",
                            transform: "translate(-50%, -50%) rotate(-45deg)",
                            fontSize: 48, color: "rgba(200,200,200,0.2)",
                            pointerEvents: "none", whiteSpace: "nowrap", zIndex: 0,
                        }}>
                            {inv.businessName || "CLOUD HISAAB"}
                        </div>

                        <div style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: 5, position: "relative", zIndex: 1 }}>Summary</div>
                        <table style={{ fontSize: 8, borderCollapse: "collapse", position: "relative", zIndex: 1 }}>
                            <tbody>
                                <tr><td style={{ paddingRight: 20, width: "30%" }}>Taxable Amount:</td><td>₹{f2(subtotal)}</td></tr>
                                <tr><td>Total GST:</td><td>₹{f2(totalGst)}</td></tr>
                                {discountAmount > 0 && <tr><td>Discount:</td><td>₹{f2(discountAmount)}</td></tr>}
                            </tbody>
                        </table>
                        <div style={{ marginTop: 15, fontWeight: "bold", fontStyle: "italic", fontSize: 11, position: "relative", zIndex: 1 }}>
                            Rupees {num2wordsIndian(totalAmount)} Only
                        </div>
                    </div>

                    {/* Right — totals table */}
                    <div style={{ display: "table-cell", width: "35%", padding: 0, verticalAlign: "top" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                                 {[
                                    ["GROSS TOTAL", f2(grossTotal), false, false],
                                    ["Item Discount", f2(discountAmount), false, false],
                                    ["Tax (GST)", f2(totalGst), false, false],
                                    ["Freight / Other", "0.00", false, false],
                                    ["Roundoff", "0.00", false, false],
                                 ].map(([label, val]) => (
                                    <tr key={label as string}>
                                        <td style={{ padding: "4px 8px", fontWeight: "bold", borderBottom: "1px solid #000" }}>{label}</td>
                                        <td style={{ padding: "4px 8px", textAlign: "right", borderBottom: "1px solid #000", width: 100 }}>{val}</td>
                                    </tr>
                                 ))}
                                 <tr style={{ background: "#f0f0f0" }}>
                                    <td style={{ padding: "4px 8px", fontWeight: "bold", fontSize: 14 }}>GRAND TOTAL</td>
                                    <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "bold", fontSize: 14, width: 100 }}>₹{f2(totalAmount)}</td>
                                 </tr>
                                 <tr>
                                    <td style={{ padding: "4px 8px", fontWeight: "bold", color: "#006600", borderTop: "1px solid #000" }}>Amt. Paid</td>
                                    <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "bold", color: "#006600", borderTop: "1px solid #000", width: 100 }}>{f2(amountPaid)}</td>
                                 </tr>
                                 <tr style={{ background: balanceDue > 0 ? "#fff0f0" : "#f0fff0" }}>
                                    <td style={{ padding: "4px 8px", fontWeight: "bold", color: balanceDue > 0 ? "#cc0000" : "#006600", borderTop: "1px solid #000" }}>Balance / Pending</td>
                                    <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "bold", color: balanceDue > 0 ? "#cc0000" : "#006600", borderTop: "1px solid #000", width: 100 }}>{f2(balanceDue)}</td>
                                 </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div style={{ display: "table", width: "100%", borderTop: "1px solid #000", minHeight: 80 }}>
                    {/* Terms */}
                    <div style={{ display: "table-cell", width: "60%", padding: 8, fontSize: 8, verticalAlign: "top" }}>
                        <div style={{ fontWeight: "bold" }}>Terms &amp; Conditions</div>
                        1. Goods once sold will not be taken back or exchanged.<br />
                        2. Bills not paid due date will attract 24% interest.<br />
                        3. All disputes subject to __________ Jurisdiction only.<br />
                        4. Prescribed Sales Tax declaration will be given.<br />
                        <div style={{ marginTop: 8 }}>
                            Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged.
                        </div>
                    </div>

                    {/* Signatory */}
                    <div style={{ display: "table-cell", width: "40%", padding: 8, textAlign: "right", verticalAlign: "bottom" }}>
                        <div style={{ fontWeight: "bold", marginBottom: 5 }}>For {inv.businessName}</div>
                        <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>
                            <span style={{
                                fontSize: 9, borderTop: "1px solid #000",
                                display: "inline-block", paddingTop: 3, marginTop: 50,
                            }}>Authorised signatory</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* ════════════════ END INVOICE PAPER ════════════════ */}

            {/* ── RETURNS SECTION (if any) ── */}
            {inv.returns && inv.returns.length > 0 && (
                <div className="no-print" style={{ maxWidth: 860, margin: "24px auto 0", animation: "fadeIn 0.5s ease" }}>
                    <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--red)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <RotateCcw size={15} /> Associated Returns (Credit Notes)
                    </h3>
                    <div style={{ display: "grid", gap: 12 }}>
                        {inv.returns.map((ret: any) => (
                            <div key={ret.returnId} className="glass" style={{
                                padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
                                borderRadius: 16, border: "1px solid rgba(239,68,68,0.15)",
                                background: "rgba(239,68,68,0.03)", backdropFilter: "blur(10px)"
                            }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{ret.creditNoteNumber}</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                        {new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} — <span style={{ color: "var(--red)", fontWeight: 600 }}>{ret.reason}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 20 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>Refund Amount</div>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--red)", letterSpacing: "-0.5px" }}>- ₹{f2(ret.totalAmount)}</div>
                                    </div>
                                    <a href={`/returns/${ret.returnId}`} target="_blank" rel="noreferrer"
                                        className="btn btn-ghost" style={{ fontSize: 11, fontWeight: 800, padding: "8px 16px", background: "rgba(239,68,68,0.08)", color: "var(--red)", borderRadius: 10, textDecoration: "none", transition: "all 0.15s" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.14)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}>
                                        View Bill →
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PDF Status bar */}
            <div className="no-print" style={{ maxWidth: 860, margin: "16px auto 0" }}>
                <div className="glass" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>PDF Status</span>
                    <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, color: downloadUrl ? "var(--green)" : "#818cf8" }}>
                        {downloadUrl ? (
                            <><CheckCircle2 size={14} /> Ready — <a href={downloadUrl} target="_blank" rel="noreferrer" style={{ color: "var(--indigo-l)", textDecoration: "underline" }}>Download</a></>
                        ) : (
                            <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Generating… auto-refreshing every 5s</>
                        )}
                    </span>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    #invoice-paper { box-shadow: none !important; max-width: 100% !important; width: 100% !important; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </AuthGuard>
    );
}

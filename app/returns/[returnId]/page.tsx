"use client";
import { useQuery, useLazyQuery } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { GET_RETURN, GET_RETURN_DOWNLOAD_URL } from "@/lib/graphql/queries";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Printer, RotateCcw, Download, Clock, CheckCircle2, RefreshCw } from "lucide-react";

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

const REASON_LABELS: Record<string, string> = {
    DAMAGED: "Damaged Goods",
    WRONG_ITEM: "Wrong Item",
    QUALITY: "Quality Issue",
    OTHER: "Other",
};

const REFUND_LABELS: Record<string, string> = {
    CREDIT_NOTE: "Credit Note",
    CASH_REFUND: "Cash Refund",
};

export default function ReturnBillPage() {
    const params = useParams();
    const returnId = params.returnId as string;
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const { data, loading, error, refetch } = useQuery<any, any>(GET_RETURN, {
        variables: { returnId },
        fetchPolicy: "network-only",
        skip: !returnId,
    } as any);

    const [fetchDownloadUrl, { loading: urlLoading }] = useLazyQuery<any, any>(
        GET_RETURN_DOWNLOAD_URL,
        {
            variables: { returnId },
            fetchPolicy: "no-cache",
            onCompleted: (d: any) => {
                if (d?.getReturnDownloadUrl) setDownloadUrl(d.getReturnDownloadUrl);
            },
        } as any
    );

    const ret = data?.getReturn;

    useEffect(() => {
        if (ret?.pdfStatus === "READY") fetchDownloadUrl();
    }, [ret?.returnId, ret?.pdfStatus]);

    if (loading) return (
        <AuthGuard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 12, color: "var(--muted)" }}>
                <Loader2 size={22} style={{ animation: "spin 0.8s linear infinite" }} />
                <span>Loading credit note…</span>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </AuthGuard>
    );

    if (error || !ret) return (
        <AuthGuard>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 14, color: "var(--muted)" }}>
                <div style={{ fontSize: 40 }}>📋</div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Return not found</p>
                {error && <p style={{ fontSize: 12, color: "var(--red)" }}>{error.message}</p>}
                <a href="/returns" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <ArrowLeft size={13} /> All Returns
                </a>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </AuthGuard>
    );

    const items = ret.items || [];
    const SPACER_ROWS = Math.max(0, 12 - items.length);
    const dateStr = new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    /* ── Shared cell styles (same as invoice) ── */
    const th: React.CSSProperties = {
        borderRight: "1px solid #000",
        padding: "4px 5px",
        textAlign: "left",
        fontSize: 9,
        fontWeight: "bold",
        textTransform: "uppercase",
        background: "#ffd0d0",   // red-tinted header for return
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
                <a href="/returns" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>
                    <ArrowLeft size={14} /> All Returns
                </a>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <a href={`/billing/${ret.originalInvoiceId}`}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--indigo-l)", textDecoration: "none" }}>
                        Original Invoice →
                    </a>

                    {downloadUrl ? (
                        <a href={downloadUrl} target="_blank" rel="noreferrer"
                            className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <Download size={14} /> Download PDF
                        </a>
                    ) : urlLoading ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                            <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> Fetching PDF…
                        </span>
                    ) : (
                        <button onClick={() => refetch()}
                            className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--yellow)" }}>
                            <Clock size={13} /> PDF pending — refresh
                        </button>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="btn btn-primary"
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none" }}>
                        <Printer size={14} /> Print Now
                    </button>
                </div>
            </div>

            {/* ════════════════ CREDIT NOTE PAPER ════════════════ */}
            <div id="return-paper" style={{
                background: "#fff",
                color: "#000",
                border: "2px solid #cc0000",
                width: "100%",
                maxWidth: 860,
                margin: "0 auto",
                fontFamily: "Arial, sans-serif",
                fontSize: 10,
                lineHeight: 1.3,
                boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
            }}>

                {/* ── TOP HEADER ── */}
                <div style={{ display: "table", width: "100%", borderBottom: "2px solid #cc0000" }}>
                    {/* Left — Logo */}
                    <div style={{ display: "table-cell", width: "25%", padding: 5, verticalAlign: "middle" }}>
                        <div style={{ fontSize: 18, fontWeight: "bold", color: "#cc0000", fontStyle: "italic" }}>CloudHisaab</div>
                        <div style={{ fontSize: 8, color: "#555" }}>Smart Inventory Management</div>
                        <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 7, fontWeight: "bold", color: "#cc0000", border: "1px solid #cc0000", padding: "1px 5px", borderRadius: 2 }}>
                            <RotateCcw size={8} /> RETURN DOCUMENT
                        </div>
                    </div>

                    {/* Center — Business */}
                    <div style={{ display: "table-cell", width: "50%", padding: 5, textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ fontSize: 18, fontWeight: "bold", color: "#000080", textTransform: "uppercase", marginBottom: 2 }}>
                            {ret.businessName}
                        </div>
                        <div style={{ fontSize: 9 }}>{ret.businessAddress}</div>
                        {ret.businessPhone && (
                            <div style={{ marginTop: 3, fontSize: 9 }}>Phone: {ret.businessPhone}</div>
                        )}
                        {/* CREDIT NOTE badge */}
                        <div style={{
                            display: "inline-block",
                            border: "2px solid #cc0000",
                            background: "#fff0f0",
                            fontWeight: "bold",
                            padding: "2px 14px",
                            margin: "5px auto 0",
                            textTransform: "uppercase",
                            fontSize: 11,
                            color: "#cc0000",
                            letterSpacing: 1,
                        }}>
                            {REFUND_LABELS[ret.refundType] || "Credit Note"}
                        </div>
                    </div>

                    {/* Right — GSTIN */}
                    <div style={{ display: "table-cell", width: "25%", padding: 5, textAlign: "right", fontSize: 8, verticalAlign: "middle" }}>
                        {ret.businessGstin && <div><strong>GSTIN:</strong> {ret.businessGstin}</div>}
                    </div>
                </div>

                {/* ── BILLING + META ── */}
                <div style={{ display: "table", width: "100%", borderBottom: "1px solid #000" }}>
                    {/* Customer info */}
                    <div style={{ display: "table-cell", width: "50%", padding: 8, borderRight: "1px solid #000", verticalAlign: "top" }}>
                        <div style={{ fontSize: 8, fontWeight: "bold", color: "#cc0000", textTransform: "uppercase", marginBottom: 3 }}>Return To</div>
                        <div style={{ fontWeight: "bold", marginBottom: 2 }}>M/s {ret.customerName}</div>
                        {ret.customerAddress && <div>{ret.customerAddress}</div>}
                        {ret.customerPhone && <div>Phone: {ret.customerPhone}</div>}
                        <div style={{ marginTop: 6, padding: "5px 8px", background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 3, fontSize: 8 }}>
                            <strong>Reason:</strong> {REASON_LABELS[ret.reason] || ret.reason}
                            {ret.notes && <div style={{ marginTop: 2, color: "#666" }}>Note: {ret.notes}</div>}
                        </div>
                    </div>

                    {/* Meta table */}
                    <div style={{ display: "table-cell", width: "50%", padding: 8, verticalAlign: "top" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody style={{ fontSize: 9 }}>
                                {[
                                    ["Credit Note No.", ret.creditNoteNumber, "Date", dateStr],
                                    ["Orig. Invoice", ret.originalInvoiceNumber, "Refund Type", REFUND_LABELS[ret.refundType] || "Credit Note"],
                                    ["Restock", ret.restock ? "Yes" : "No", "Status", "Processed"],
                                ].map(([l1, v1, l2, v2]) => (
                                    <tr key={l1 as string}>
                                        <td style={{ width: "25%", fontWeight: "bold", padding: "2px 0", color: "#cc0000" }}>{l1}</td>
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
                    <thead style={{ background: "#ffd0d0", borderBottom: "1px solid #000" }}>
                        <tr>
                            <th style={{ ...th, ...C, width: 28 }}>#</th>
                            <th style={{ ...th }}>Product / Description</th>
                            <th style={{ ...th, ...R, width: 40 }}>Qty.</th>
                            <th style={{ ...th, ...R, width: 60 }}>Rate</th>
                            <th style={{ ...th, ...R, width: 40 }}>Tax%</th>
                            <th style={{ ...th, ...R, ...noRightBorder, width: 80 }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item: any, idx: number) => (
                            <tr key={item.productId || idx} style={{ borderBottom: "0.5px dotted #ccc" }}>
                                <td style={{ ...td, ...C }}>{idx + 1}</td>
                                <td style={{ ...td }}><b>{item.productName}</b></td>
                                <td style={{ ...td, ...R }}>{Number(item.quantity)}</td>
                                <td style={{ ...td, ...R }}>{f2(item.sellingPrice)}</td>
                                <td style={{ ...td, ...R }}>{item.gstRate}%</td>
                                <td style={{ ...td, ...R, ...noRightBorder }}>
                                    <b>{f2(item.lineTotalWithGst)}</b>
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

                {/* ── TOTALS SECTION ── */}
                <div style={{ display: "table", width: "100%", borderTop: "1px solid #000" }}>
                    {/* Left — words */}
                    <div style={{ display: "table-cell", width: "60%", padding: 10, verticalAlign: "top", borderRight: "1px solid #000", position: "relative" }}>
                        {/* Watermark */}
                        <div style={{
                            position: "absolute", top: "50%", left: "50%",
                            transform: "translate(-50%, -50%) rotate(-45deg)",
                            fontSize: 36, color: "rgba(204,0,0,0.07)",
                            pointerEvents: "none", whiteSpace: "nowrap", zIndex: 0,
                            fontWeight: "bold",
                        }}>
                            CREDIT NOTE
                        </div>

                        <div style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: 5, position: "relative", zIndex: 1 }}>Summary</div>
                        <table style={{ fontSize: 8, borderCollapse: "collapse", position: "relative", zIndex: 1 }}>
                            <tbody>
                                <tr><td style={{ paddingRight: 20, width: "30%" }}>Taxable Amount:</td><td>₹{f2(ret.subtotal)}</td></tr>
                                <tr><td>Total GST:</td><td>₹{f2(ret.totalGst)}</td></tr>
                                <tr><td>Credit Note No.:</td><td>{ret.creditNoteNumber}</td></tr>
                                <tr><td>Against Invoice:</td><td>{ret.originalInvoiceNumber}</td></tr>
                            </tbody>
                        </table>
                        <div style={{ marginTop: 15, fontWeight: "bold", fontStyle: "italic", fontSize: 11, position: "relative", zIndex: 1 }}>
                            Refund Amount: Rupees {num2wordsIndian(ret.totalAmount)} Only
                        </div>
                    </div>

                    {/* Right — totals */}
                    <div style={{ display: "table-cell", width: "40%", padding: 0, verticalAlign: "top" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                                {[
                                    ["SUBTOTAL", f2(ret.subtotal)],
                                    ["Total GST", f2(ret.totalGst)],
                                    ["Roundoff", "0.00"],
                                ].map(([label, val]) => (
                                    <tr key={label}>
                                        <td style={{ padding: "4px 8px", fontWeight: "bold", borderBottom: "1px solid #000" }}>{label}</td>
                                        <td style={{ padding: "4px 8px", textAlign: "right", borderBottom: "1px solid #000", width: 100 }}>{val}</td>
                                    </tr>
                                ))}
                                <tr style={{ background: "#fff0f0" }}>
                                    <td style={{ padding: "4px 8px", fontWeight: "bold", fontSize: 14, color: "#cc0000" }}>CREDIT TOTAL</td>
                                    <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "bold", fontSize: 14, width: 100, color: "#cc0000" }}>₹{f2(ret.totalAmount)}</td>
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
                        1. This credit note is issued against the original invoice mentioned above.<br />
                        2. Credit notes are valid for 30 days from date of issue.<br />
                        3. {ret.refundType === "CASH_REFUND" ? "Cash refund will be processed within 3-5 business days." : "Credit will be adjusted against future purchases."}<br />
                        4. All disputes subject to local jurisdiction only.<br />
                        <div style={{ marginTop: 8 }}>
                            Certified that the goods mentioned above have been returned and verified.
                        </div>
                    </div>

                    {/* Signatory */}
                    <div style={{ display: "table-cell", width: "40%", padding: 8, textAlign: "right", verticalAlign: "bottom" }}>
                        <div style={{ fontWeight: "bold", marginBottom: 5 }}>For {ret.businessName}</div>
                        <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>
                            <span style={{
                                fontSize: 9, borderTop: "1px solid #000",
                                display: "inline-block", paddingTop: 3, marginTop: 50,
                            }}>Authorised Signatory</span>
                        </div>
                    </div>
                </div>

                {/* ── DUPLICATE COPY NOTICE ── */}
                <div style={{ borderTop: "1px dashed #cc0000", textAlign: "center", padding: "4px", fontSize: 8, color: "#cc0000", fontWeight: "bold" }}>
                    — Customer Copy — This is a computer-generated document —
                </div>
            </div>
            {/* ════════════════ END CREDIT NOTE ════════════════ */}

            {/* PDF Status bar */}
            <div className="no-print" style={{ maxWidth: 860, margin: "16px auto 0" }}>
                <div className="glass" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>PDF Status</span>
                    <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, color: downloadUrl ? "var(--green)" : "var(--yellow)" }}>
                        {downloadUrl
                            ? <><CheckCircle2 size={14} /> Ready — <a href={downloadUrl} target="_blank" rel="noreferrer" style={{ color: "var(--indigo-l)", textDecoration: "underline" }}>Download</a></>
                            : <><Clock size={14} /> Generating (Auto-refetches on ready)…</>}
                    </span>
                    {!downloadUrl && (
                        <button onClick={() => refetch()} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>
                            <RefreshCw size={11} /> Manual Refresh
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    #return-paper { box-shadow: none !important; max-width: 100% !important; width: 100% !important; border: 2px solid #cc0000 !important; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </AuthGuard>
    );
}

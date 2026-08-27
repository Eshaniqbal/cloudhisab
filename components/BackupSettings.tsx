"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_BACKUP_STATUS } from "@/lib/graphql/queries";
import {
    GET_GOOGLE_DRIVE_CONNECT_URL,
    DISCONNECT_GOOGLE_DRIVE,
    TRIGGER_BACKUP_NOW,
    SET_BACKUP_PDF_SYNC,
} from "@/lib/graphql/mutations";
import {
    HardDrive, Loader2, CheckCircle2, AlertTriangle, RefreshCw,
    ExternalLink, Unplug, Cloud, ShieldCheck,
} from "lucide-react";

// ── helpers ─────────────────────────────────────────────────────────────────

function friendlyError(msg: string): string {
    if (msg?.startsWith("UPGRADE_REQUIRED|")) {
        return msg.split("|")[2] || "This feature requires a paid plan.";
    }
    return msg;
}

function fmtDateTime(iso?: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    SUCCESS: { label: "Success", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    RUNNING: { label: "Running", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    ERROR:   { label: "Failed",  color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

// ── component ───────────────────────────────────────────────────────────────

export function BackupSettings() {
    const { data, loading, refetch } = useQuery<any>(GET_BACKUP_STATUS, {
        fetchPolicy: "cache-and-network",
    });
    const [getConnectUrl, { loading: connecting }] = useMutation(GET_GOOGLE_DRIVE_CONNECT_URL);
    const [disconnect, { loading: disconnecting }] = useMutation(DISCONNECT_GOOGLE_DRIVE);
    const [backupNow, { loading: backingUp }]     = useMutation(TRIGGER_BACKUP_NOW);
    const [setPdfSync]                            = useMutation(SET_BACKUP_PDF_SYNC);

    const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    const status = data?.getBackupStatus;
    const isRunning = status?.lastBackupStatus === "RUNNING";

    // ── Pick up the OAuth redirect result (?gdrive=connected|error) ──
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const gdrive = params.get("gdrive");
        if (gdrive === "connected") {
            setBanner({ type: "ok", text: "Google Drive connected! Your first backup runs at 9 AM — or click \u201CBackup Now\u201D." });
        } else if (gdrive === "error") {
            setBanner({ type: "err", text: friendlyError(params.get("msg") || "Could not connect Google Drive.") });
        }
        if (gdrive) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

    // ── Poll while a manual backup is running ──
    useEffect(() => {
        if (!isRunning) return;
        const t = setInterval(() => refetch(), 8000);
        return () => clearInterval(t);
    }, [isRunning, refetch]);

    const handleConnect = async () => {
        setBanner(null);
        try {
            const res = await getConnectUrl();
            window.location.href = res.data.getGoogleDriveConnectUrl;
        } catch (e: any) {
            setBanner({ type: "err", text: friendlyError(e.message) });
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Disconnect Google Drive? Automatic backups will stop. Files already in your Drive stay untouched.")) return;
        try {
            await disconnect();
            setBanner({ type: "ok", text: "Google Drive disconnected." });
            refetch();
        } catch (e: any) {
            setBanner({ type: "err", text: friendlyError(e.message) });
        }
    };

    const handleBackupNow = async () => {
        setBanner(null);
        try {
            await backupNow();
            setBanner({ type: "ok", text: "Backup started — this page will update when it finishes." });
            refetch();
        } catch (e: any) {
            setBanner({ type: "err", text: friendlyError(e.message) });
        }
    };

    // ── shared styles ──
    const btnPrimary: React.CSSProperties = {
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer",
        background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff",
        fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
    };
    const btnGhost: React.CSSProperties = {
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 18px", borderRadius: 10, cursor: "pointer",
        background: "var(--bg-input)", color: "var(--text)",
        border: "1px solid var(--border)", fontSize: 13, fontWeight: 700,
    };

    if (loading && !status) {
        return <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}><Loader2 className="spin" /> Loading backup status…</div>;
    }

    return (
        <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 20, overflow: "hidden", animation: "slideDown 0.2s ease",
        }}>
            {/* header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-card2)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <HardDrive size={14} color="#6366f1" />
                </div>
                <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>Google Drive Backup</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Automatic daily backup of your business data at 9:00 AM</div>
                </div>
            </div>

            <div style={{ padding: "28px" }}>
                {banner && (
                    <div style={{
                        padding: "12px 16px", borderRadius: 12, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start",
                        background: banner.type === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                        border: "1px solid", borderColor: banner.type === "ok" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                        color: banner.type === "ok" ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 600,
                    }}>
                        {banner.type === "ok" ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
                        {banner.text}
                    </div>
                )}

                {/* ── Not connected ── */}
                {!status?.connected ? (
                    <div style={{ textAlign: "center", padding: "24px 12px" }}>
                        <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(99,102,241,0.1)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                            <Cloud size={30} color="#6366f1" />
                        </div>
                        <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Never lose your business data</h4>
                        <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 460, margin: "0 auto 8px", lineHeight: 1.6 }}>
                            Connect your Google account and CloudHisaab will back up <strong>customers, invoices, balances, ledger, products, purchases, expenses and stock</strong> to your own Drive every morning — as Excel-ready CSV files.
                        </p>
                        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 24 }}>
                            <ShieldCheck size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                            Only a dedicated backup folder is created — CloudHisaab can never see your other Drive files.
                        </p>
                        <button onClick={handleConnect} disabled={connecting} style={{ ...btnPrimary, opacity: connecting ? 0.6 : 1 }}>
                            {connecting ? <Loader2 className="spin" size={15} /> : <Cloud size={15} />}
                            {connecting ? "Preparing…" : "Connect Google Drive"}
                        </button>
                    </div>
                ) : (
                    /* ── Connected ── */
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* status row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                            <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Connected Account</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                                    {status.googleEmail || "Google account"}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Since {fmtDateTime(status.connectedAt)}</div>
                            </div>
                            <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Last Backup</div>
                                {status.lastBackupStatus && STATUS_META[status.lastBackupStatus] ? (
                                    <span style={{
                                        display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 99,
                                        background: STATUS_META[status.lastBackupStatus].bg,
                                        color: STATUS_META[status.lastBackupStatus].color, fontSize: 11, fontWeight: 700,
                                    }}>
                                        {status.lastBackupStatus === "RUNNING"
                                            ? <Loader2 className="spin" size={11} />
                                            : status.lastBackupStatus === "SUCCESS" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                                        {STATUS_META[status.lastBackupStatus].label}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Not yet run</span>
                                )}
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{fmtDateTime(status.lastBackupAt)}</div>
                            </div>
                            <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Backup Folder</div>
                                {status.folderLink ? (
                                    <a href={status.folderLink} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                                        Open in Drive <ExternalLink size={12} />
                                    </a>
                                ) : (
                                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Created on first backup</span>
                                )}
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>“CloudHisaab Backup”</div>
                            </div>
                        </div>

                        {status.lastError ? (
                            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12 }}>
                                Last error: {status.lastError}
                            </div>
                        ) : null}

                        {/* PDF toggle */}
                        <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--bg-card2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <FileIcon /> Also back up invoice &amp; return PDFs
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                                    Copies every PDF into a <code>pdfs/</code> subfolder. Data CSVs are always backed up.
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    try { await setPdfSync({ variables: { enabled: !status.pdfSyncEnabled } }); refetch(); }
                                    catch (e: any) { setBanner({ type: "err", text: friendlyError(e.message) }); }
                                }}
                                style={{
                                    position: "relative", width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer",
                                    background: status.pdfSyncEnabled ? "#6366f1" : "var(--border)", transition: "background 0.2s", flexShrink: 0,
                                }}
                            >
                                <span style={{
                                    position: "absolute", top: 3, left: status.pdfSyncEnabled ? 23 : 3,
                                    width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                                }} />
                            </button>
                        </div>

                        {/* actions */}
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button onClick={handleBackupNow} disabled={backingUp || isRunning} style={{ ...btnPrimary, opacity: backingUp || isRunning ? 0.6 : 1 }}>
                                {backingUp || isRunning ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}
                                {isRunning ? "Backup running…" : "Backup Now"}
                            </button>
                            <button onClick={handleDisconnect} disabled={disconnecting} style={{ ...btnGhost, opacity: disconnecting ? 0.6 : 1 }}>
                                {disconnecting ? <Loader2 className="spin" size={15} /> : <Unplug size={15} />}
                                Disconnect
                            </button>
                        </div>

                        <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
                            Backups run automatically every day at <strong>9:00 AM IST</strong>. Each run refreshes your
                            customers, invoices, balances, ledger, products, purchases, expenses and stock as CSV files
                            in the backup folder.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function FileIcon() {
    return <HardDrive size={14} color="#818cf8" />;
}

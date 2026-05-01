export type UpgradeRequired = {
  feature: string;
  message: string;
};

/**
 * Backend throws errors like:
 *   "UPGRADE_REQUIRED|FEATURE|Human readable message"
 *
 * This helper parses that into a structured object.
 */
export function parseUpgradeRequired(errMessage?: string | null): UpgradeRequired | null {
  const msg = (errMessage || "").trim();
  if (!msg.startsWith("UPGRADE_REQUIRED|")) return null;
  const parts = msg.split("|");
  if (parts.length < 3) return { feature: "UNKNOWN", message: msg };
  const feature = parts[1] || "UNKNOWN";
  const message = parts.slice(2).join("|").trim() || "This feature is locked. Upgrade to unlock.";
  return { feature, message };
}


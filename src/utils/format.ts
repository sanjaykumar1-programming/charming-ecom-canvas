const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

/** Integer cents -> display string. Arithmetic stays in integer cents elsewhere. */
export const formatMoney = (cents: number | undefined | null) => inr.format(Math.round(cents ?? 0) / 100);

/** "499.00" -> 49900 without float errors. */
export function toCents(input: string): number | null {
  const m = input.trim().match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!m) return null;
  return parseInt(m[1] ?? "0", 10) * 100 + parseInt((m[2] ?? "").padEnd(2, "0") || "0", 10);
}

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const formatDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const humanize = (v?: string) =>
  (v ?? "").toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export const shortId = (id: string) => id.slice(-8).toUpperCase();

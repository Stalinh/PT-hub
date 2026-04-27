export function levelClass(level) {
  return `level-${String(level).toLowerCase()}`;
}

export function statusClass(status) {
  if (status === "in design") return "status-design";
  if (status === "finished") return "status-finished";
  if (status === "installing") return "status-installing";
  return "status-installed";
}

export function taskStatusClass(status) {
  if (status === "done") return "status-finished";
  if (status === "doing") return "status-installing";
  return "status-design";
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function clampProgress(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

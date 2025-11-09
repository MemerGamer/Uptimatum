export function generateBadge(status: string, uptime: number): string {
  const color =
    status === "up" ? "#4ade80" : status === "degraded" ? "#fbbf24" : "#f87171";
  const label = status.toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20">
  <rect width="60" height="20" fill="#555"/>
  <rect x="60" width="50" height="20" fill="${color}"/>
  <rect x="110" width="50" height="20" fill="#555"/>
  <text x="30" y="14" fill="#fff" font-family="Arial" font-size="11" text-anchor="middle">status</text>
  <text x="85" y="14" fill="#fff" font-family="Arial" font-size="11" text-anchor="middle">${label}</text>
  <text x="135" y="14" fill="#fff" font-family="Arial" font-size="11" text-anchor="middle">${uptime.toFixed(
    1
  )}%</text>
</svg>`;
}

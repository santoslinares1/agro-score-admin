// Uptime del proceso Node (segundos) — se resetea en cada deploy/restart
// del backend, no es "uptime del servidor". Ver GET /admin/system/health.
export function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} s`;
  }

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 1) {
    return `${minutes} min`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days < 1) {
    return remainingHours > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  return remainingHours > 0 ? `${days} d ${remainingHours} h` : `${days} d`;
}

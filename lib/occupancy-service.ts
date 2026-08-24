import { getStats } from "./seat-service";

export async function getOccupancySummary() {
  const stats = await getStats();
  const occupiedPercentage = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0;
  return { ...stats, occupiedPercentage };
}

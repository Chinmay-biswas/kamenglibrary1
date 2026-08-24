import { getActiveGeofences } from "./seat-service";

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export async function checkGeofence(latitude: number, longitude: number, forGate = true, forSeat = true) {
  const geofences = await getActiveGeofences();
  const matches = geofences.filter((item) => (forGate ? item.appliesToGate : item.appliesToSeats));
  for (const geofence of matches) {
    if (distanceMeters(latitude, longitude, geofence.latitude, geofence.longitude) <= geofence.radiusMeters) {
      return { inside: true, geofenceId: geofence.id, distanceMeters: 0 };
    }
  }
  return { inside: false, geofenceId: undefined, distanceMeters: undefined };
}

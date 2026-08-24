import { checkGeofence } from "./geofence-service";

export async function validateGateScan(latitude: number, longitude: number) {
  return checkGeofence(latitude, longitude, true, false);
}

export async function validateSeatScan(latitude: number, longitude: number) {
  return checkGeofence(latitude, longitude, false, true);
}

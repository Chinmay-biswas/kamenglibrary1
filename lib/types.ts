export type SeatStatus = "AVAILABLE" | "OCCUPIED" | "GRACE" | "MAINTENANCE" | "DISABLED";

export type SeatRecord = {
  id: string;
  code: string;
  label: string;
  status: SeatStatus;
  qrVersion: number;
  zone?: string;
  floor?: string;
  assignedTo?: string;
  occupiedUntil?: string;
  graceUntil?: string;
};

export type LayoutElementType = "ROOM" | "SEAT" | "WALL" | "DOOR" | "TABLE" | "PILLAR" | "LABEL";

export type LayoutElementRecord = {
  id: string;
  type: LayoutElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
  seatId?: string;
  floor?: string;
  zone?: string;
  color?: string;
};

export type LayoutBlueprintRecord = {
  id: string;
  name: string;
  elements: LayoutElementRecord[];
  seats: SeatRecord[];
  createdAt: string;
  updatedAt: string;
};

export type GeofenceRecord = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enabled: boolean;
  appliesToGate: boolean;
  appliesToSeats: boolean;
};

export type SeatChallengeRecord = {
  id: string;
  seatId: string;
  challengerId: string;
  ownerId: string;
  status: "PENDING" | "RESOLVED" | "EXPIRED" | "CANCELLED";
  createdAt: string;
  expiresAt: string;
};

export type LibraryStats = {
  total: number;
  free: number;
  occupied: number;
  grace: number;
  maintenance: number;
  disabled: number;
};

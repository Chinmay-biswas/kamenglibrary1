"use client";

import type { LayoutElementRecord, SeatRecord } from "@/lib/types";
import { StatusBadge } from "@/components/ui";

type LayoutBounds = { minX: number; minY: number; width: number; height: number };

function rotatedBounds(element: LayoutElementRecord) {
  const rotation = ((element.rotation ?? 0) * Math.PI) / 180;
  const width = Math.abs(element.width * Math.cos(rotation)) + Math.abs(element.height * Math.sin(rotation));
  const height = Math.abs(element.width * Math.sin(rotation)) + Math.abs(element.height * Math.cos(rotation));
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  return { minX: centerX - width / 2, minY: centerY - height / 2, maxX: centerX + width / 2, maxY: centerY + height / 2 };
}

function getLayoutBounds(elements: LayoutElementRecord[]): LayoutBounds {
  if (!elements.length) return { minX: 0, minY: 0, width: 100, height: 100 };
  const bounds = elements.map(rotatedBounds);
  const minX = Math.min(0, ...bounds.map((item) => item.minX));
  const minY = Math.min(0, ...bounds.map((item) => item.minY));
  const maxX = Math.max(100, ...bounds.map((item) => item.maxX));
  const maxY = Math.max(100, ...bounds.map((item) => item.maxY));
  return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function elementStyle(element: LayoutElementRecord, bounds: LayoutBounds) {
  const inset = 4;
  const drawableArea = 100 - inset * 2;
  return {
    left: `${inset + ((element.x - bounds.minX) / bounds.width) * drawableArea}%`,
    top: `${inset + ((element.y - bounds.minY) / bounds.height) * drawableArea}%`,
    width: `${(element.width / bounds.width) * drawableArea}%`,
    height: `${(element.height / bounds.height) * drawableArea}%`,
    transform: `rotate(${element.rotation ?? 0}deg)`,
    backgroundColor: element.type === "ROOM" ? element.color : undefined
  };
}

export function LibraryMap({
  elements,
  seats,
  selectedSeatId,
  onSeatSelect
}: {
  elements: LayoutElementRecord[];
  seats: SeatRecord[];
  selectedSeatId?: string;
  onSeatSelect?: (seat: SeatRecord) => void;
}) {
  const seatsById = new Map(seats.map((seat) => [seat.id, seat]));
  const bounds = getLayoutBounds(elements);
  const ordered = [...elements].sort((a, b) => {
    const order = { ROOM: 0, TABLE: 1, WALL: 2, DOOR: 3, PILLAR: 4, LABEL: 5, SEAT: 6 };
    return order[a.type] - order[b.type];
  });

  return (
    <div className="library-map" aria-label="Library floor plan">
      {ordered.map((element) => {
        const seat = element.seatId ? seatsById.get(element.seatId) : undefined;
        if (element.type === "SEAT" && seat) {
          return (
            <button
              className={`map-element map-seat seat-${seat.status.toLowerCase()} ${selectedSeatId === seat.id ? "is-selected" : ""}`}
              key={element.id}
              style={elementStyle(element, bounds)}
              type="button"
              onClick={() => onSeatSelect?.(seat)}
              title={`${seat.code}: ${seat.status.toLowerCase()}`}
            >
              <span>{seat.code}</span>
            </button>
          );
        }
        return (
          <div className={`map-element map-${element.type.toLowerCase()}`} key={element.id} style={elementStyle(element, bounds)} title={element.label}>
            {element.label && <span>{element.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="map-legend" aria-label="Seat status legend">
      <StatusBadge status="AVAILABLE" />
      <StatusBadge status="OCCUPIED" />
      <StatusBadge status="GRACE" />
      <StatusBadge status="MAINTENANCE" />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { LayoutBlueprintRecord, LayoutElementRecord, LayoutElementType, SeatRecord } from "@/lib/types";
import { StatusBadge } from "@/components/ui";

type Tool = "SELECT" | LayoutElementType;
type Draft = { label: string; code: string; zone: string; floor: string; width: string; height: string; color: string };
type QueuedElementSave = { element: LayoutElementRecord; changes: Record<string, unknown>; timer: ReturnType<typeof setTimeout> };
type DragState = { id: string; ids: string[]; startX: number; startY: number; originals: LayoutElementRecord[]; updates: LayoutElementRecord[] };
type TransformHistoryEntry = { kind: "transform"; changes: Array<{ id: string; before: LayoutElementRecord; after: LayoutElementRecord }> };
type DeleteHistoryEntry = { kind: "delete"; snapshots: LayoutElementRecord[]; activeIds: string[] };
type LayoutHistoryEntry = TransformHistoryEntry | DeleteHistoryEntry;

const tools: Array<{ type: Tool; label: string; width?: number; height?: number }> = [
  { type: "SELECT", label: "Select / move" },
  { type: "SEAT", label: "Place seat", width: 6, height: 8 },
  { type: "ROOM", label: "Add room", width: 28, height: 24 },
  { type: "WALL", label: "Add wall", width: 2, height: 22 },
  { type: "DOOR", label: "Add door", width: 13, height: 2 },
  { type: "TABLE", label: "Add table", width: 20, height: 10 },
  { type: "PILLAR", label: "Add pillar", width: 4, height: 4 },
  { type: "LABEL", label: "Add label", width: 18, height: 4 }
];

const emptyDraft: Draft = { label: "", code: "", zone: "A", floor: "Ground", width: "", height: "", color: "#d9e8dc" };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function styleFor(element: LayoutElementRecord, zoom: number, pan: { x: number; y: number }) {
  const centerOffset = 50 - 50 / zoom;
  return {
    left: `${(element.x - pan.x - centerOffset) * zoom}%`,
    top: `${(element.y - pan.y - centerOffset) * zoom}%`,
    width: `${element.width * zoom}%`,
    height: `${element.height * zoom}%`,
    fontSize: `${zoom}em`,
    transform: `rotate(${element.rotation ?? 0}deg)`,
    backgroundColor: element.type === "ROOM" ? element.color : undefined
  };
}

export function LayoutEditor({ initialElements, initialSeats, initialBlueprints }: { initialElements: LayoutElementRecord[]; initialSeats: SeatRecord[]; initialBlueprints: LayoutBlueprintRecord[] }) {
  const [elements, setElements] = useState(initialElements);
  const [seats, setSeats] = useState(initialSeats);
  const [tool, setTool] = useState<Tool>("SELECT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [blueprints, setBlueprints] = useState(initialBlueprints);
  const [blueprintName, setBlueprintName] = useState("");
  const [blueprintWorking, setBlueprintWorking] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragPositionRef = useRef<DragState | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startY: number; width: number; height: number; finalWidth: number; finalHeight: number; original: LayoutElementRecord } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const spaceHeldRef = useRef(false);
  const silentSavesRef = useRef(new Map<string, QueuedElementSave>());
  const historyRef = useRef<LayoutHistoryEntry[]>([]);
  const historyIndexRef = useRef(0);
  const keyboardActionsRef = useRef<{
    restoreHistory: (direction: "undo" | "redo") => Promise<void>;
    removeLayoutItems: (ids: string[]) => Promise<void>;
    nudgeSelected: (dx: number, dy: number) => Promise<void>;
  } | null>(null);

  const selected = elements.find((element) => element.id === selectedId);
  const selectedSeat = selected?.seatId ? seats.find((seat) => seat.id === selected.seatId) : undefined;

  keyboardActionsRef.current = { restoreHistory, removeLayoutItems, nudgeSelected };

  useEffect(() => {
    if (!selected) {
      setProperties({});
      return;
    }
    setProperties({
      label: selected.label ?? "",
      x: String(selected.x),
      y: String(selected.y),
      width: String(selected.width),
      height: String(selected.height),
      rotation: String(selected.rotation ?? 0),
      zone: selected.zone ?? "",
      floor: selected.floor ?? "",
      color: selected.color ?? "#d9e8dc",
      seatCode: selectedSeat?.code ?? "",
      seatLabel: selectedSeat?.label ?? ""
    });
  }, [selected, selectedSeat]);

  function chooseTool(nextTool: Tool) {
    setTool(nextTool);
    setError("");
    setMessage(nextTool === "SELECT" ? "Select an element to move or edit it." : `Click an empty point on the map to place a ${nextTool.toLowerCase()}.`);
  }

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function flushQueuedElementSaves() {
    const queued = [...silentSavesRef.current.values()];
    for (const item of queued) clearTimeout(item.timer);
    silentSavesRef.current.clear();
    await Promise.all(queued.map((item) => persistElement(item.element, item.changes, false)));
  }

  async function saveBlueprint() {
    setBlueprintWorking(true);
    setError("");
    try {
      await flushQueuedElementSaves();
      const response = await fetch("/api/admin/layout/blueprints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: blueprintName }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save the blueprint.");
      const blueprint = body.blueprint as LayoutBlueprintRecord;
      setBlueprints((items) => [blueprint, ...items.filter((item) => item.id !== blueprint.id)]);
      setBlueprintName("");
      setMessage(`Blueprint “${blueprint.name}” saved with ${blueprint.elements.length} layout items.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the blueprint.");
    } finally {
      setBlueprintWorking(false);
    }
  }

  async function applyBlueprint(blueprint: LayoutBlueprintRecord) {
    setBlueprintWorking(true);
    setError("");
    try {
      await flushQueuedElementSaves();
      const response = await fetch(`/api/admin/layout/blueprints/${blueprint.id}/apply`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not apply the blueprint.");
      setElements(body.elements as LayoutElementRecord[]);
      setSeats(body.seats as SeatRecord[]);
      setSelectedId(null);
      setSelectedIds([]);
      historyRef.current = [];
      historyIndexRef.current = 0;
      setHistoryVersion((value) => value + 1);
      setMessage(`Blueprint “${blueprint.name}” is now the live floor plan.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not apply the blueprint.");
    } finally {
      setBlueprintWorking(false);
    }
  }

  async function deleteBlueprint(blueprint: LayoutBlueprintRecord) {
    setBlueprintWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/layout/blueprints/${blueprint.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not delete the blueprint.");
      setBlueprints((items) => items.filter((item) => item.id !== blueprint.id));
      setMessage(`Blueprint “${blueprint.name}” deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the blueprint.");
    } finally {
      setBlueprintWorking(false);
    }
  }

  function updateZoom(nextZoom: number) {
    setZoom(Number(clamp(nextZoom, 0.0001, 1000).toPrecision(5)));
  }

  function pointOnBoard(clientX: number, clientY: number) {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerOffset = 50 - 50 / zoom;
    return {
      x: ((clientX - rect.left) / rect.width) * 100 / zoom + pan.x + centerOffset,
      y: ((clientY - rect.top) / rect.height) * 100 / zoom + pan.y + centerOffset
    };
  }

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    if (!canvasRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { startX: event.clientX, startY: event.clientY, x: pan.x, y: pan.y };
    setPanning(true);
  }

  function beginCanvasPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (tool === "SELECT" && event.button === 0 && event.target === event.currentTarget && selectedIds.length) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }
    if (event.button === 1 || spaceHeldRef.current || (tool === "SELECT" && event.target === event.currentTarget)) startPan(event);
  }

  async function placeElement(event: React.PointerEvent<HTMLDivElement>) {
    if (tool === "SELECT" || !canvasRef.current) {
      if (tool === "SELECT") { setSelectedId(null); setSelectedIds([]); }
      return;
    }
    const toolDefinition = tools.find((item) => item.type === tool);
    const width = Number(draft.width) || toolDefinition?.width || 10;
    const height = Number(draft.height) || toolDefinition?.height || 8;
    const point = pointOnBoard(event.clientX, event.clientY);
    if (!point) return;
    const x = clamp(point.x - width / 2, -10000, 10000);
    const y = clamp(point.y - height / 2, -10000, 10000);
    const payload = {
      type: tool,
      x: Math.round(x * 2) / 2,
      y: Math.round(y * 2) / 2,
      width,
      height,
      label: draft.label,
      code: draft.code,
      zone: draft.zone,
      floor: draft.floor,
      color: draft.color
    };
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/layout/elements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not add this element.");
      const element = body.element as LayoutElementRecord;
      setElements((items) => [...items, element]);
      if (body.seat) setSeats((items) => [...items, body.seat as SeatRecord]);
      setSelectedId(element.id);
      setSelectedIds([element.id]);
      setMessage(tool === "SEAT" ? `${element.label} has been created and placed on the map.` : `${tool[0]}${tool.slice(1).toLowerCase()} added to the layout.`);
      setTool("SELECT");
      setDraft((current) => ({ ...current, label: "", code: "", width: "", height: "" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add this element.");
    } finally {
      setSaving(false);
    }
  }

  function selectElement(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (tool !== "SELECT") return;
    event.stopPropagation();
    if (event.shiftKey) {
      setSelectedIds((items) => {
        const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
        setSelectedId((current) => current === id ? (next[0] ?? null) : id);
        return next;
      });
      return;
    }
    const movingSelection = selectedIds.includes(id) && selectedIds.length > 1;
    const ids = movingSelection ? selectedIds : [id];
    setSelectedId(id);
    if (!movingSelection) setSelectedIds(ids);
    setDraggedId(id);
    const point = pointOnBoard(event.clientX, event.clientY);
    const originals = elements.filter((element) => ids.includes(element.id)).map((element) => ({ ...element }));
    if (point && originals.length) dragPositionRef.current = { id, ids, startX: point.x, startY: point.y, originals, updates: originals };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startResize(event: React.PointerEvent<HTMLSpanElement>, element: LayoutElementRecord) {
    if (tool !== "SELECT") return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(element.id);
    setSelectedIds([element.id]);
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = { id: element.id, startX: event.clientX, startY: event.clientY, width: element.width, height: element.height, finalWidth: element.width, finalHeight: element.height, original: { ...element } };
    setResizingId(element.id);
  }

  function moveSelected(event: React.PointerEvent<HTMLDivElement>) {
    if (canvasRef.current && panRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPan({ x: panRef.current.x - (((event.clientX - panRef.current.startX) / rect.width) * 100) / zoom, y: panRef.current.y - (((event.clientY - panRef.current.startY) / rect.height) * 100) / zoom });
      return;
    }
    if (resizingId && canvasRef.current && resizeRef.current?.id === resizingId) {
      const current = elements.find((item) => item.id === resizingId);
      if (!current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const width = clamp(resizeRef.current.width + (((event.clientX - resizeRef.current.startX) / rect.width) * 100) / zoom, 1, 1000);
      const height = clamp(resizeRef.current.height + (((event.clientY - resizeRef.current.startY) / rect.height) * 100) / zoom, 1, 1000);
      const finalWidth = Math.round(width * 2) / 2;
      const finalHeight = Math.round(height * 2) / 2;
      resizeRef.current.finalWidth = finalWidth;
      resizeRef.current.finalHeight = finalHeight;
      setElements((items) => items.map((item) => item.id === resizingId ? { ...item, width: finalWidth, height: finalHeight } : item));
      return;
    }
    if (!draggedId || !canvasRef.current) return;
    const point = pointOnBoard(event.clientX, event.clientY);
    const drag = dragPositionRef.current?.id === draggedId ? dragPositionRef.current : null;
    if (!point || !drag) return;
    const deltaX = Math.round((point.x - drag.startX) * 2) / 2;
    const deltaY = Math.round((point.y - drag.startY) * 2) / 2;
    const updates = drag.originals.map((element) => ({ ...element, x: clamp(element.x + deltaX, -10000, 10000), y: clamp(element.y + deltaY, -10000, 10000) }));
    drag.updates = updates;
    const byId = new Map(updates.map((element) => [element.id, element]));
    setElements((items) => items.map((item) => byId.get(item.id) ?? item));
  }

  async function finishMove() {
    if (panRef.current) {
      setPanning(false);
      panRef.current = null;
      return;
    }
    if (resizingId) {
      const element = elements.find((item) => item.id === resizingId);
      const finalSize = resizeRef.current?.id === resizingId ? resizeRef.current : null;
      setResizingId(null);
      resizeRef.current = null;
      if (element) {
        const updated = { ...element, width: finalSize?.finalWidth ?? element.width, height: finalSize?.finalHeight ?? element.height };
        if (finalSize) recordHistory([{ id: updated.id, before: finalSize.original, after: updated }]);
        queueSilentElementSave(updated, { width: updated.width, height: updated.height });
      }
      return;
    }
    if (!draggedId) return;
    const finalPosition = dragPositionRef.current?.id === draggedId ? dragPositionRef.current : null;
    setDraggedId(null);
    dragPositionRef.current = null;
    if (!finalPosition) return;
    const originalsById = new Map(finalPosition.originals.map((element) => [element.id, element]));
    const changed = finalPosition.updates.filter((element) => {
      const original = originalsById.get(element.id);
      return original && (original.x !== element.x || original.y !== element.y);
    });
    recordHistory(changed.map((element) => ({ id: element.id, before: originalsById.get(element.id)!, after: element })));
    for (const element of changed) queueSilentElementSave(element, { x: element.x, y: element.y });
  }

  async function persistElement(element: LayoutElementRecord, changes: Record<string, unknown>, report = true) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/layout/elements/${element.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save the layout element.");
      const updated = body.element as LayoutElementRecord;
      setElements((items) => items.map((item) => item.id === updated.id ? updated : item));
      if (report) setMessage("Layout changes saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the layout element.");
    } finally {
      setSaving(false);
    }
  }

  function queueSilentElementSave(element: LayoutElementRecord, changes: Record<string, unknown>) {
    const existing = silentSavesRef.current.get(element.id);
    if (existing) clearTimeout(existing.timer);
    const next = { element: { ...element, ...changes }, changes: { ...existing?.changes, ...changes } };
    const timer = setTimeout(() => {
      silentSavesRef.current.delete(element.id);
      void (async () => {
        try {
          const response = await fetch(`/api/admin/layout/elements/${element.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next.changes) });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Could not save the layout change.");
          const saved = body.element as LayoutElementRecord;
          setElements((items) => items.map((item) => item.id === saved.id ? saved : item));
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Could not save the layout change.");
        }
      })();
    }, 450);
    silentSavesRef.current.set(element.id, { ...next, timer });
  }

  function recordHistory(changes: TransformHistoryEntry["changes"]) {
    const meaningful = changes.filter((change) => change.before.x !== change.after.x || change.before.y !== change.after.y || change.before.width !== change.after.width || change.before.height !== change.after.height || change.before.rotation !== change.after.rotation);
    if (!meaningful.length) return;
    historyRef.current = [...historyRef.current.slice(0, historyIndexRef.current), { kind: "transform", changes: meaningful }];
    historyIndexRef.current = historyRef.current.length;
    setHistoryVersion((value) => value + 1);
  }

  function recordDeleteHistory(snapshots: LayoutElementRecord[]) {
    if (!snapshots.length) return;
    historyRef.current = [...historyRef.current.slice(0, historyIndexRef.current), { kind: "delete", snapshots: snapshots.map((snapshot) => ({ ...snapshot })), activeIds: snapshots.map((snapshot) => snapshot.id) }];
    historyIndexRef.current = historyRef.current.length;
    setHistoryVersion((value) => value + 1);
  }

  async function restoreHistory(direction: "undo" | "redo") {
    const nextIndex = direction === "undo" ? historyIndexRef.current - 1 : historyIndexRef.current;
    const entry = historyRef.current[nextIndex];
    if (!entry) return;
    try {
      if (entry.kind === "transform") {
        const restored = entry.changes.map((change) => direction === "undo" ? change.before : change.after);
        const byId = new Map(restored.map((element) => [element.id, element]));
        setElements((items) => items.map((item) => byId.get(item.id) ?? item));
        for (const element of restored) queueSilentElementSave(element, { x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation, label: element.label, zone: element.zone, floor: element.floor, color: element.color });
      } else if (direction === "undo") {
        const restored = await Promise.all(entry.snapshots.map(async ({ id: _id, ...snapshot }) => {
          const response = await fetch("/api/admin/layout/elements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Could not restore the deleted layout item.");
          return body.element as LayoutElementRecord;
        }));
        entry.activeIds = restored.map((element) => element.id);
        setElements((items) => [...items, ...restored]);
      } else {
        for (const id of entry.activeIds) {
          const response = await fetch(`/api/admin/layout/elements/${id}`, { method: "DELETE" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Could not remove the restored layout item.");
        }
        setElements((items) => items.filter((item) => !entry.activeIds.includes(item.id)));
      }
      historyIndexRef.current = direction === "undo" ? nextIndex : nextIndex + 1;
      setHistoryVersion((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not restore the layout history.");
    }
  }

  async function saveProperties() {
    if (!selected) return;
    const numeric = (key: string, fallback: number) => Number.isFinite(Number(properties[key])) ? Number(properties[key]) : fallback;
    await persistElement(selected, {
      label: properties.label,
      x: numeric("x", selected.x),
      y: numeric("y", selected.y),
      width: numeric("width", selected.width),
      height: numeric("height", selected.height),
      rotation: numeric("rotation", selected.rotation ?? 0),
      zone: properties.zone,
      floor: properties.floor,
      color: properties.color
    });
    if (selectedSeat) {
      const response = await fetch(`/api/admin/seats/${selectedSeat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: properties.seatCode, label: properties.seatLabel, zone: properties.zone, floor: properties.floor })
      });
      const body = await response.json();
      if (response.ok && body.seat) {
        setSeats((items) => items.map((seat) => seat.id === body.seat.id ? body.seat : seat));
      } else if (!response.ok) {
        setError(body.error ?? "Layout changes saved, but the seat details could not be updated.");
      }
    }
  }

  async function removeSelected(removeSeat = false) {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      if (removeSeat && selectedSeat) {
        const disable = await fetch(`/api/admin/seats/${selectedSeat.id}/disable`, { method: "POST" });
        if (!disable.ok) throw new Error("Could not disable the seat.");
        setSeats((items) => items.map((seat) => seat.id === selectedSeat.id ? { ...seat, status: "DISABLED" } : seat));
      }
      const response = await fetch(`/api/admin/layout/elements/${selected.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not remove the element.");
      setElements((items) => items.filter((item) => item.id !== selected.id));
      setSelectedId(null);
      setSelectedIds([]);
      setMessage(removeSeat ? "Seat disabled and removed from the map." : "Layout element removed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove the element.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelectedSeat() {
    if (!selected || !selectedSeat) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/seats/${selectedSeat.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not delete the seat.");
      const layoutResponse = await fetch(`/api/admin/layout/elements/${selected.id}`, { method: "DELETE" });
      const layoutBody = await layoutResponse.json();
      if (!layoutResponse.ok) throw new Error(layoutBody.error ?? "Seat deleted, but its map placement could not be removed.");
      setSeats((items) => items.filter((seat) => seat.id !== selectedSeat.id));
      setElements((items) => items.filter((item) => item.id !== selected.id));
      setSelectedId(null);
      setSelectedIds([]);
      setMessage(`${selectedSeat.code} was permanently deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the seat.");
    } finally {
      setSaving(false);
    }
  }

  async function removeLayoutItems(ids: string[]) {
    const targets = elements.filter((element) => ids.includes(element.id));
    if (!targets.length) return;
    setSaving(true);
    setError("");
    try {
      for (const target of targets) {
        const response = await fetch(`/api/admin/layout/elements/${target.id}`, { method: "DELETE" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? `Could not remove ${target.label ?? target.type}.`);
      }
      recordDeleteHistory(targets);
      setElements((items) => items.filter((item) => !ids.includes(item.id)));
      setSelectedId(null);
      setSelectedIds([]);
      setMessage(`${targets.length} layout item${targets.length === 1 ? "" : "s"} removed.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove the selected layout items.");
    } finally {
      setSaving(false);
    }
  }

  async function nudgeSelected(dx: number, dy: number) {
    const targets = elements.filter((element) => selectedIds.includes(element.id));
    if (!targets.length || saving) return;
    const updates = targets.map((element) => ({ ...element, x: clamp(element.x + dx, -10000, 10000), y: clamp(element.y + dy, -10000, 10000) }));
    setSaving(true);
    setError("");
    try {
      const saved = await Promise.all(updates.map(async (element) => {
        const response = await fetch(`/api/admin/layout/elements/${element.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x: element.x, y: element.y }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not move the selected items.");
        return body.element as LayoutElementRecord;
      }));
      const byId = new Map(saved.map((element) => [element.id, element]));
      setElements((items) => items.map((item) => byId.get(item.id) ?? item));
      recordHistory(targets.map((element) => ({ id: element.id, before: element, after: byId.get(element.id) ?? element })));
      setMessage(`${updates.length} item${updates.length === 1 ? "" : "s"} moved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not move the selected items.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === " ") {
        spaceHeldRef.current = true;
        event.preventDefault();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void keyboardActionsRef.current?.restoreHistory(event.shiftKey ? "redo" : "undo");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        void keyboardActionsRef.current?.restoreHistory("redo");
        return;
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        setSelectedIds([]);
        setTool("SELECT");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        const ids = elements.map((element) => element.id);
        setSelectedIds(ids);
        setSelectedId(ids[0] ?? null);
        return;
      }
      if (!selectedIds.length || saving) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        void keyboardActionsRef.current?.removeLayoutItems(selectedIds);
        return;
      }
      const amount = event.shiftKey ? 5 : 1;
      const movement: Record<string, [number, number]> = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] };
      const change = movement[event.key];
      if (change) {
        event.preventDefault();
        void keyboardActionsRef.current?.nudgeSelected(change[0], change[1]);
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.key === " ") spaceHeldRef.current = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [elements, saving, selectedIds]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => Number(clamp(current * Math.exp(-event.deltaY * 0.0015), 0.0001, 1000).toPrecision(5)));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => () => {
    for (const queued of silentSavesRef.current.values()) clearTimeout(queued.timer);
  }, []);

  const ordered = [...elements].sort((a, b) => ({ ROOM: 0, TABLE: 1, WALL: 2, DOOR: 3, PILLAR: 4, LABEL: 5, SEAT: 6 }[a.type] - { ROOM: 0, TABLE: 1, WALL: 2, DOOR: 3, PILLAR: 4, LABEL: 5, SEAT: 6 }[b.type]));
  const canUndo = historyVersion >= 0 && historyIndexRef.current > 0;
  const canRedo = historyVersion >= 0 && historyIndexRef.current < historyRef.current.length;

  return (
    <div className="layout-editor">
      <aside className="editor-toolbox">
        <p className="panel-kicker">Toolbox</p>
        <div className="blueprint-panel">
          <p className="panel-kicker">Saved blueprints</p>
          <div className="blueprint-save"><input aria-label="Blueprint name" value={blueprintName} onChange={(event) => setBlueprintName(event.target.value)} placeholder="e.g. Exam season" /><button type="button" disabled={blueprintWorking || !blueprintName.trim()} onClick={() => void saveBlueprint()}>Save current</button></div>
          {blueprints.length ? <div className="blueprint-list">{blueprints.map((blueprint) => <div className="blueprint-row" key={blueprint.id}><div><strong>{blueprint.name}</strong><span>{blueprint.elements.length} items · {blueprint.seats.length} seats</span></div><div><button type="button" disabled={blueprintWorking} onClick={() => void applyBlueprint(blueprint)}>Use</button><button className="danger" type="button" disabled={blueprintWorking} onClick={() => void deleteBlueprint(blueprint)}>Delete</button></div></div>)}</div> : <p className="blueprint-empty">Save the current plan to reuse it later.</p>}
        </div>
        <div className="tool-list">{tools.map((item) => <button className={tool === item.type ? "is-active" : ""} type="button" key={item.type} onClick={() => chooseTool(item.type)}>{item.label}</button>)}</div>
        <div className="editor-tool-form">
          <p className="panel-kicker">New element details</p>
          <div className="form-field"><label>Label / room name</label><input value={draft.label} onChange={(event) => updateDraft("label", event.target.value)} placeholder={tool === "SEAT" ? "Optional - uses code" : "e.g. Silent study room"} /></div>
          {tool === "SEAT" && <><div className="form-field"><label>Seat code</label><input value={draft.code} onChange={(event) => updateDraft("code", event.target.value)} placeholder="Auto-number if blank" /></div><div className="form-field"><label>Zone</label><input value={draft.zone} onChange={(event) => updateDraft("zone", event.target.value)} placeholder="A" /></div></>}
          <div className="form-field"><label>Floor</label><input value={draft.floor} onChange={(event) => updateDraft("floor", event.target.value)} placeholder="Ground" /></div>
          <div className="form-grid"><div className="form-field"><label>Width %</label><input inputMode="decimal" value={draft.width} onChange={(event) => updateDraft("width", event.target.value)} placeholder="Default" /></div><div className="form-field"><label>Height %</label><input inputMode="decimal" value={draft.height} onChange={(event) => updateDraft("height", event.target.value)} placeholder="Default" /></div></div>
          {tool === "ROOM" && <div className="form-field"><label>Room tone</label><input type="color" value={draft.color} onChange={(event) => updateDraft("color", event.target.value)} /></div>}
        </div>
        <p className="editor-tip">{tool === "SELECT" ? "Drag a selected item to move the whole selection. Click empty grid, press Escape, or use Clear selection to deselect. Hold Space and drag, or use the middle mouse button, to pan. Shift + click selects multiple items; Ctrl + wheel zooms smoothly; Ctrl + A selects all." : `Click the floor plan to place the new ${tool.toLowerCase()}.`}</p>
      </aside>

      <section className="editor-canvas-wrap">
        <div className="editor-canvas-head"><div><p className="panel-kicker">Editable floor plan</p><strong>{saving ? "Saving changes…" : "Changes save quietly after you release"}</strong></div><div className="editor-canvas-controls"><button type="button" disabled={!canUndo} onClick={() => void restoreHistory("undo")}>Undo</button><button type="button" disabled={!canRedo} onClick={() => void restoreHistory("redo")}>Redo</button>{selectedIds.length ? <button type="button" onClick={() => { setSelectedId(null); setSelectedIds([]); }}>Clear selection</button> : null}<button type="button" aria-label="Zoom out" onClick={() => updateZoom(zoom / 1.25)}>−</button><span>Zoom</span><button type="button" aria-label="Zoom in" onClick={() => updateZoom(zoom * 1.25)}>+</button><button type="button" onClick={() => updateZoom(1)}>Fit board</button><span>{elements.filter((element) => element.type === "SEAT").length} placed seats{selectedIds.length ? ` · ${selectedIds.length} selected` : ""}</span></div></div>
        <div className="editor-canvas-viewport" ref={viewportRef}>
        <div className={`editor-canvas ${tool !== "SELECT" ? "is-placing" : ""} ${panning ? "is-panning" : ""}`} ref={canvasRef} onPointerDownCapture={beginCanvasPointer} onPointerDown={placeElement} onPointerMove={moveSelected} onPointerUp={finishMove} onPointerLeave={finishMove}>
          {ordered.map((element) => {
            const seat = element.seatId ? seats.find((item) => item.id === element.seatId) : undefined;
            const label = element.type === "SEAT" ? (seat?.code ?? element.label) : element.label;
            return <button key={element.id} type="button" className={`editor-element editor-${element.type.toLowerCase()} ${selectedIds.includes(element.id) ? "is-selected" : ""}`} style={styleFor(element, zoom, pan)} onPointerDown={(event) => selectElement(event, element.id)} title={label}>{element.type === "SEAT" && seat ? <><span>{label}</span><i className={`dot-${seat.status.toLowerCase()}`} /></> : <span>{label}</span>}{selectedId === element.id && <span className="editor-resize-handle" aria-label="Drag to resize" onPointerDown={(event) => startResize(event, element)} />}</button>;
          })}
        </div>
        </div>
        {message && <p className="notice editor-message">{message}</p>}
        {error && <p className="notice notice-error editor-message">{error}</p>}
      </section>

      <aside className="editor-inspector">
        <p className="panel-kicker">Properties</p>
        {!selected ? <div className="editor-empty"><strong>No element selected</strong><span>Select an item from the map to edit its dimensions, label, and placement.</span></div> : <div className="stack-tight"><div className="inspector-heading"><strong>{selected.type.toLowerCase()}</strong>{selectedSeat && <StatusBadge status={selectedSeat.status} />}</div><div className="form-field"><label>Label</label><input value={properties.label ?? ""} onChange={(event) => setProperties((current) => ({ ...current, label: event.target.value }))} /></div>{selectedSeat && <><div className="form-field"><label>Seat code</label><input value={properties.seatCode ?? ""} onChange={(event) => setProperties((current) => ({ ...current, seatCode: event.target.value }))} /></div><div className="form-field"><label>Seat display name</label><input value={properties.seatLabel ?? ""} onChange={(event) => setProperties((current) => ({ ...current, seatLabel: event.target.value }))} /></div></>}<div className="form-grid"><div className="form-field"><label>X</label><input value={properties.x ?? ""} onChange={(event) => setProperties((current) => ({ ...current, x: event.target.value }))} /></div><div className="form-field"><label>Y</label><input value={properties.y ?? ""} onChange={(event) => setProperties((current) => ({ ...current, y: event.target.value }))} /></div><div className="form-field"><label>Width</label><input value={properties.width ?? ""} onChange={(event) => setProperties((current) => ({ ...current, width: event.target.value }))} /></div><div className="form-field"><label>Height</label><input value={properties.height ?? ""} onChange={(event) => setProperties((current) => ({ ...current, height: event.target.value }))} /></div></div><div className="form-grid"><div className="form-field"><label>Zone</label><input value={properties.zone ?? ""} onChange={(event) => setProperties((current) => ({ ...current, zone: event.target.value }))} /></div><div className="form-field"><label>Floor</label><input value={properties.floor ?? ""} onChange={(event) => setProperties((current) => ({ ...current, floor: event.target.value }))} /></div></div>{selected.type === "ROOM" && <div className="form-field"><label>Room tone</label><input type="color" value={properties.color ?? "#d9e8dc"} onChange={(event) => setProperties((current) => ({ ...current, color: event.target.value }))} /></div>}<button className="button button-secondary" type="button" disabled={saving} onClick={() => void saveProperties()}>Save properties</button>{selectedSeat ? <><button className="button button-danger" type="button" disabled={saving} onClick={() => void deleteSelectedSeat()}>Delete seat permanently</button><button className="text-button danger" type="button" disabled={saving} onClick={() => void removeSelected(true)}>Disable seat and remove from map</button></> : <button className="button button-danger" type="button" disabled={saving} onClick={() => void removeSelected(false)}>Remove {selected.type.toLowerCase()}</button>}</div>}
      </aside>
    </div>
  );
}

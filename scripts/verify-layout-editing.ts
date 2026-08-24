import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.MONGODB_URI = "";

function worldAtCursor(pan: { x: number; y: number }, zoom: number, cursor: { x: number; y: number }) {
  return {
    x: 50 + (cursor.x - 50) / zoom + pan.x,
    y: 50 + (cursor.y - 50) / zoom + pan.y
  };
}

async function main() {
  const originalWorkingDirectory = process.cwd();
  const testRoot = await mkdtemp(path.join(os.tmpdir(), "kameng-layout-editing-"));
  process.chdir(testRoot);

  try {
    const { createLayoutElement, createPlacedSeat, listLayoutElements, saveLayoutBlueprint, updateLayoutElement } = await import("../lib/layout-service");
    const { panForCursorZoom } = await import("../lib/layout-transform");

    await listLayoutElements();
    const firstSeat = await createPlacedSeat({ zone: "A", floor: "Ground", x: 10, y: 10, width: 6, height: 8 });
    const copiedSeat = await createPlacedSeat({ zone: "A", floor: "Ground", x: 14, y: 14, width: 6, height: 8 });
    assert.equal(firstSeat.seat.code, "A-001");
    assert.equal(copiedSeat.seat.code, "A-002");
    assert.equal(copiedSeat.seat.label, "Seat A-002");

    const table = await createLayoutElement({ type: "TABLE", label: "Locked table", x: 25, y: 30, width: 12, height: 7, locked: true });
    const blockedMove = await updateLayoutElement(table.id, { x: 70, y: 80, width: 30, height: 25 });
    assert.equal(blockedMove?.x, table.x);
    assert.equal(blockedMove?.y, table.y);
    assert.equal(blockedMove?.width, table.width);
    assert.equal(blockedMove?.height, table.height);
    assert.equal(blockedMove?.locked, true);

    const unlockedMove = await updateLayoutElement(table.id, { locked: false, x: 70, y: 80, width: 30, height: 25 });
    assert.equal(unlockedMove?.x, 70);
    assert.equal(unlockedMove?.y, 80);
    assert.equal(unlockedMove?.width, 30);
    assert.equal(unlockedMove?.height, 25);
    assert.equal(unlockedMove?.locked, false);

    const relocked = await updateLayoutElement(table.id, { locked: true });
    assert.equal(relocked?.locked, true);
    const persisted = JSON.parse(await readFile(path.join(testRoot, "data", "local-store.json"), "utf8")) as { layout: Array<{ id: string; locked?: boolean }> };
    assert.equal(persisted.layout.find((element) => element.id === table.id)?.locked, true);

    const blueprint = await saveLayoutBlueprint("Locked layout verification");
    assert.equal(blueprint.elements.find((element) => element.id === table.id)?.locked, true);

    const pan = { x: 12.5, y: -7.25 };
    const cursor = { x: 76, y: 22 };
    const before = worldAtCursor(pan, 1.4, cursor);
    const zoomedPan = panForCursorZoom(pan, 1.4, 2.8, cursor);
    const after = worldAtCursor(zoomedPan, 2.8, cursor);
    assert.ok(Math.abs(before.x - after.x) < 0.0000001);
    assert.ok(Math.abs(before.y - after.y) < 0.0000001);

    console.log("Layout editing verification passed.");
  } finally {
    process.chdir(originalWorkingDirectory);
    await rm(testRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { PDFDocument, PageSizes, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { buildQrScanUrl, buildSeatQrPayload } from "./qr";
import { SeatRecord } from "./types";

export async function makeQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 600 });
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

export async function makeSeatQrPreview(seat: SeatRecord) {
  const token = buildSeatQrPayload(seat.id, seat.qrVersion);
  const scanUrl = buildQrScanUrl(token, "seat");
  return { token, scanUrl, dataUrl: await makeQrDataUrl(scanUrl) };
}

export async function makeGateQrPreview() {
  // The entrance label is intentionally a normal web link so anyone can see availability on mobile.
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const scanUrl = `${origin}/seats`;
  return { scanUrl, dataUrl: await makeQrDataUrl(scanUrl) };
}

export async function makeSeatQrPdf(seats: SeatRecord[]) {
  const document = await PDFDocument.create();
  const [pageWidth, pageHeight] = PageSizes.A4;
  const margin = 26;
  const columns = 3;
  const rows = 4;
  const gutter = 10;
  const labelWidth = (pageWidth - margin * 2 - gutter * (columns - 1)) / columns;
  const labelHeight = (pageHeight - margin * 2 - gutter * (rows - 1)) / rows;

  for (let index = 0; index < seats.length; index += columns * rows) {
    const page = document.addPage(PageSizes.A4);
    const batch = seats.slice(index, index + columns * rows);
    for (let offset = 0; offset < batch.length; offset += 1) {
      const seat = batch[offset];
      const column = offset % columns;
      const row = Math.floor(offset / columns);
      const x = margin + column * (labelWidth + gutter);
      const y = pageHeight - margin - (row + 1) * labelHeight - row * gutter;
      const preview = await makeSeatQrPreview(seat);
      const image = await document.embedPng(dataUrlToBytes(preview.dataUrl));
      const imageSize = Math.min(labelWidth - 26, labelHeight - 77, 105);
      const imageX = x + (labelWidth - imageSize) / 2;
      const imageY = y + 29;

      page.drawRectangle({ x, y, width: labelWidth, height: labelHeight, borderColor: rgb(0.16, 0.21, 0.18), borderWidth: 0.75 });
      page.drawText("KAMENG LIBRARY", { x: x + 11, y: y + labelHeight - 19, size: 8.5, color: rgb(0.07, 0.2, 0.15) });
      page.drawText(seat.label, { x: x + 11, y: y + labelHeight - 37, size: 12, color: rgb(0.08, 0.1, 0.09) });
      page.drawImage(image, { x: imageX, y: imageY, width: imageSize, height: imageSize });
      page.drawText(seat.code, { x: x + 11, y: y + 17, size: 9, color: rgb(0.08, 0.1, 0.09) });
      page.drawText("Scan in the Kameng Library app", { x: x + 11, y: y + 7, size: 6.6, color: rgb(0.32, 0.37, 0.34) });
    }
  }
  return await document.save();
}

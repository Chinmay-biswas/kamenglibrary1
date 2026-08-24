import { NextResponse } from "next/server";
import { makeSeatQrPdf } from "@/lib/qr-pdf";
import { listSeats } from "@/lib/seat-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function POST(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const allSeats = await listSeats();
  const seats = (body.mode === "ALL" ? allSeats : allSeats.filter((seat) => body.ids?.includes(seat.id))).filter((seat) => seat.status !== "DISABLED");
  if (!seats.length) return NextResponse.json({ error: "Choose at least one active seat." }, { status: 400 });
  const pdf = await makeSeatQrPdf(seats);
  await logAudit("QR_PDF_EXPORTED", { mode: body.mode, seatCount: seats.length }, user?.id);
  const pdfBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new NextResponse(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kameng-library-seat-qrs-${new Date().toISOString().slice(0, 10)}.pdf"`
    }
  });
}

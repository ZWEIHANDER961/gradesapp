import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { estudianteId, actividadId, puntaje } = await req.json();
    if (!estudianteId || !actividadId || puntaje === undefined) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }
    const puntajeRedondeado = Math.round(puntaje * 10) / 10;
    const calificacion = await prisma.calificacion.upsert({
      where: { estudianteId_actividadId: { estudianteId, actividadId } },
      update: { puntaje: puntajeRedondeado },
      create: { estudianteId, actividadId, puntaje: puntajeRedondeado },
    });
    return NextResponse.json({ success: true, data: calificacion.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

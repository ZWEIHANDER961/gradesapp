import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { cursoOrigenId, cursoDestinoId } = await req.json();
    if (!cursoOrigenId || !cursoDestinoId) {
      return NextResponse.json({ success: false, error: "IDs requeridos." }, { status: 400 });
    }

    const destino = await prisma.cursoSeccion.findUnique({
      where: { id: cursoDestinoId },
      include: { _count: { select: { estudiantes: true, ras: true } } },
    });
    if (!destino) {
      return NextResponse.json({ success: false, error: "Curso destino no encontrado." }, { status: 404 });
    }
    if (destino._count.estudiantes > 0 || destino._count.ras > 0) {
      return NextResponse.json({ success: false, error: "El curso destino debe estar vacío." }, { status: 400 });
    }

    const rasOrigen = await prisma.resultadoAprendizaje.findMany({
      where: { cursoId: cursoOrigenId },
      include: { actividades: true },
    });

    for (const ra of rasOrigen) {
      const nuevoRA = await prisma.resultadoAprendizaje.create({
        data: {
          codigoRA: ra.codigoRA,
          descripcion: ra.descripcion,
          ponderacion: ra.ponderacion,
          cursoId: cursoDestinoId,
        },
      });
      for (const act of ra.actividades) {
        await prisma.actividad.create({
          data: { nombre: act.nombre, ponderacion: act.ponderacion, raId: nuevoRA.id },
        });
      }
    }

    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { cursoMateriaId, codigoRA, descripcion, ponderacion } = await req.json();
    if (!cursoMateriaId || !codigoRA?.trim() || !descripcion?.trim() || !ponderacion) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }

    const rasExistentes = await prisma.resultadoAprendizaje.findMany({
      where: { cursoMateriaId },
      select: { ponderacion: true },
    });
    const sumaActual = rasExistentes.reduce((acc, ra) => acc + ra.ponderacion, 0);
    if (sumaActual + ponderacion > 100) {
      return NextResponse.json(
        { success: false, error: `Ponderación excede 100%. Suma: ${sumaActual}%, intenta: ${ponderacion}%.` },
        { status: 400 }
      );
    }

    const ra = await prisma.resultadoAprendizaje.create({
      data: {
        codigoRA: codigoRA.trim(),
        descripcion: descripcion.trim(),
        ponderacion,
        cursoMateriaId,
      },
    });
    return NextResponse.json({ success: true, data: ra.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, codigoRA, descripcion, ponderacion } = await req.json();
    if (!id || !codigoRA?.trim() || !descripcion?.trim() || !ponderacion) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }

    const ra = await prisma.resultadoAprendizaje.findUnique({ where: { id } });
    if (!ra) {
      return NextResponse.json({ success: false, error: "RA no encontrado." }, { status: 404 });
    }

    if (ra.ponderacion !== ponderacion) {
      const rasExistentes = await prisma.resultadoAprendizaje.findMany({
        where: { cursoMateriaId: ra.cursoMateriaId, id: { not: id } },
        select: { ponderacion: true },
      });
      const sumaActual = rasExistentes.reduce((acc, r) => acc + r.ponderacion, 0);
      if (sumaActual + ponderacion > 100) {
        return NextResponse.json(
          { success: false, error: `Ponderación excede 100%. Suma: ${sumaActual}%, intenta: ${ponderacion}%.` },
          { status: 400 }
        );
      }
    }

    await prisma.resultadoAprendizaje.update({
      where: { id },
      data: { codigoRA: codigoRA.trim(), descripcion: descripcion.trim(), ponderacion },
    });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido." }, { status: 400 });
    }
    await prisma.resultadoAprendizaje.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { cursoId, codigoRA, descripcion, ponderacion } = await req.json();
    if (!cursoId || !codigoRA || !descripcion || ponderacion === undefined) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }
    const rasExistentes = await prisma.resultadoAprendizaje.findMany({
      where: { cursoId },
      select: { ponderacion: true },
    });
    const sumaActual = rasExistentes.reduce((acc, ra) => acc + ra.ponderacion, 0);
    if (sumaActual + ponderacion > 100) {
      return NextResponse.json(
        { success: false, error: `Ponderación excede 100%. Suma actual: ${sumaActual}%, intenta agregar: ${ponderacion}%.` },
        { status: 400 }
      );
    }
    const ra = await prisma.resultadoAprendizaje.create({
      data: { codigoRA: codigoRA.trim(), descripcion: descripcion.trim(), ponderacion, cursoId },
    });
    return NextResponse.json({ success: true, data: ra.id });
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

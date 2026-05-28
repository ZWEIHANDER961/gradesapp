import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { raId, nombre, ponderacion } = await req.json();
    if (!raId || !nombre || ponderacion === undefined) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }
    const actividadesExistentes = await prisma.actividad.findMany({
      where: { raId },
      select: { ponderacion: true },
    });
    const sumaActual = actividadesExistentes.reduce((acc, act) => acc + act.ponderacion, 0);
    if (sumaActual + ponderacion > 100) {
      return NextResponse.json(
        { success: false, error: `Ponderación de actividades excede 100%. Suma actual: ${sumaActual}%, intenta agregar: ${ponderacion}%.` },
        { status: 400 }
      );
    }
    const actividad = await prisma.actividad.create({
      data: { nombre: nombre.trim(), ponderacion, raId },
    });
    return NextResponse.json({ success: true, data: actividad.id });
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
    await prisma.actividad.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { raId, nombre, ponderacion } = await req.json();
    if (!raId || !nombre?.trim() || !ponderacion) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }

    const actividadesExistentes = await prisma.actividad.findMany({
      where: { raId },
      select: { ponderacion: true },
    });
    const sumaActual = actividadesExistentes.reduce((acc, act) => acc + act.ponderacion, 0);
    if (sumaActual + ponderacion > 100) {
      return NextResponse.json(
        { success: false, error: `Ponderación excede 100%. Suma: ${sumaActual}%, intenta: ${ponderacion}%.` },
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

export async function PUT(req: NextRequest) {
  try {
    const { id, nombre, ponderacion } = await req.json();
    if (!id || !nombre?.trim() || !ponderacion) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }

    const act = await prisma.actividad.findUnique({ where: { id } });
    if (!act) {
      return NextResponse.json({ success: false, error: "Actividad no encontrada." }, { status: 404 });
    }

    if (act.ponderacion !== ponderacion) {
      const actividadesExistentes = await prisma.actividad.findMany({
        where: { raId: act.raId, id: { not: id } },
        select: { ponderacion: true },
      });
      const sumaActual = actividadesExistentes.reduce((acc, a) => acc + a.ponderacion, 0);
      if (sumaActual + ponderacion > 100) {
        return NextResponse.json(
          { success: false, error: `Ponderación excede 100%. Suma: ${sumaActual}%, intenta: ${ponderacion}%.` },
          { status: 400 }
        );
      }
    }

    await prisma.actividad.update({
      where: { id },
      data: { nombre: nombre.trim(), ponderacion },
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
    await prisma.actividad.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

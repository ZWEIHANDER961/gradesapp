import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, cursoId } = await req.json();
    if (!nombre || !apellido || !cursoId) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }
    const estudiante = await prisma.estudiante.create({
      data: { nombre: nombre.trim(), apellido: apellido.trim(), cursoId },
    });
    return NextResponse.json({ success: true, data: estudiante.id });
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
    await prisma.estudiante.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

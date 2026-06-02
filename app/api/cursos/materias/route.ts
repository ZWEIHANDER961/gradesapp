import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { cursoId, materiaId } = await req.json();
    if (!cursoId || !materiaId) {
      return NextResponse.json({ success: false, error: "IDs requeridos." }, { status: 400 });
    }
    const cm = await prisma.cursoMateria.create({ data: { cursoId, materiaId } });
    return NextResponse.json({ success: true, data: cm.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    if (msg.includes("Unique")) {
      return NextResponse.json({ success: false, error: "Materia ya asignada." }, { status: 409 });
    }
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
    await prisma.cursoMateria.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

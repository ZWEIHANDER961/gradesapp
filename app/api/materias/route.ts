import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const materias = await prisma.materia.findMany({
      include: { _count: { select: { cursos: true } } },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ success: true, data: materias });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre } = await req.json();
    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ success: false, error: "Nombre requerido." }, { status: 400 });
    }
    const materia = await prisma.materia.create({ data: { nombre: nombre.trim() } });
    return NextResponse.json({ success: true, data: materia.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    if (msg.includes("Unique") || msg.includes("unique")) {
      return NextResponse.json({ success: false, error: "Ya existe una materia con ese nombre." }, { status: 409 });
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
    await prisma.materia.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

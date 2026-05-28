import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const materiaId = searchParams.get("materiaId");

    if (materiaId) {
      const cursos = await prisma.cursoSeccion.findMany({
        where: { materiaId },
        include: { _count: { select: { estudiantes: true, ras: true } } },
        orderBy: { nombre: "asc" },
      });
      return NextResponse.json({ success: true, data: cursos });
    }

    const cursos = await prisma.cursoSeccion.findMany({
      include: {
        materia: { select: { id: true, nombre: true } },
        _count: { select: { estudiantes: true, ras: true } },
      },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ success: true, data: cursos });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, materiaId } = await req.json();
    if (!nombre || !materiaId) {
      return NextResponse.json({ success: false, error: "Nombre y materiaId requeridos." }, { status: 400 });
    }
    const curso = await prisma.cursoSeccion.create({ data: { nombre, materiaId } });
    return NextResponse.json({ success: true, data: curso.id });
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
    await prisma.cursoSeccion.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

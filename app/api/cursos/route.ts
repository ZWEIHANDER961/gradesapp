import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cursos = await prisma.cursoSeccion.findMany({
      include: { _count: { select: { estudiantes: true, materias: true } } },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ success: true, data: cursos });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre } = await req.json();
    const curso = await prisma.cursoSeccion.create({ data: { nombre: nombre.trim() } });
    return NextResponse.json({ success: true, data: curso.id });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
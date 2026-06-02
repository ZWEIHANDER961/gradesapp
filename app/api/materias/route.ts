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
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre } = await req.json();
    const materia = await prisma.materia.create({ data: { nombre: nombre.trim() } });
    return NextResponse.json({ success: true, data: materia.id });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
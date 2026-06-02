import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { estudiantes, cursoId } = await req.json();
    if (!Array.isArray(estudiantes) || !cursoId) {
      return NextResponse.json({ success: false, error: "Datos inválidos." }, { status: 400 });
    }
    const data = estudiantes.map(
      (e: { numeroOrden: number; nombre: string; apellido: string }) => ({
        numeroOrden: e.numeroOrden,
        nombre: e.nombre.trim(),
        apellido: e.apellido.trim(),
        cursoId,
      })
    );
    const result = await prisma.estudiante.createMany({ data, skipDuplicates: true });
    return NextResponse.json({ success: true, data: result.count });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

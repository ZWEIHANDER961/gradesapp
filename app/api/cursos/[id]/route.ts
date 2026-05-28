import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const curso = await prisma.cursoSeccion.findUnique({
      where: { id: params.id },
      include: {
        materia: { select: { id: true, nombre: true } },
        estudiantes: {
          orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
        },
        ras: {
          include: {
            actividades: {
              include: {
                calificaciones: {
                  select: { estudianteId: true, puntaje: true },
                },
              },
            },
          },
        },
      },
    });
    if (!curso) {
      return NextResponse.json({ success: false, error: "Curso no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: curso });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

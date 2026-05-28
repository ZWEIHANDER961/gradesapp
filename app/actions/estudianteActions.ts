"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

type EstudianteItem = { id: string; nombre: string; apellido: string; cursoId: string };

export async function crearEstudiante(
  nombre: string,
  apellido: string,
  cursoId: string
): Promise<ActionResult<string>> {
  try {
    const estudiante = await prisma.estudiante.create({
      data: { nombre, apellido, cursoId },
    });
    return { success: true, data: estudiante.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al crear estudiante: ${msg}` };
  }
}

export async function crearEstudiantesBatch(
  estudiantes: { nombre: string; apellido: string }[],
  cursoId: string
): Promise<ActionResult<number>> {
  try {
    const data = estudiantes.map((e) => ({ ...e, cursoId }));
    const result = await prisma.estudiante.createMany({ data });
    return { success: true, data: result.count };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al crear estudiantes: ${msg}` };
  }
}

export async function eliminarEstudiante(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.estudiante.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al eliminar estudiante: ${msg}` };
  }
}

export async function obtenerEstudiantesPorCurso(cursoId: string): Promise<ActionResult<EstudianteItem[]>> {
  try {
    const estudiantes = await prisma.estudiante.findMany({
      where: { cursoId },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });
    return { success: true, data: estudiantes };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al obtener estudiantes: ${msg}` };
  }
}

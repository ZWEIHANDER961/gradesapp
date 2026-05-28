"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function crearMateria(nombre: string): Promise<ActionResult<string>> {
  try {
    const materia = await prisma.materia.create({ data: { nombre } });
    return { success: true, data: materia.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    if (msg.includes("Unique") || msg.includes("unique")) {
      return { success: false, error: "Ya existe una materia con ese nombre." };
    }
    return { success: false, error: `Error al crear materia: ${msg}` };
  }
}

export async function obtenerMaterias(): Promise<ActionResult<{ id: string; nombre: string; _count: { cursos: number } }[]>> {
  try {
    const materias = await prisma.materia.findMany({
      include: { _count: { select: { cursos: true } } },
      orderBy: { nombre: "asc" },
    });
    return { success: true, data: materias };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al obtener materias: ${msg}` };
  }
}

export async function eliminarMateria(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.materia.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al eliminar materia: ${msg}` };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function obtenerTodasMaterias(): Promise<ActionResult<{id: string, nombre: string}[]>> {
  try {
    const materias = await prisma.materia.findMany({ orderBy: { nombre: "asc" } });
    return { success: true, data: materias };
  } catch (error) {
    return { success: false, error: "Error al obtener materias" };
  }
}

export async function obtenerMateriasConCursos(): Promise<ActionResult<any[]>> {
  try {
    const materias = await prisma.materia.findMany({
      include: { _count: { select: { cursos: true } } },
      orderBy: { nombre: "asc" },
    });
    return { success: true, data: materias };
  } catch (error) {
    return { success: false, error: "Error al obtener materias" };
  }
}

export async function crearMateria(nombre: string): Promise<ActionResult<string>> {
  try {
    const materia = await prisma.materia.create({ data: { nombre: nombre.trim() } });
    return { success: true, data: materia.id };
  } catch (error: any) {
    if (error.message?.includes("Unique")) return { success: false, error: "La materia ya existe." };
    return { success: false, error: "Error al crear materia" };
  }
}

export async function eliminarMateria(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.materia.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: "Error al eliminar materia" };
  }
}

export async function actualizarMateria(id: string, nombre: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.materia.update({
      where: { id },
      data: { nombre: nombre.trim() },
    });
    return { success: true, data: true };
  } catch (error: any) {
    if (error.message?.includes("Unique")) {
      return { success: false, error: "Ya existe otra materia con ese nombre." };
    }
    return { success: false, error: "Error al actualizar la materia" };
  }
}
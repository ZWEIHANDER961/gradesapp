"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function obtenerCursosDeMateria(materiaId: string): Promise<ActionResult<any[]>> {
  try {
    const relaciones = await prisma.cursoMateria.findMany({
      where: { materiaId },
      include: {
        curso: {
          include: { _count: { select: { estudiantes: true, materias: true } } }
        }
      }
    });
    // Extraemos y mapeamos para que el frontend lo lea fácilmente
    const data = relaciones.map(r => ({
      id: r.curso.id,
      nombre: r.curso.nombre,
      _count: { estudiantes: r.curso._count.estudiantes, ras: r.curso._count.materias }
    }));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Error al obtener cursos" };
  }
}

export async function crearCursoYAsignar(nombre: string, materiaId: string): Promise<ActionResult<string>> {
  try {
    // 1. Crea el curso
    const curso = await prisma.cursoSeccion.create({ data: { nombre: nombre.trim() } });
    // 2. Crea el vínculo inmediato con la materia seleccionada
    await prisma.cursoMateria.create({ data: { cursoId: curso.id, materiaId } });
    return { success: true, data: curso.id };
  } catch (error) {
    return { success: false, error: "Error al crear curso y asignarlo" };
  }
}

export async function asignarMateriaExistente(cursoId: string, materiaId: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.cursoMateria.create({ data: { cursoId, materiaId } });
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: "La materia ya está asignada a este curso." };
  }
}

export async function eliminarCurso(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.cursoSeccion.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: "Error al eliminar curso" };
  }
}
"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function crearCurso(nombre: string, materiaId: string): Promise<ActionResult<string>> {
  try {
    const curso = await prisma.cursoSeccion.create({
      data: { nombre, materiaId },
    });
    return { success: true, data: curso.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al crear curso: ${msg}` };
  }
}

export async function obtenerCursosPorMateria(materiaId: string): Promise<
  ActionResult<{ id: string; nombre: string; _count: { estudiantes: number; ras: number } }[]>
> {
  try {
    const cursos = await prisma.cursoSeccion.findMany({
      where: { materiaId },
      include: { _count: { select: { estudiantes: true, ras: true } } },
      orderBy: { nombre: "asc" },
    });
    return { success: true, data: cursos };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al obtener cursos: ${msg}` };
  }
}

export async function obtenerTodosLosCursos(): Promise<
  ActionResult<
    { id: string; nombre: string; materiaId: string; materia: { id: string; nombre: string }; _count: { estudiantes: number; ras: number } }[]
  >
> {
  try {
    const cursos = await prisma.cursoSeccion.findMany({
      include: {
        materia: { select: { id: true, nombre: true } },
        _count: { select: { estudiantes: true, ras: true } },
      },
      orderBy: { nombre: "asc" },
    });
    return { success: true, data: cursos };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al obtener cursos: ${msg}` };
  }
}

export async function eliminarCurso(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.cursoSeccion.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al eliminar curso: ${msg}` };
  }
}

export async function crearRA(
  cursoId: string,
  codigoRA: string,
  descripcion: string,
  ponderacion: number
): Promise<ActionResult<string>> {
  try {
    const rasExistentes = await prisma.resultadoAprendizaje.findMany({
      where: { cursoId },
      select: { ponderacion: true },
    });
    const sumaActual = rasExistentes.reduce((acc, ra) => acc + ra.ponderacion, 0);
    if (sumaActual + ponderacion > 100) {
      return {
        success: false,
        error: `La ponderación excede 100%. Suma actual: ${sumaActual}%, intenta agregar: ${ponderacion}%.`,
      };
    }
    const ra = await prisma.resultadoAprendizaje.create({
      data: { codigoRA, descripcion, ponderacion, cursoId },
    });
    return { success: true, data: ra.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al crear RA: ${msg}` };
  }
}

export async function eliminarRA(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.resultadoAprendizaje.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al eliminar RA: ${msg}` };
  }
}

export async function crearActividad(
  raId: string,
  nombre: string,
  ponderacion: number
): Promise<ActionResult<string>> {
  try {
    const actividadesExistentes = await prisma.actividad.findMany({
      where: { raId },
      select: { ponderacion: true },
    });
    const sumaActual = actividadesExistentes.reduce((acc, act) => acc + act.ponderacion, 0);
    if (sumaActual + ponderacion > 100) {
      return {
        success: false,
        error: `La ponderación de actividades excede 100%. Suma actual: ${sumaActual}%, intenta agregar: ${ponderacion}%.`,
      };
    }
    const actividad = await prisma.actividad.create({
      data: { nombre, ponderacion, raId },
    });
    return { success: true, data: actividad.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al crear actividad: ${msg}` };
  }
}

export async function eliminarActividad(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.actividad.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al eliminar actividad: ${msg}` };
  }
}

export async function clonarEstructura(cursoOrigenId: string, cursoDestinoId: string): Promise<ActionResult<boolean>> {
  try {
    const destino = await prisma.cursoSeccion.findUnique({
      where: { id: cursoDestinoId },
      include: { _count: { select: { estudiantes: true, ras: true } } },
    });
    if (!destino) {
      return { success: false, error: "Curso destino no encontrado." };
    }
    if (destino._count.estudiantes > 0) {
      return { success: false, error: "El curso destino ya tiene estudiantes. Debe estar vacío." };
    }
    if (destino._count.ras > 0) {
      return { success: false, error: "El curso destino ya tiene RAs. Debe estar vacío." };
    }
    const rasOrigen = await prisma.resultadoAprendizaje.findMany({
      where: { cursoId: cursoOrigenId },
      include: { actividades: true },
    });
    for (const ra of rasOrigen) {
      const nuevoRA = await prisma.resultadoAprendizaje.create({
        data: {
          codigoRA: ra.codigoRA,
          descripcion: ra.descripcion,
          ponderacion: ra.ponderacion,
          cursoId: cursoDestinoId,
        },
      });
      for (const act of ra.actividades) {
        await prisma.actividad.create({
          data: {
            nombre: act.nombre,
            ponderacion: act.ponderacion,
            raId: nuevoRA.id,
          },
        });
      }
    }
    return { success: true, data: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al clonar estructura: ${msg}` };
  }
}

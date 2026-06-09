"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function guardarCalificacionInline(
  estudianteId: string,
  actividadId: string,
  puntaje: number | null
): Promise<ActionResult<string | null>> {
  try {
    // Si el valor es null (celda vacía), eliminamos la calificación para no afectar promedios
    if (puntaje === null) {
      await prisma.calificacion.deleteMany({
        where: { estudianteId, actividadId }
      });
      return { success: true, data: null };
    }

    const puntajeRedondeado = Math.round(puntaje * 10) / 10;
    const calificacion = await prisma.calificacion.upsert({
      where: { estudianteId_actividadId: { estudianteId, actividadId } },
      update: { puntaje: puntajeRedondeado },
      create: { estudianteId, actividadId, puntaje: puntajeRedondeado },
    });
    return { success: true, data: calificacion.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: msg };
  }
}

export async function eliminarCalificacion(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.calificacion.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: msg };
  }
}
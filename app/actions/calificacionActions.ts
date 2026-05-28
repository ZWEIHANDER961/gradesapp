"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function guardarCalificacion(
  estudianteId: string,
  actividadId: string,
  puntaje: number
): Promise<ActionResult<string>> {
  try {
    const puntajeRedondeado = Math.round(puntaje * 10) / 10;
    const calificacion = await prisma.calificacion.upsert({
      where: {
        estudianteId_actividadId: { estudianteId, actividadId },
      },
      update: { puntaje: puntajeRedondeado },
      create: { estudianteId, actividadId, puntaje: puntajeRedondeado },
    });
    return { success: true, data: calificacion.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al guardar calificación: ${msg}` };
  }
}

export async function guardarCalificacionesBatch(
  calificaciones: { estudianteId: string; actividadId: string; puntaje: number }[]
): Promise<ActionResult<number>> {
  try {
    let count = 0;
    for (const cal of calificaciones) {
      const puntajeRedondeado = Math.round(cal.puntaje * 10) / 10;
      await prisma.calificacion.upsert({
        where: {
          estudianteId_actividadId: { estudianteId: cal.estudianteId, actividadId: cal.actividadId },
        },
        update: { puntaje: puntajeRedondeado },
        create: { estudianteId: cal.estudianteId, actividadId: cal.actividadId, puntaje: puntajeRedondeado },
      });
      count++;
    }
    return { success: true, data: count };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: `Error al guardar calificaciones: ${msg}` };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function crearRA(cursoMateriaId: string, codigoRA: string, descripcion: string, ponderacion: number): Promise<ActionResult<string>> {
  try {
    const ra = await prisma.resultadoAprendizaje.create({
      data: { codigoRA, descripcion, ponderacion, cursoMateriaId },
    });
    return { success: true, data: ra.id };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function actualizarRA(id: string, codigoRA: string, descripcion: string, ponderacion: number): Promise<ActionResult<boolean>> {
  try {
    await prisma.resultadoAprendizaje.update({
      where: { id },
      data: { codigoRA, descripcion, ponderacion },
    });
    return { success: true, data: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function eliminarRA(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.resultadoAprendizaje.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function crearActividad(raId: string, nombre: string, ponderacion: number): Promise<ActionResult<string>> {
  try {
    const actividad = await prisma.actividad.create({
      data: { nombre, ponderacion, raId },
    });
    return { success: true, data: actividad.id };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function actualizarActividad(id: string, nombre: string, ponderacion: number): Promise<ActionResult<boolean>> {
  try {
    await prisma.actividad.update({
      where: { id },
      data: { nombre, ponderacion },
    });
    return { success: true, data: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function eliminarActividad(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.actividad.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}
"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";
import * as xlsx from "xlsx";

export async function crearEstudiante(
  numeroOrden: number,
  nombre: string,
  apellido: string,
  cursoId: string
): Promise<ActionResult<string>> {
  try {
    const estudiante = await prisma.estudiante.create({
      data: { numeroOrden, nombre, apellido, cursoId },
    });
    return { success: true, data: estudiante.id };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

export async function actualizarEstudiante(
  id: string,
  numeroOrden: number,
  nombre: string,
  apellido: string
): Promise<ActionResult<boolean>> {
  try {
    await prisma.estudiante.update({
      where: { id },
      data: { numeroOrden, nombre, apellido },
    });
    return { success: true, data: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

export async function eliminarEstudiante(id: string): Promise<ActionResult<boolean>> {
  try {
    await prisma.estudiante.delete({ where: { id } });
    return { success: true, data: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

export async function importarExcelEstudiantes(
  cursoId: string,
  formData: FormData
): Promise<ActionResult<number>> {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "Archivo no proporcionado." };

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet) as any[];

    if (!data || data.length === 0) {
      return { success: false, error: "El archivo Excel está vacío." };
    }

    const count = await prisma.$transaction(async (tx) => {
      let inserted = 0;
      for (const row of data) {
        const numeroOrden = Number(row.numeroOrden);
        const nombre = String(row.nombre || "").trim();
        const apellido = String(row.apellido || "").trim();

        if (isNaN(numeroOrden) || !nombre || !apellido) {
          throw new Error(`Fila inválida: ${JSON.stringify(row)}. Se requieren las columnas 'numeroOrden', 'nombre', 'apellido'.`);
        }

        const existe = await tx.estudiante.findFirst({
          where: { cursoId, numeroOrden }
        });

        if (existe) {
          throw new Error(`El número de orden ${numeroOrden} ya existe en este curso. Transacción abortada completamente.`);
        }

        await tx.estudiante.create({
          data: { numeroOrden, nombre, apellido, cursoId }
        });
        inserted++;
      }
      return inserted;
    });

    return { success: true, data: count };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido al importar." };
  }
}
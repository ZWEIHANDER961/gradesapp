import type { Prisma } from "@prisma/client";

export type CursoSeccionWithRelations = Prisma.CursoSeccionGetPayload<{
  include: {
    estudiantes: { orderBy: { numeroOrden: "asc" } };
    materias: { include: { materia: true } };
  };
}>;

export type CursoMateriaWithDetails = Prisma.CursoMateriaGetPayload<{
  include: {
    curso: true;
    materia: true;
    ras: { include: { actividades: { include: { calificaciones: true } } } };
  };
}>;

export type EstudianteConNotas = Prisma.EstudianteGetPayload<{
  include: { calificaciones: true };
}>;

export type RAConActividades = Prisma.ResultadoAprendizajeGetPayload<{
  include: { actividades: true };
}>;

export type ActividadConCalificaciones = Prisma.ActividadGetPayload<{
  include: { calificaciones: true };
}>;

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DashboardMetrics {
  totalMaterias: number;
  totalCursos: number;
  totalEstudiantes: number;
  promedioGeneral: number;
}
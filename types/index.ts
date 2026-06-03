import type { Prisma } from "@prisma/client";

export type MateriaWithCursos = Prisma.MateriaGetPayload<{
  include: { cursos: { include: { curso: true } } };
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

export interface GradeMatrixRow {
  estudianteId: string;
  nombre: string;
  apellido: string;
  actividades: { actividadId: string; puntaje: number }[];
  raNotas: { raId: string; codigoRA: string; nota: number }[];
  notaFinal: number;
}

export interface DashboardMetrics {
  totalMaterias: number;
  totalCursos: number;
  totalEstudiantes: number;
  promedioGeneral: number;
}
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
import { BookOpen, GraduationCap, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardMetrics } from "@/types";

async function getMetrics(): Promise<DashboardMetrics> {
  const [totalMaterias, totalCursos, totalEstudiantes] = await Promise.all([
    prisma.materia.count(),
    prisma.cursoSeccion.count(),
    prisma.estudiante.count(),
  ]);

  let promedioGeneral = 0;
  if (totalEstudiantes > 0) {
    const cursos = await prisma.cursoSeccion.findMany({
      include: {
        ras: { include: { actividades: { include: { calificaciones: true } } } },
        estudiantes: true,
      },
    });

    const notasFinales: number[] = [];
    for (const curso of cursos) {
      for (const estudiante of curso.estudiantes) {
        let notaFinalEstudiante = 0;
        for (const ra of curso.ras) {
          let notaRA = 0;
          if (ra.actividades.length > 0) {
            for (const act of ra.actividades) {
              const cal = act.calificaciones.find(
                (c) => c.estudianteId === estudiante.id
              );
              const puntaje = cal ? cal.puntaje : 0;
              notaRA += puntaje * (act.ponderacion / 100);
            }
          }
          notaFinalEstudiante += notaRA * (ra.ponderacion / 100);
        }
        notasFinales.push(Math.round(notaFinalEstudiante * 10) / 10);
      }
    }

    if (notasFinales.length > 0) {
      const suma = notasFinales.reduce((acc, n) => acc + n, 0);
      promedioGeneral = Math.round((suma / notasFinales.length) * 10) / 10;
    }
  }

  return { totalMaterias, totalCursos, totalEstudiantes, promedioGeneral };
}

export default async function DashboardPage() {
  const metrics = await getMetrics();
  const materias = await prisma.materia.findMany({
    include: { _count: { select: { cursos: true } } },
    orderBy: { nombre: "asc" },
  });

  const cards = [
    {
      title: "Materias",
      value: metrics.totalMaterias,
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Cursos",
      value: metrics.totalCursos,
      icon: GraduationCap,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      title: "Estudiantes",
      value: metrics.totalEstudiantes,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Promedio General",
      value: metrics.promedioGeneral,
      icon: TrendingUp,
      color:
        metrics.promedioGeneral >= 70
          ? "text-emerald-600"
          : metrics.promedioGeneral >= 60
          ? "text-amber-600"
          : "text-red-600",
      bg:
        metrics.promedioGeneral >= 70
          ? "bg-emerald-50"
          : metrics.promedioGeneral >= 60
          ? "bg-amber-50"
          : "bg-red-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">GradeBook RA</h1>
                <p className="text-xs text-gray-500">Sistema de Gestión Académica</p>
              </div>
            </div>
            <Link href="/materias">
              <Button variant="outline" size="sm">
                Gestionar Materias
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            Resumen general del rendimiento académico
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {cards.map((card) => (
            <Card key={card.title} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bg}`}
                  >
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Materias</h3>
          {materias.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-sm text-gray-500">
                  No hay materias registradas aún.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {materias.map((materia) => (
                <Card key={materia.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 leading-tight">
                      {materia.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {materia._count.cursos}{" "}
                        {materia._count.cursos === 1 ? "curso" : "cursos"}
                      </p>
                      <Link href={`/materias?materiaId=${materia.id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                          Ver cursos
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

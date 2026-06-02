import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
import { BookOpen, Plus, FileSpreadsheet, CheckCircle, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getCursos() {
  const cursos = await prisma.cursoSeccion.findMany({
    include: { _count: { select: { estudiantes: true, materias: true } } },
    orderBy: { nombre: "asc" },
  });
  return cursos;
}

export default async function DashboardPage() {
  const cursos = await getCursos();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">GradeBook RA</h1>
                <p className="text-xs text-gray-500">Sistema de Gestión Académica</p>
              </div>
            </div>
            <Link href="/materias">
              <Button size="sm" variant="outline" className="mr-2">Gestionar Materias</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-blue-900 mb-2">Flujo Rápido de Configuración Didáctica</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span><strong>Paso 1:</strong> Crea un curso y configúralo.</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      <span><strong>Paso 2:</strong> Carga estudiantes desde Excel.</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span><strong>Paso 3:</strong> Asigna materias y ponderaciones.</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Mis Cursos</h2>
            <p className="text-sm text-gray-500 mt-2">
              Selecciona un curso para gestionar sus materias, estudiantes y calificaciones
            </p>
          </div>
        </div>

        {cursos.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="mx-auto h-16 w-16 text-gray-200" />
              <p className="mt-4 text-sm text-gray-500">
                No hay cursos creados. Para comenzar, ve a la sección de Materias.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((curso) => (
              <Link key={curso.id} href={`/cursos/${curso.id}`}>
                <Card className="hover:shadow-lg transition-all hover:border-blue-300 cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1 line-clamp-2">
                        {curso.nombre}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg p-3 space-x-3">
                      <div className="text-center flex-1">
                        <div className="text-lg font-bold text-blue-600">{curso._count.estudiantes}</div>
                        <div className="text-gray-500">Estudiantes</div>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center flex-1">
                        <div className="text-lg font-bold text-purple-600">{curso._count.materias}</div>
                        <div className="text-gray-500">Materias</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" className="w-full">
                        Abrir Curso
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
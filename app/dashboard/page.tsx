"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, FileSpreadsheet, CheckCircle, Lightbulb, GraduationCap, Layers, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import type { ActionResult } from "@/types";
import { crearCurso } from "@/app/actions/cursoActions";
import { obtenerTodosLosCursos } from "@/app/actions/cursoActions";

interface Curso {
  id: string;
  nombre: string;
  _count: {
    estudiantes: number;
    materias: number;
    ras: number;
  };
}

export default function DashboardPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [nombreCurso, setNombreCurso] = useState("");

  const fetchCursos = useCallback(async () => {
    setLoading(true);
    const res: ActionResult<Curso[]> = await obtenerTodosLosCursos();
    if (res.success && res.data) {
      setCursos(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCursos(); }, [fetchCursos]);

  const handleCrearCurso = async () => {
    if (!nombreCurso.trim()) return;
    const res = await crearCurso(nombreCurso);
    if (res.success) {
      setNombreCurso("");
      setModalCrear(false);
      fetchCursos();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Banner Hero Dinámico */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
                <GraduationCap className="h-10 w-10" />
                GradeBook RA
              </h1>
              <p className="text-blue-100 text-lg max-w-2xl">
                Sistema inteligente de gestión académica con cálculo progresivo de notas basado en Resultados de Aprendizaje
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/materias">
                <Button size="lg" variant="secondary" className="bg-white text-blue-700 hover:bg-gray-100">
                  <Layers className="w-5 h-5 mr-2" />
                  Gestionar Materias
                </Button>
              </Link>
              <Button size="lg" onClick={() => setModalCrear(true)} className="bg-blue-500 hover:bg-blue-400 border-2 border-blue-400">
                <Plus className="w-5 h-5 mr-2" />
                Crear Curso
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Flujo Rápido */}
        <Card className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-200 text-amber-700 rounded-xl">
                <Lightbulb className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">🚀 Flujo Rápido de Configuración Didáctica</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3 bg-white/60 p-3 rounded-lg">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Paso 1</p>
                      <p className="text-sm text-gray-600">Crea un curso y asígnalo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/60 p-3 rounded-lg">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Paso 2</p>
                      <p className="text-sm text-gray-600">Carga estudiantes desde Excel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/60 p-3 rounded-lg">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Paso 3</p>
                      <p className="text-sm text-gray-600">Define RAs y ponderaciones</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Cursos */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Tus Cursos</h2>
            <p className="text-gray-500 mt-2">
              {cursos.length > 0 
                ? `${cursos.length} curso${cursos.length > 1 ? 's' : ''} disponible${cursos.length > 1 ? 's' : ''}`
                : "Aún no tienes cursos creados"
              }
            </p>
          </div>
          {cursos.length > 0 && (
            <Button variant="outline" size="sm" onClick={fetchCursos} className="hidden sm:flex">
              <CheckCircle className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <Card key={i} className="h-48">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-8" />
                  <div className="flex gap-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cursos.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-20 text-center">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Comienza aquí!</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Crea tu primer curso para comenzar a gestionar estudiantes y calificaciones con el método de Resultados de Aprendizaje
              </p>
              <Button size="lg" onClick={() => setModalCrear(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-5 h-5 mr-2" />
                Crear mi primer curso
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {cursos.map((curso) => (
              <Link key={curso.id} href={`/cursos/${curso.id}`} className="block h-full">
                <Card className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 shadow-md hover:border-blue-300 cursor-pointer h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-2">
                      {curso.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">{curso._count.estudiantes}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Estudiantes</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-600">{curso._count.materias}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Materias</div>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" className="w-full mt-4 group-hover:bg-blue-50 transition-colors">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Abrir Curso
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Modal Crear Curso */}
      <Dialog open={modalCrear} onOpenChange={setModalCrear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Crear Nuevo Curso</DialogTitle>
            <DialogDescription>
              Define el nombre del curso que aparecerá en el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-curso" className="text-sm font-semibold">Nombre del Curso</Label>
              <Input
                id="nombre-curso"
                placeholder="Ej: 10mo Año - Matemáticas"
                value={nombreCurso}
                onChange={(e) => setNombreCurso(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCrearCurso()}
                className="text-lg h-12 focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setModalCrear(false)}>Cancelar</Button>
              <Button onClick={handleCrearCurso} disabled={!nombreCurso.trim()} className="px-6">
                <Plus className="w-4 h-4 mr-2" />
                Crear Curso
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
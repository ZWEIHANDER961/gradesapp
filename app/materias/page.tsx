"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BookOpen, Plus, Trash2, ChevronRight, GraduationCap, ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ActionResult } from "@/types";
import { obtenerMateriasConCursos, crearMateria, eliminarMateria } from "@/app/actions/materiaActions";
import { obtenerCursosDeMateria, crearCursoYAsignar, eliminarCurso } from "@/app/actions/cursoActions";

interface MateriaItem {
  id: string;
  nombre: string;
  _count: { cursos: number };
}

interface CursoItem {
  id: string;
  nombre: string;
  _count: { estudiantes: number; ras: number };
}

export default function MateriasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const materiaIdParam = searchParams.get("materiaId");

  const [materias, setMaterias] = useState<MateriaItem[]>([]);
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMateria, setSelectedMateria] = useState<string | null>(materiaIdParam);
  const [newMateriaName, setNewMateriaName] = useState("");
  const [newCursoName, setNewCursoName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cursoDialogOpen, setCursoDialogOpen] = useState(false);

  const fetchMaterias = useCallback(async () => {
    const data: ActionResult<MateriaItem[]> = await obtenerMateriasConCursos();
    if (data.success && data.data) {
      setMaterias(data.data);
    }
    setLoading(false);
  }, []);

  const fetchCursos = useCallback(async (materiaId: string) => {
    const data: ActionResult<CursoItem[]> = await obtenerCursosDeMateria(materiaId);
    if (data.success && data.data) {
      setCursos(data.data);
    }
  }, []);

  useEffect(() => {
    fetchMaterias();
  }, [fetchMaterias]);

  useEffect(() => {
    if (selectedMateria) {
      fetchCursos(selectedMateria);
    } else {
      setCursos([]);
    }
  }, [selectedMateria, fetchCursos]);

  const handleCrearMateria = async () => {
    if (!newMateriaName.trim()) {
      toast.error("El nombre de la materia es requerido.");
      return;
    }
    const data: ActionResult<string> = await crearMateria(newMateriaName.trim());
    if (data.success) {
      toast.success("Materia creada exitosamente.");
      setNewMateriaName("");
      setDialogOpen(false);
      fetchMaterias();
    } else {
      toast.error(data.error || "Error al crear materia.");
    }
  };

  const handleEliminarMateria = async (id: string) => {
    const data: ActionResult<boolean> = await eliminarMateria(id);
    if (data.success) {
      toast.success("Materia eliminada.");
      if (selectedMateria === id) {
        setSelectedMateria(null);
        setCursos([]);
      }
      fetchMaterias();
    } else {
      toast.error(data.error || "Error al eliminar materia.");
    }
  };

  const handleCrearCurso = async () => {
    if (!newCursoName.trim() || !selectedMateria) {
      toast.error("El nombre del curso es requerido.");
      return;
    }
    const data: ActionResult<string> = await crearCursoYAsignar(newCursoName.trim(), selectedMateria);
    if (data.success) {
      toast.success("Curso creado exitosamente.");
      setNewCursoName("");
      setCursoDialogOpen(false);
      fetchCursos(selectedMateria);
    } else {
      toast.error(data.error || "Error al crear curso.");
    }
  };

  const handleEliminarCurso = async (id: string) => {
    if (!selectedMateria) return;
    const data: ActionResult<boolean> = await eliminarCurso(id);
    if (data.success) {
      toast.success("Curso eliminado.");
      fetchCursos(selectedMateria);
    } else {
      toast.error(data.error || "Error al eliminar curso.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">Materias</h1>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva Materia
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Materia</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="materia-nombre">Nombre de la Materia</Label>
                    <Input
                      id="materia-nombre"
                      placeholder="Ej: Programación Avanzada"
                      value={newMateriaName}
                      onChange={(e) => setNewMateriaName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCrearMateria()}
                    />
                  </div>
                  <Button onClick={handleCrearMateria} className="w-full">
                    Crear Materia
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Asignaturas
            </h3>
            <div className="space-y-2">
              {materias.map((materia) => (
                <Card
                  key={materia.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedMateria === materia.id
                      ? "ring-2 ring-blue-500 bg-blue-50/50"
                      : ""
                  }`}
                  onClick={() => setSelectedMateria(materia.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {materia.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {materia._count.cursos}{" "}
                          {materia._count.cursos === 1 ? "curso" : "cursos"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminarMateria(materia.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedMateria ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Cursos / Secciones
                  </h3>
                  <Dialog open={cursoDialogOpen} onOpenChange={setCursoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Nuevo Curso
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear Nuevo Curso</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="curso-nombre">Nombre del Curso</Label>
                          <Input
                            id="curso-nombre"
                            placeholder="Ej: Sección A - 2024"
                            value={newCursoName}
                            onChange={(e) => setNewCursoName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCrearCurso()}
                          />
                        </div>
                        <Button onClick={handleCrearCurso} className="w-full">
                          Crear Curso
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {cursos.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-4 text-sm text-gray-500">
                        No hay cursos en esta materia.
                      </p>
                      <p className="text-xs text-gray-400">
                        Crea un curso para comenzar a gestionar estudiantes y calificaciones.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {cursos.map((curso) => (
                      <Card
                        key={curso.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/cursos/${curso.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {curso.nombre}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500">
                                  {curso._count.estudiantes} est.
                                </span>
                                <span className="text-xs text-gray-500">
                                  {curso._count.ras} RAs
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEliminarCurso(curso.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <BookOpen className="mx-auto h-16 w-16 text-gray-200" />
                  <p className="mt-4 text-sm text-gray-500">
                    Selecciona una materia para ver sus cursos
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

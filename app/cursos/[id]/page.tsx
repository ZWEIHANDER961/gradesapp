"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, Users, Copy, BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ActionResult } from "@/types";

interface CursoDetail {
  id: string;
  nombre: string;
  materiaId: string;
  materia: { id: string; nombre: string };
  estudiantes: { id: string; nombre: string; apellido: string }[];
  ras: {
    id: string;
    codigoRA: string;
    descripcion: string;
    ponderacion: number;
    actividades: {
      id: string;
      nombre: string;
      ponderacion: number;
      calificaciones: { estudianteId: string; puntaje: number }[];
    }[];
  }[];
}

interface CursoSimple {
  id: string;
  nombre: string;
  materia: { nombre: string };
  _count: { estudiantes: number; ras: number };
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function notaBadge(nota: number) {
  if (nota >= 70) return "grade-approved";
  if (nota >= 60) return "grade-at-risk";
  return "grade-failed";
}

function statusLabel(nota: number) {
  if (nota >= 70) return "Aprobado";
  if (nota >= 60) return "En Riesgo";
  return "Reprobado";
}

export default function CursoPage() {
  const params = useParams();
  const router = useRouter();
  const cursoId = params.id as string;

  const [curso, setCurso] = useState<CursoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("gradebook");
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, number>>>({});

  const [raCodigo, setRaCodigo] = useState("");
  const [raDescripcion, setRaDescripcion] = useState("");
  const [raPonderacion, setRaPonderacion] = useState("");
  const [raDialogOpen, setRaDialogOpen] = useState(false);

  const [actNombre, setActNombre] = useState("");
  const [actPonderacion, setActPonderacion] = useState("");
  const [actRaId, setActRaId] = useState("");
  const [actDialogOpen, setActDialogOpen] = useState(false);

  const [estNombre, setEstNombre] = useState("");
  const [estApellido, setEstApellido] = useState("");
  const [estDialogOpen, setEstDialogOpen] = useState(false);

  const [batchText, setBatchText] = useState("");
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  const [cursosDisponibles, setCursosDisponibles] = useState<CursoSimple[]>([]);
  const [cloneTargetId, setCloneTargetId] = useState("");
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

  const fetchCurso = useCallback(async () => {
    const res = await fetch(`/api/cursos/${cursoId}`);
    const data: ActionResult<CursoDetail> = await res.json();
    if (data.success && data.data) {
      setCurso(data.data);
      const grades: Record<string, Record<string, number>> = {};
      for (const ra of data.data.ras) {
        for (const act of ra.actividades) {
          grades[act.id] = {};
          for (const cal of act.calificaciones) {
            grades[act.id][cal.estudianteId] = cal.puntaje;
          }
        }
      }
      setLocalGrades(grades);
    } else {
      toast.error(data.error || "Error al cargar curso.");
    }
    setLoading(false);
  }, [cursoId]);

  useEffect(() => {
    fetchCurso();
  }, [fetchCurso]);

  const totalPonderacionRA = useMemo(() => {
    if (!curso) return 0;
    return curso.ras.reduce((acc, ra) => acc + ra.ponderacion, 0);
  }, [curso]);

  const getActividadPonderacionSum = useCallback(
    (raId: string) => {
      if (!curso) return 0;
      const ra = curso.ras.find((r) => r.id === raId);
      if (!ra) return 0;
      return ra.actividades.reduce((acc, act) => acc + act.ponderacion, 0);
    },
    [curso]
  );

  const calculateRANota = useCallback(
    (raId: string, estudianteId: string): number => {
      if (!curso) return 0;
      const ra = curso.ras.find((r) => r.id === raId);
      if (!ra || ra.actividades.length === 0) return 0;
      let nota = 0;
      for (const act of ra.actividades) {
        const puntaje = localGrades[act.id]?.[estudianteId] ?? 0;
        nota += puntaje * (act.ponderacion / 100);
      }
      return round1(nota);
    },
    [curso, localGrades]
  );

  const calculateNotaFinal = useCallback(
    (estudianteId: string): number => {
      if (!curso) return 0;
      let notaFinal = 0;
      for (const ra of curso.ras) {
        const notaRA = calculateRANota(ra.id, estudianteId);
        notaFinal += notaRA * (ra.ponderacion / 100);
      }
      return round1(notaFinal);
    },
    [curso, calculateRANota]
  );

  const handleGradeChange = (
    actividadId: string,
    estudianteId: string,
    value: string
  ) => {
    const num = value === "" ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    const clamped = Math.min(100, Math.max(0, num));
    setLocalGrades((prev) => ({
      ...prev,
      [actividadId]: {
        ...prev[actividadId],
        [estudianteId]: clamped,
      },
    }));
  };

  const handleGradeSave = async (
    actividadId: string,
    estudianteId: string
  ) => {
    const puntaje = localGrades[actividadId]?.[estudianteId] ?? 0;
    const res = await fetch("/api/calificaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estudianteId, actividadId, puntaje }),
    });
    const data: ActionResult<string> = await res.json();
    if (!data.success) {
      toast.error(data.error || "Error al guardar calificación.");
    }
  };

  const handleCrearRA = async () => {
    const ponderacion = parseInt(raPonderacion);
    if (!raCodigo.trim() || !raDescripcion.trim() || isNaN(ponderacion)) {
      toast.error("Todos los campos son requeridos.");
      return;
    }
    const res = await fetch("/api/ras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cursoId,
        codigoRA: raCodigo.trim(),
        descripcion: raDescripcion.trim(),
        ponderacion,
      }),
    });
    const data: ActionResult<string> = await res.json();
    if (data.success) {
      toast.success("RA creado exitosamente.");
      setRaCodigo("");
      setRaDescripcion("");
      setRaPonderacion("");
      setRaDialogOpen(false);
      fetchCurso();
    } else {
      toast.error(data.error || "Error al crear RA.");
    }
  };

  const handleEliminarRA = async (raId: string) => {
    const res = await fetch(`/api/ras?id=${raId}`, { method: "DELETE" });
    const data: ActionResult<boolean> = await res.json();
    if (data.success) {
      toast.success("RA eliminado.");
      fetchCurso();
    } else {
      toast.error(data.error || "Error al eliminar RA.");
    }
  };

  const handleCrearActividad = async () => {
    const ponderacion = parseInt(actPonderacion);
    if (!actNombre.trim() || !actRaId || isNaN(ponderacion)) {
      toast.error("Todos los campos son requeridos.");
      return;
    }
    const res = await fetch("/api/actividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raId: actRaId,
        nombre: actNombre.trim(),
        ponderacion,
      }),
    });
    const data: ActionResult<string> = await res.json();
    if (data.success) {
      toast.success("Actividad creada exitosamente.");
      setActNombre("");
      setActPonderacion("");
      setActRaId("");
      setActDialogOpen(false);
      fetchCurso();
    } else {
      toast.error(data.error || "Error al crear actividad.");
    }
  };

  const handleEliminarActividad = async (actId: string) => {
    const res = await fetch(`/api/actividades?id=${actId}`, { method: "DELETE" });
    const data: ActionResult<boolean> = await res.json();
    if (data.success) {
      toast.success("Actividad eliminada.");
      fetchCurso();
    } else {
      toast.error(data.error || "Error al eliminar actividad.");
    }
  };

  const handleCrearEstudiante = async () => {
    if (!estNombre.trim() || !estApellido.trim()) {
      toast.error("Nombre y apellido son requeridos.");
      return;
    }
    const res = await fetch("/api/estudiantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: estNombre.trim(),
        apellido: estApellido.trim(),
        cursoId,
      }),
    });
    const data: ActionResult<string> = await res.json();
    if (data.success) {
      toast.success("Estudiante agregado exitosamente.");
      setEstNombre("");
      setEstApellido("");
      setEstDialogOpen(false);
      fetchCurso();
    } else {
      toast.error(data.error || "Error al agregar estudiante.");
    }
  };

  const handleBatchEstudiantes = async () => {
    const lines = batchText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const estudiantes = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) return { apellido: parts[0], nombre: parts[1] };
      return { apellido: parts[0], nombre: "" };
    });
    const validos = estudiantes.filter((e) => e.apellido && e.nombre);
    if (validos.length === 0) {
      toast.error("Formato: Apellido, Nombre (uno por línea).");
      return;
    }
    const res = await fetch("/api/estudiantes/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estudiantes: validos, cursoId }),
    });
    const data: ActionResult<number> = await res.json();
    if (data.success) {
      toast.success(`${data.data} estudiantes agregados.`);
      setBatchText("");
      setBatchDialogOpen(false);
      fetchCurso();
    } else {
      toast.error(data.error || "Error al agregar estudiantes.");
    }
  };

  const handleEliminarEstudiante = async (estId: string) => {
    const res = await fetch(`/api/estudiantes?id=${estId}`, { method: "DELETE" });
    const data: ActionResult<boolean> = await res.json();
    if (data.success) {
      toast.success("Estudiante eliminado.");
      fetchCurso();
    } else {
      toast.error(data.error || "Error al eliminar estudiante.");
    }
  };

  const handleOpenClone = async () => {
    const res = await fetch("/api/cursos");
    const data: ActionResult<CursoSimple[]> = await res.json();
    if (data.success && data.data) {
      const vacios = data.data.filter(
        (c) => c.id !== cursoId && c._count.estudiantes === 0 && c._count.ras === 0
      );
      setCursosDisponibles(vacios);
      setCloneDialogOpen(true);
    }
  };

  const handleClonar = async () => {
    if (!cloneTargetId) {
      toast.error("Selecciona un curso destino.");
      return;
    }
    const res = await fetch("/api/cursos/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursoOrigenId: cursoId, cursoDestinoId: cloneTargetId }),
    });
    const data: ActionResult<boolean> = await res.json();
    if (data.success) {
      toast.success("Estructura clonada exitosamente.");
      setCloneDialogOpen(false);
      setCloneTargetId("");
    } else {
      toast.error(data.error || "Error al clonar estructura.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <p className="text-gray-500">Curso no encontrado.</p>
      </div>
    );
  }

  const sortedEstudiantes = [...curso.estudiantes].sort((a, b) =>
    a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre)
  );

  const hasRAs = curso.ras.length > 0;
  const hasEstudiantes = sortedEstudiantes.length > 0;
  const hasGradebook = hasRAs && hasEstudiantes;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/materias")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{curso.nombre}</h1>
                <p className="text-xs text-gray-500">{curso.materia.nombre}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleOpenClone}>
              <Copy className="h-4 w-4 mr-1" />
              Clonar Estructura
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {curso.estudiantes.length} estudiantes
          </Badge>
          <Badge variant="outline">
            {curso.ras.length} RAs
          </Badge>
          <Badge variant={totalPonderacionRA === 100 ? "default" : "destructive"}>
            Ponderación RA: {totalPonderacionRA}%
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="gradebook">Libro de Calificaciones</TabsTrigger>
            <TabsTrigger value="ras">RAs y Actividades</TabsTrigger>
            <TabsTrigger value="estudiantes">Estudiantes</TabsTrigger>
          </TabsList>

          <TabsContent value="gradebook" className="mt-4">
            {!hasGradebook ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BookOpen className="mx-auto h-16 w-16 text-gray-200" />
                  <p className="mt-4 text-sm text-gray-500">
                    {!hasRAs && !hasEstudiantes
                      ? "Agrega Resultados de Aprendizaje y Estudiantes para comenzar."
                      : !hasRAs
                      ? "Agrega Resultados de Aprendizaje en la pestaña correspondiente."
                      : "Agrega Estudiantes en la pestaña correspondiente."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 min-w-[180px]">
                            Estudiante
                          </th>
                          {curso.ras.map((ra) => (
                            <th
                              key={ra.id}
                              colSpan={ra.actividades.length + 1}
                              className="px-3 py-2 text-center font-semibold text-gray-700 border-l"
                            >
                              <div className="text-xs text-gray-500">{ra.codigoRA}</div>
                              <div className="truncate max-w-[200px]">{ra.descripcion}</div>
                              <div className="text-xs text-gray-400">({ra.ponderacion}%)</div>
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-bold text-gray-800 border-l bg-gray-100">
                            Nota Final
                          </th>
                        </tr>
                        <tr className="border-b">
                          <th className="sticky left-0 z-10 bg-white" />
                          {curso.ras.map((ra) => (
                            <Fragment key={`sub-${ra.id}`}>
                              {ra.actividades.map((act) => (
                                <th
                                  key={act.id}
                                  className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-l"
                                >
                                  <div className="truncate max-w-[100px]">{act.nombre}</div>
                                  <div className="text-gray-400">{act.ponderacion}%</div>
                                </th>
                              ))}
                              <th className="px-2 py-1 text-center text-xs font-semibold text-blue-600 border-l bg-blue-50/50">
                                Prom. RA
                              </th>
                            </Fragment>
                          ))}
                          <th className="border-l" />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedEstudiantes.map((est, idx) => {
                          const notaFinal = calculateNotaFinal(est.id);
                          return (
                            <tr
                              key={est.id}
                              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                            >
                              <td className="sticky left-0 z-10 px-3 py-2 font-medium text-gray-900 bg-inherit whitespace-nowrap">
                                {est.apellido}, {est.nombre}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 ml-1 text-gray-400 hover:text-red-500"
                                  onClick={() => handleEliminarEstudiante(est.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                              {curso.ras.map((ra) => (
                                <Fragment key={`row-${ra.id}-${est.id}`}>
                                  {ra.actividades.map((act) => (
                                    <td key={act.id} className="px-1 py-1 border-l">
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        className="w-16 h-8 text-center text-sm border rounded px-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        value={localGrades[act.id]?.[est.id] ?? ""}
                                        onChange={(e) =>
                                          handleGradeChange(act.id, est.id, e.target.value)
                                        }
                                        onBlur={() => handleGradeSave(act.id, est.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            (e.target as HTMLInputElement).blur();
                                          }
                                        }}
                                      />
                                    </td>
                                  ))}
                                  <td className="px-2 py-1 border-l bg-blue-50/30">
                                    <Badge
                                      className={`${notaBadge(calculateRANota(ra.id, est.id))} text-xs font-semibold`}
                                    >
                                      {calculateRANota(ra.id, est.id)}
                                    </Badge>
                                  </td>
                                </Fragment>
                              ))}
                              <td className="px-2 py-1 border-l bg-gray-50">
                                <Badge
                                  className={`${notaBadge(notaFinal)} text-xs font-bold`}
                                >
                                  {notaFinal}
                                </Badge>
                                <span className="text-xs text-gray-400 ml-1">
                                  {statusLabel(notaFinal)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ras" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Resultados de Aprendizaje
                </h3>
                {totalPonderacionRA !== 100 && (
                  <p className="text-xs text-amber-600 mt-1">
                    La suma de ponderaciones es {totalPonderacionRA}%. Debe ser 100%.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Dialog open={raDialogOpen} onOpenChange={setRaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={totalPonderacionRA >= 100}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nuevo RA
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Resultado de Aprendizaje</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="ra-codigo">Código RA</Label>
                        <Input
                          id="ra-codigo"
                          placeholder="Ej: RA1"
                          value={raCodigo}
                          onChange={(e) => setRaCodigo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ra-descripcion">Descripción</Label>
                        <Textarea
                          id="ra-descripcion"
                          placeholder="Descripción del resultado de aprendizaje"
                          value={raDescripcion}
                          onChange={(e) => setRaDescripcion(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ra-ponderacion">
                          Ponderación (% disponible: {100 - totalPonderacionRA}%)
                        </Label>
                        <Input
                          id="ra-ponderacion"
                          type="number"
                          min={1}
                          max={100 - totalPonderacionRA}
                          placeholder="Ej: 30"
                          value={raPonderacion}
                          onChange={(e) => setRaPonderacion(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleCrearRA}
                        className="w-full"
                        disabled={
                          !raCodigo.trim() ||
                          !raDescripcion.trim() ||
                          raPonderacion === "" ||
                          parseInt(raPonderacion) + totalPonderacionRA > 100
                        }
                      >
                        Crear RA
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={actDialogOpen} onOpenChange={setActDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={curso.ras.length === 0}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nueva Actividad
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Actividad</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>RA asociado</Label>
                        <Select value={actRaId} onValueChange={setActRaId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar RA" />
                          </SelectTrigger>
                          <SelectContent>
                            {curso.ras.map((ra) => (
                              <SelectItem key={ra.id} value={ra.id}>
                                {ra.codigoRA} - {ra.descripcion.slice(0, 40)}... ({getActividadPonderacionSum(ra.id)}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="act-nombre">Nombre de la Actividad</Label>
                        <Input
                          id="act-nombre"
                          placeholder="Ej: Taller 1"
                          value={actNombre}
                          onChange={(e) => setActNombre(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="act-ponderacion">Ponderación (%)</Label>
                        <Input
                          id="act-ponderacion"
                          type="number"
                          min={1}
                          max={100}
                          placeholder="Ej: 25"
                          value={actPonderacion}
                          onChange={(e) => setActPonderacion(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleCrearActividad}
                        className="w-full"
                        disabled={
                          !actNombre.trim() ||
                          !actRaId ||
                          actPonderacion === "" ||
                          (actRaId !== "" &&
                            getActividadPonderacionSum(actRaId) +
                              parseInt(actPonderacion || "0") >
                              100)
                        }
                      >
                        Crear Actividad
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {curso.ras.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-gray-500">
                    No hay Resultados de Aprendizaje creados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {curso.ras.map((ra) => (
                  <Card key={ra.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">
                            <span className="font-bold text-blue-600">{ra.codigoRA}</span>
                            {" - "}
                            {ra.descripcion}
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1">
                            Ponderación: {ra.ponderacion}% | Actividades: {ra.actividades.length} | Suma ponderaciones: {getActividadPonderacionSum(ra.id)}%
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleEliminarRA(ra.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {ra.actividades.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">
                          Sin actividades creadas.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {ra.actividades.map((act) => (
                            <div
                              key={act.id}
                              className="flex items-center justify-between rounded-lg border px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-700">{act.nombre}</p>
                                <p className="text-xs text-gray-400">{act.ponderacion}%</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-400 hover:text-red-600"
                                onClick={() => handleEliminarActividad(act.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="estudiantes" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Estudiantes ({sortedEstudiantes.length})
              </h3>
              <div className="flex gap-2">
                <Dialog open={estDialogOpen} onOpenChange={setEstDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Estudiante</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="est-apellido">Apellido</Label>
                        <Input
                          id="est-apellido"
                          placeholder="Ej: García"
                          value={estApellido}
                          onChange={(e) => setEstApellido(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="est-nombre">Nombre</Label>
                        <Input
                          id="est-nombre"
                          placeholder="Ej: Juan"
                          value={estNombre}
                          onChange={(e) => setEstNombre(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleCrearEstudiante}
                        className="w-full"
                        disabled={!estNombre.trim() || !estApellido.trim()}
                      >
                        Agregar Estudiante
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Users className="h-4 w-4 mr-1" />
                      Carga Masiva
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Carga Masiva de Estudiantes</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Lista de Estudiantes</Label>
                        <Textarea
                          placeholder={"Apellido, Nombre (uno por línea)\nEj:\nGarcía, Juan\nPérez, María"}
                          rows={8}
                          value={batchText}
                          onChange={(e) => setBatchText(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleBatchEstudiantes} className="w-full">
                        Agregar Estudiantes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {sortedEstudiantes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-sm text-gray-500">
                    No hay estudiantes en este curso.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Apellido</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Nombre</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Nota Final</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEstudiantes.map((est, idx) => {
                        const notaFinal = calculateNotaFinal(est.id);
                        return (
                          <tr key={est.id} className={idx % 2 === 0 ? "" : "bg-gray-50/30"}>
                            <td className="px-4 py-2 font-medium">{est.apellido}</td>
                            <td className="px-4 py-2">{est.nombre}</td>
                            <td className="px-4 py-2 text-right">
                              <Badge className={`${notaBadge(notaFinal)} text-xs font-semibold`}>
                                {notaFinal}
                              </Badge>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-400 hover:text-red-600"
                                onClick={() => handleEliminarEstudiante(est.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clonar Estructura Académica</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-gray-500">
                Selecciona un curso vacío para copiar los RAs y Actividades de este curso.
              </p>
              {cursosDisponibles.length === 0 ? (
                <p className="text-sm text-amber-600">
                  No hay cursos vacíos disponibles para clonar.
                </p>
              ) : (
                <>
                  <Select value={cloneTargetId} onValueChange={setCloneTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {cursosDisponibles.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre} ({c.materia.nombre})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleClonar} className="w-full" disabled={!cloneTargetId}>
                    Clonar Estructura
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, BookOpen, Pencil, FileUp, Calculator, Link as LinkIcon, Search, Download, UserPlus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import * as xlsx from "xlsx";
import type { ActionResult } from "@/types";
import { guardarCalificacionInline } from "@/app/actions/calificacionActions";
import { importarExcelEstudiantes, actualizarEstudiante, eliminarEstudiante, crearEstudiante } from "@/app/actions/estudianteActions";
import { crearRA, actualizarRA, eliminarRA, crearActividad, actualizarActividad, eliminarActividad } from "@/app/actions/raActions";
import { obtenerTodasMaterias } from "@/app/actions/materiaActions";
import { asignarMateriaExistente, obtenerCursoDetalle, eliminarCurso } from "@/app/actions/cursoActions";

// --- INTERFACES ESTRICTAS ---
interface Calificacion {
  estudianteId: string;
  puntaje: number;
}

interface Actividad {
  id: string;
  nombre: string;
  ponderacion: number;
  calificaciones: Calificacion[];
}

interface ResultadoAprendizaje {
  id: string;
  codigoRA: string;
  descripcion: string;
  ponderacion: number;
  actividades: Actividad[];
}

interface MateriaAsignada {
  id: string;
  materia: {
    id: string;
    nombre: string;
  };
  ras: ResultadoAprendizaje[];
}

interface Estudiante {
  id: string;
  numeroOrden: number;
  nombre: string;
  apellido: string;
}

interface CursoDetail {
  id: string;
  nombre: string;
  estudiantes: Estudiante[];
  materias: MateriaAsignada[];
}
// ----------------------------

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export default function CursoPage() {
  const params = useParams();
  const router = useRouter();
  const cursoId = params.id as string;

  const [curso, setCurso] = useState<CursoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("estudiantes");
  
  // --- NUEVOS ESTADOS PARA EL CONTROL DE LA VISTA ---
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>("");
  const [selectedRaId, setSelectedRaId] = useState<string>(""); // Picker de RA
  const [searchTerm, setSearchTerm] = useState(""); // Filtro de estudiantes

  // null significa que la celda está vacía (no evaluado)
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, number | null>>>({});

  // Modals States
  const [modalType, setModalType] = useState<"estudiante"|"excel"|"ra"|"act"|"asignarMateria"|"explicacion"|null>(null);
  const [formEst, setFormEst] = useState({ id: "", num: 0, nom: "", ape: "" });
  const [formRa, setFormRa] = useState({ id: "", cod: "", desc: "", pond: 0 });
  const [formAct, setFormAct] = useState({ id: "", raId: "", nom: "", pond: 0 });
  
  // States for Asignar Materia
  const [allMaterias, setAllMaterias] = useState<{id: string, nombre: string}[]>([]);
  const [materiaToAssign, setMateriaToAssign] = useState("");

  const fetchCurso = useCallback(async () => {
    const data: ActionResult<CursoDetail> = await obtenerCursoDetalle(cursoId);
    if (data.success && data.data) {
      setCurso(data.data);
      
      // Autoseleccionar la primera materia y su primer RA si existen
      if (data.data.materias.length > 0 && !selectedMateriaId) {
        const primeraMateria = data.data.materias[0];
        setSelectedMateriaId(primeraMateria.id);
        if (primeraMateria.ras.length > 0) {
          setSelectedRaId(primeraMateria.ras[0].id);
        }
      }

      const grades: Record<string, Record<string, number | null>> = {};
      data.data.materias.forEach((cm) => {
        cm.ras.forEach((ra) => {
          ra.actividades.forEach((act) => {
            grades[act.id] = {};
            act.calificaciones.forEach((cal) => {
              grades[act.id][cal.estudianteId] = cal.puntaje;
            });
          });
        });
      });
      setLocalGrades(grades);
    } else {
      toast.error(data.error || "Error al cargar curso.");
    }
    setLoading(false);
  }, [cursoId, selectedMateriaId]);

  useEffect(() => { fetchCurso(); }, [fetchCurso]);

  // --- LÓGICA DE SELECCIÓN Y FILTRADO ---
  const materiaActual = useMemo(() => curso?.materias.find(m => m.id === selectedMateriaId), [curso, selectedMateriaId]);
  
  // 1. Obtener solo el RA seleccionado
  const raActual = useMemo(() => materiaActual?.ras.find(r => r.id === selectedRaId), [materiaActual, selectedRaId]);

  // 2. Filtrar estudiantes en tiempo real
  const estudiantesFiltrados = useMemo(() => {
    if (!curso) return [];
    const query = searchTerm.toLowerCase();
    return curso.estudiantes.filter(est => 
      est.nombre.toLowerCase().includes(query) || 
      est.apellido.toLowerCase().includes(query) || 
      est.numeroOrden.toString().includes(query)
    );
  }, [curso, searchTerm]);

  const sumRAs = useMemo(() => materiaActual?.ras.reduce((acc, ra) => acc + ra.ponderacion, 0) || 0, [materiaActual]);
  const invalidRAs = useMemo(() => materiaActual?.ras.filter(ra => ra.actividades.reduce((a, b) => a + b.ponderacion, 0) !== 100) || [], [materiaActual]);
  const isValidMatrix = sumRAs === 100 && invalidRAs.length === 0;

  const handleGradeChange = (actId: string, estId: string, val: string) => {
    const num = val === "" ? null : parseFloat(val);
    const clamped = num !== null ? Math.min(100, Math.max(0, num)) : null;
    setLocalGrades(prev => ({ ...prev, [actId]: { ...prev[actId], [estId]: clamped } }));
  };

  const handleGradeSave = async (actId: string, estId: string) => {
    const puntaje = localGrades[actId]?.[estId] ?? null;
    const res = await guardarCalificacionInline(estId, actId, puntaje);
    if (!res.success) toast.error(res.error);
  };

  // 4. LÓGICA DE PROMEDIOS SEPARADOS (PROGRESIVOS)
  const calculateRANota = useCallback((raId: string, estudianteId: string): number | null => {
    if (!materiaActual) return null;
    const ra = materiaActual.ras.find(r => r.id === raId);
    if (!ra || ra.actividades.length === 0) return null;
    
    let notaAcumulada = 0;
    let pesoEvaluado = 0;
    let tieneEvaluaciones = false;

    for (const act of ra.actividades) {
      const puntaje = localGrades[act.id]?.[estudianteId];
      if (puntaje !== undefined && puntaje !== null) {
        notaAcumulada += puntaje * (act.ponderacion / 100);
        pesoEvaluado += (act.ponderacion / 100);
        tieneEvaluaciones = true;
      }
    }
    
    if (!tieneEvaluaciones || pesoEvaluado === 0) return null;
    return round1(notaAcumulada / pesoEvaluado);
  }, [materiaActual, localGrades]);

  const calculateNotaFinal = useCallback((estudianteId: string): number | null => {
    if (!materiaActual) return null;
    let notaFinal = 0;
    let pesoEvaluado = 0;
    let tieneEvaluaciones = false;

    for (const ra of materiaActual.ras) {
      const notaRA = calculateRANota(ra.id, estudianteId);
      if (notaRA !== null) {
        notaFinal += notaRA * (ra.ponderacion / 100);
        pesoEvaluado += (ra.ponderacion / 100);
        tieneEvaluaciones = true;
      }
    }
    
    if (!tieneEvaluaciones || pesoEvaluado === 0) return null;
    return round1(notaFinal / pesoEvaluado);
  }, [materiaActual, calculateRANota]);

  // 6. OPTIMIZACIÓN DEL FORMULARIO DE REGISTRO
  const submitEstudiante = async () => {
    const { id, num, nom, ape } = formEst;
    if (!nom.trim() || !ape.trim()) return toast.error("Nombre y Apellido son requeridos");
    if (num <= 0) return toast.error("El número de orden debe ser mayor a 0");
    
    const duplicado = curso?.estudiantes.find(e => e.numeroOrden === num && e.id !== id);
    if (duplicado) {
      return toast.error(`El número de lista ${num} ya está asignado a ${duplicado.nombre} ${duplicado.apellido}.`);
    }

    if (id) {
      const r = await actualizarEstudiante(id, num, nom, ape);
      if (r.success) { toast.success("Estudiante actualizado"); setModalType(null); fetchCurso(); } else toast.error(r.error);
    } else {
      const r = await crearEstudiante(num, nom, ape, cursoId);
      if (r.success) { toast.success("Estudiante registrado"); setModalType(null); fetchCurso(); } else toast.error(r.error);
    }
  };

  const handleExcelImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    toast.info("Procesando Excel...");
    const res = await importarExcelEstudiantes(cursoId, fd);
    if (res.success) {
      toast.success(`Se importaron ${res.data} estudiantes.`);
      setModalType(null);
      fetchCurso();
    } else {
      toast.error(res.error);
    }
  };

  const submitRA = async () => {
    if (!selectedMateriaId) return;
    if (formRa.id) {
      const r = await actualizarRA(formRa.id, formRa.cod, formRa.desc, formRa.pond);
      if (r.success) { toast.success("RA Editado"); setModalType(null); fetchCurso(); } else toast.error(r.error);
    } else {
      const r = await crearRA(selectedMateriaId, formRa.cod, formRa.desc, formRa.pond);
      if (r.success) { toast.success("RA Creado"); setModalType(null); fetchCurso(); } else toast.error(r.error);
    }
  };

  const submitActividad = async () => {
    if (formAct.id) {
      const r = await actualizarActividad(formAct.id, formAct.nom, formAct.pond);
      if (r.success) { toast.success("Actividad Editada"); setModalType(null); fetchCurso(); } else toast.error(r.error);
    } else {
      const r = await crearActividad(formAct.raId, formAct.nom, formAct.pond);
      if (r.success) { toast.success("Actividad Creada"); setModalType(null); fetchCurso(); } else toast.error(r.error);
    }
  };

  const abrirModalAsignarMateria = async () => {
    const res = await obtenerTodasMaterias();
    if (res.success && res.data) {
      const asignadas = curso?.materias.map(m => m.materia.id) || [];
      setAllMaterias(res.data.filter(m => !asignadas.includes(m.id)));
      setMateriaToAssign("");
      setModalType("asignarMateria");
    } else {
      toast.error("Error al cargar materias disponibles.");
    }
  };

  const submitAsignarMateria = async () => {
    if (!materiaToAssign) return;
    const res = await asignarMateriaExistente(cursoId, materiaToAssign);
    if (res.success) {
      toast.success("Materia vinculada con éxito.");
      setModalType(null);
      fetchCurso();
    } else {
      toast.error(res.error || "Error al vincular.");
    }
  };

  // 5. EXPORTACIÓN ESTRUCTURADA A EXCEL
  const exportarRA = () => {
    if (!raActual || !curso) return;
    
    const data = estudiantesFiltrados.map(est => {
      const fila: Record<string, string | number> = {
        "Nº Lista": est.numeroOrden,
        "Estudiante": `${est.apellido}, ${est.nombre}`
      };
      
      raActual.actividades.forEach(act => {
        fila[act.nombre] = localGrades[act.id]?.[est.id] ?? "";
      });
      
      const prom = calculateRANota(raActual.id, est.id);
      fila["Promedio RA"] = prom !== null ? prom : "S/E";
      
      const calculo = prom !== null ? round1(prom * (raActual.ponderacion / 100)) : "S/E";
      fila["Cálculo (Aporte)"] = calculo;

      return fila;
    });

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Calificaciones");
    xlsx.writeFile(workbook, `Calificaciones_${raActual.codigoRA}.xlsx`);
    toast.success("Excel generado con éxito");
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center">
          <Skeleton className="h-6 w-64" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-96 w-full rounded-lg" />
      </main>
    </div>
  );

  if (!curso) return <div className="p-8">Curso no encontrado.</div>;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <header className="border-b bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">{curso.nombre}</h1>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Curso
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este Curso?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borrarán permanentemente todos los estudiantes, materias, RAs y calificaciones.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { 
                    await eliminarCurso(cursoId); 
                    router.push("/dashboard"); 
                  }} className="bg-red-600">
                    Eliminar Definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border shadow-sm p-1">
              <TabsTrigger value="estudiantes" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">1. Alumnos y Matrícula</TabsTrigger>
              <TabsTrigger value="materias" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">2. Materias y Calificaciones</TabsTrigger>
            </TabsList>

            <TabsContent value="estudiantes">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Listado de Estudiantes</CardTitle>
                    <CardDescription>Gestione la lista del curso. Ordenados automáticamente por Número de Orden.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setModalType("excel")}>
                      <FileUp className="w-4 h-4 mr-2" /> Importar Excel
                    </Button>
                    <Button onClick={() => { setFormEst({ id: "", num: curso.estudiantes.length + 1, nom: "", ape: "" }); setModalType("estudiante"); }}>
                      <Plus className="w-4 h-4 mr-2" /> Añadir Estudiante
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold w-24">Ord.</th>
                          <th className="px-4 py-3 text-left font-semibold">Apellidos, Nombres</th>
                          <th className="px-4 py-3 text-right font-semibold w-24">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y bg-white">
                        {curso.estudiantes.map((est) => (
                          <tr key={est.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-gray-500">{est.numeroOrden}</td>
                            <td className="px-4 py-2 font-medium text-gray-800">{est.apellido}, {est.nombre}</td>
                            <td className="px-4 py-2 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setFormEst({ id: est.id, num: est.numeroOrden, nom: est.nombre, ape: est.apellido }); setModalType("estudiante"); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={async () => { await eliminarEstudiante(est.id); fetchCurso(); }}><Trash2 className="h-4 w-4" /></Button>
                            </td>
                          </tr>
                        ))}
                        {curso.estudiantes.length === 0 && (
                          <tr><td colSpan={3} className="text-center py-8 text-gray-500">No hay estudiantes. Use 'Importar Excel'.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materias" className="space-y-4">
              {/* Cabecera de Materias y Picker de RA */}
              <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border justify-between flex-wrap">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <Label className="font-semibold text-gray-700">Materia:</Label>
                    {curso.materias.length === 0 ? (
                      <div className="text-sm text-yellow-600 font-medium mt-2">Sin materias asignadas.</div>
                    ) : (
                      <Select value={selectedMateriaId} onValueChange={(val) => {
                        setSelectedMateriaId(val);
                        const mat = curso.materias.find(m => m.id === val);
                        if (mat && mat.ras.length > 0) {
                          setSelectedRaId(mat.ras[0].id);
                        } else {
                          setSelectedRaId("");
                        }
                      }}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Seleccione una materia..." />
                        </SelectTrigger>
                        <SelectContent>
                          {curso.materias.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.materia.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* PICKER DE RA */}
                  {materiaActual && materiaActual.ras.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <Label className="font-semibold text-gray-700">Resultado de Aprendizaje (RA):</Label>
                      <Select value={selectedRaId} onValueChange={setSelectedRaId}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Seleccione un RA..." />
                        </SelectTrigger>
                        <SelectContent>
                          {materiaActual.ras.map((ra) => (
                            <SelectItem key={ra.id} value={ra.id}>
                              {ra.codigoRA} - {ra.descripcion.substring(0, 20)}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={abrirModalAsignarMateria}>
                  <LinkIcon className="w-4 h-4 mr-2" /> Vincular Materia Existente
                </Button>
              </div>

              {materiaActual ? (
                <>
                  {!isValidMatrix && (
                    <Card className="bg-yellow-50 border-yellow-300">
                      <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="text-yellow-600 shrink-0 mt-1" />
                        <div>
                          <h4 className="font-bold text-yellow-800">¡Aviso! La configuración matemática está incompleta.</h4>
                          <ul className="list-disc pl-5 text-sm text-yellow-700 mt-1">
                            {sumRAs !== 100 && <li>La suma de todos los RAs es {sumRAs}%. Debería ser 100%.</li>}
                            {invalidRAs.map((ra) => (
                              <li key={ra.id}>Las actividades del <strong>{ra.codigoRA}</strong> suman {ra.actividades.reduce((a,b)=>a+b.ponderacion,0)}%. Debería ser 100%.</li>
                            ))}
                          </ul>
                          <p className="text-xs font-semibold text-yellow-800 mt-2">Te recomendamos corregir la estructura para que los cálculos finales sean exactos.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="shadow-sm">
                    <CardHeader className="pb-0 pt-4 flex flex-row items-center justify-between flex-wrap gap-4">
                      <div>
                        <CardTitle className="text-lg">
                          Libro de Calificaciones {raActual ? `- ${raActual.codigoRA}` : ""}
                        </CardTitle>
                        <CardDescription>Visualizando únicamente las actividades del RA seleccionado.</CardDescription>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="relative w-64">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input 
                            placeholder="Buscar alumno o N°..." 
                            className="pl-9" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <Button variant="outline" onClick={exportarRA} disabled={!raActual}>
                          <Download className="w-4 h-4 mr-2"/> Excel
                        </Button>
                        <Button size="sm" onClick={() => { setFormRa({ id: "", cod: "", desc: "", pond: 0 }); setModalType("ra"); }}>
                          <Plus className="w-4 h-4 mr-1"/> Añadir RA
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-4 overflow-x-auto w-full">
                      {raActual ? (
                        <table className="w-full text-sm border-collapse min-w-[800px]">
                          <thead>
                            <tr>
                              <th rowSpan={2} className="sticky left-0 z-20 bg-gray-100 border-b border-r px-4 py-3 text-left font-semibold text-gray-700 shadow-[1px_0_0_0_#e5e7eb]">
                                Estudiantes
                              </th>
                              <th colSpan={raActual.actividades.length || 1} className="bg-blue-50 border-b border-r px-2 py-2 text-center align-top relative group">
                                <div className="flex justify-center items-center gap-2 font-bold text-blue-900">
                                  {raActual.codigoRA} <span className="text-blue-600">({raActual.ponderacion}%)</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-200 rounded text-blue-700" onClick={() => { setFormRa({ id: raActual.id, cod: raActual.codigoRA, desc: raActual.descripcion, pond: raActual.ponderacion }); setModalType("ra"); }}><Pencil className="w-3 h-3"/></button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Editar RA</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-200 rounded text-green-700" onClick={() => { setFormAct({ id: "", raId: raActual.id, nom: "", pond: 0 }); setModalType("act"); }} title="Añadir Actividad"><Plus className="w-4 h-4"/></button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Añadir Actividad</p></TooltipContent>
                                  </Tooltip>
                                </div>
                                <p className="text-[10px] text-blue-700/70 truncate max-w-[200px] mx-auto font-normal" title={raActual.descripcion}>{raActual.descripcion}</p>
                              </th>
                              <th rowSpan={2} className="bg-indigo-100 text-indigo-900 border-b border-l px-4 py-3 text-center font-bold w-24 shadow-[-1px_0_0_0_#e5e7eb]">
                                Prom. RA
                              </th>
                              <th rowSpan={2} className="bg-blue-50 border-b border-l px-4 py-3 text-center font-bold w-32 shadow-[-1px_0_0_0_#e5e7eb]">
                                Cálculo
                              </th>
                              <th rowSpan={2} className="bg-gray-800 text-white border-b border-l px-4 py-3 text-center font-bold w-24 shadow-[-1px_0_0_0_#e5e7eb]">
                                Nota Final
                              </th>
                            </tr>
                            <tr>
                              {raActual.actividades.length === 0 ? (
                                <th className="bg-white border-b border-r px-2 py-2 text-center text-xs text-red-500 font-medium">Sin Actividades</th>
                              ) : (
                                raActual.actividades.map((act) => (
                                  <th key={act.id} className="bg-white border-b border-r px-2 py-1 text-center font-medium text-gray-700 relative group min-w-[100px]">
                                    <div className="flex justify-center items-center gap-1">
                                      <span className="truncate max-w-[80px]" title={act.nombre}>{act.nombre}</span>
                                      <span className="text-gray-400 text-[10px] font-bold">{act.ponderacion}%</span>
                                      <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded text-gray-500 absolute right-1" onClick={() => { setFormAct({ id: act.id, raId: raActual.id, nom: act.nombre, pond: act.ponderacion }); setModalType("act"); }}><Pencil className="w-3 h-3"/></button>
                                    </div>
                                  </th>
                                ))
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {estudiantesFiltrados.map((est) => {
                              const nf = calculateNotaFinal(est.id);
                              const nRa = calculateRANota(raActual.id, est.id);
                              const colorBadge = nf !== null && nf >= 70 ? 'bg-green-100 text-green-800 border-green-200' : nf !== null && nf >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200';
                              return (
                                <tr key={est.id} className="hover:bg-blue-50/30">
                                  <td className="sticky left-0 z-10 bg-white px-4 py-2 border-r shadow-[1px_0_0_0_#e5e7eb]">
                                    <div className="font-medium text-gray-900 whitespace-nowrap">
                                      <span className="text-gray-400 mr-2 text-xs">#{est.numeroOrden}</span>
                                      {est.apellido}, {est.nombre}
                                    </div>
                                  </td>
                                  {raActual.actividades.length === 0 ? (
                                    <td className="bg-gray-50 border-r px-2 text-center"></td>
                                  ) : (
                                    raActual.actividades.map((act) => (
                                      <td key={act.id} className="px-1 py-1 border-r text-center align-middle">
                                        <input
                                          type="number" min={0} max={100} step={0.1}
                                          placeholder="-"
                                          className="w-16 h-8 text-center text-sm border rounded mx-auto focus:ring-2 focus:ring-blue-500 outline-none"
                                          value={localGrades[act.id]?.[est.id] ?? ""}
                                          onChange={(e) => handleGradeChange(act.id, est.id, e.target.value)}
                                          onBlur={() => handleGradeSave(act.id, est.id)}
                                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                        />
                                      </td>
                                    ))
                                  )}
                                  <td className="px-2 py-2 border-l text-center bg-indigo-50 font-semibold text-indigo-700 shadow-[-1px_0_0_0_#e5e7eb]">
                                    {nRa !== null ? nRa.toFixed(1) : "-"}
                                  </td>
                                  <td className="px-2 py-2 border-l text-center bg-blue-50/50 font-semibold text-blue-700 shadow-[-1px_0_0_0_#e5e7eb]">
                                    {nRa !== null ? (nRa * (raActual.ponderacion / 100)).toFixed(1) : "-"}
                                  </td>
                                  <td className="px-2 py-2 border-l text-center bg-gray-50 font-bold shadow-[-1px_0_0_0_#e5e7eb]">
                                    {nf !== null ? <Badge variant="outline" className={`text-sm ${colorBadge}`}>{nf.toFixed(1)}</Badge> : <span className="text-gray-400">-</span>}
                                  </td>
                                </tr>
                              );
                            })}
                            {estudiantesFiltrados.length === 0 && (
                              <tr>
                                <td colSpan={raActual.actividades.length + 4} className="text-center py-8 text-gray-500">
                                  No se encontraron estudiantes que coincidan con la búsqueda.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          No hay RAs creados para esta materia.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Calculator className="text-slate-400 h-8 w-8" />
                      <div className="text-sm text-slate-600">
                        <strong>Cálculo Progresivo:</strong> El promedio se calcula únicamente sobre las actividades y RAs que ya han sido evaluados. Las celdas vacías no penalizan la nota del estudiante.
                        <Button variant="link" className="px-1 h-auto text-blue-600" onClick={() => setModalType("explicacion")}>Ver fórmula</Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>Usa el botón <strong>"Vincular Materia Existente"</strong> arriba para poder evaluar a los estudiantes en esta pestaña.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Modals CRUD */}
          <Dialog open={modalType === "asignarMateria"} onOpenChange={(o) => !o && setModalType(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vincular Materia Existente</DialogTitle>
                <DialogDescription>Asigna una materia del sistema a este curso para evaluarla.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {allMaterias.length === 0 ? (
                  <p className="text-sm text-yellow-600 font-medium">Todas las materias del sistema ya están en este curso o no has creado ninguna en la sección de Materias.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Seleccione la Materia</Label>
                      <Select value={materiaToAssign} onValueChange={setMateriaToAssign}>
                        <SelectTrigger><SelectValue placeholder="Elegir materia..."/></SelectTrigger>
                        <SelectContent>
                          {allMaterias.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={submitAsignarMateria} className="w-full" disabled={!materiaToAssign}>Vincular al Curso</Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* 6. OPTIMIZACIÓN DEL FORMULARIO DE ESTUDIANTE */}
          <Dialog open={modalType === "estudiante"} onOpenChange={(o) => !o && setModalType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  {formEst.id ? "Editar" : "Añadir"} Estudiante
                </DialogTitle>
                <DialogDescription>
                  Asegúrate de no duplicar el número de lista dentro de esta sección.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-4">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-gray-700">Número de Lista (Orden)</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    className="bg-gray-50 focus:bg-white transition-colors"
                    value={formEst.num} 
                    onChange={e => setFormEst({...formEst, num: parseInt(e.target.value)||0})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-gray-700">Nombres</Label>
                    <Input 
                      className="bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Ej: Juan Carlos"
                      value={formEst.nom} 
                      onChange={e => setFormEst({...formEst, nom: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-gray-700">Apellidos</Label>
                    <Input 
                      className="bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Ej: Pérez Gómez"
                      value={formEst.ape} 
                      onChange={e => setFormEst({...formEst, ape: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t mt-6">
                  <Button variant="outline" className="mr-2" onClick={() => setModalType(null)}>Cancelar</Button>
                  <Button onClick={submitEstudiante}>Confirmar Guardado</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={modalType === "excel"} onOpenChange={(o) => !o && setModalType(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Importar desde Excel</DialogTitle></DialogHeader>
              <form onSubmit={handleExcelImport} className="space-y-4 pt-4">
                <div className="text-sm text-gray-500 mb-2">
                  El archivo debe contener las columnas: <strong>numeroOrden</strong>, <strong>nombre</strong>, <strong>apellido</strong>.<br/>
                  Si hay números duplicados en el curso, se abortará la transacción completa.
                </div>
                <Input type="file" name="file" accept=".xlsx, .xls, .csv" required />
                <Button type="submit" className="w-full">Procesar Archivo</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={modalType === "ra"} onOpenChange={(o) => !o && setModalType(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{formRa.id ? "Editar" : "Nuevo"} Resultado de Aprendizaje (RA)</DialogTitle>
                <DialogDescription>
                  Define un RA con su ponderación. Los RAs pueden crearse libremente; la suma de 100% es solo referencia.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Código</Label>
                  <Input className="col-span-3" placeholder="Ej: RA1" value={formRa.cod} onChange={e => setFormRa({...formRa, cod: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Descripción</Label>
                  <Textarea className="col-span-3" value={formRa.desc} onChange={e => setFormRa({...formRa, desc: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Ponderación (%)</Label>
                  <Input type="number" min={1} max={100} className="col-span-3" value={formRa.pond || ""} onChange={e => setFormRa({...formRa, pond: parseInt(e.target.value)||0})} />
                </div>
                <div className="flex justify-between mt-4">
                  {formRa.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Eliminar RA</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar RA?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción no se puede deshacer. Se borrarán todas las actividades y calificaciones relacionadas.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => { await eliminarRA(formRa.id); setModalType(null); fetchCurso(); }}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button onClick={submitRA} className={!formRa.id ? "w-full" : ""}>Guardar RA</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={modalType === "act"} onOpenChange={(o) => !o && setModalType(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{formAct.id ? "Editar" : "Nueva"} Actividad</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Nombre</Label>
                  <Input className="col-span-3" placeholder="Ej: Taller Práctico" value={formAct.nom} onChange={e => setFormAct({...formAct, nom: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Peso (%)</Label>
                  <Input type="number" min={1} max={100} className="col-span-3" value={formAct.pond} onChange={e => setFormAct({...formAct, pond: parseInt(e.target.value)||0})} />
                </div>
                <div className="flex justify-between mt-4">
                  {formAct.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Eliminar</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar Actividad?</AlertDialogTitle>
                          <AlertDialogDescription>Se borrarán todas las calificaciones de esta actividad.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => { await eliminarActividad(formAct.id); setModalType(null); fetchCurso(); }}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button onClick={submitActividad} className={!formAct.id ? "w-full" : ""}>Guardar Actividad</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={modalType === "explicacion"} onOpenChange={(o) => !o && setModalType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>📊 Cálculo (Rompecabezas)</DialogTitle>
                <DialogDescription>
                  Muestra el aporte del RA: Promedio × Ponderación
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-3 text-sm">
                <p className="font-semibold text-blue-800">Fórmula:</p>
                <p className="text-gray-600">
                  <strong>Cálculo RA</strong> = Promedio RA × (Ponderación RA / 100)
                </p>
                <p className="text-gray-500 text-xs">
                  Ejemplo: RA=85, Ponderación=30% → 85 × 0.30 = 25.5
                </p>
              </div>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </TooltipProvider>
  );
}
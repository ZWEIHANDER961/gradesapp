"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Users, BookOpen, Pencil, FileUp, AlertTriangle, Calculator, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { ActionResult } from "@/types";
import { guardarCalificacionInline } from "@/app/actions/calificacionActions";
import { importarExcelEstudiantes, actualizarEstudiante, eliminarEstudiante, crearEstudiante } from "@/app/actions/estudianteActions";
import { crearRA, actualizarRA, eliminarRA, crearActividad, actualizarActividad, eliminarActividad } from "@/app/actions/raActions";
import { obtenerTodasMaterias } from "@/app/actions/materiaActions";
import { asignarMateriaExistente } from "@/app/actions/cursoActions";

interface CursoDetail {
  id: string;
  nombre: string;
  estudiantes: { id: string; numeroOrden: number; nombre: string; apellido: string }[];
  materias: {
    id: string;
    materia: { id: string; nombre: string };
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
  }[];
}

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
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>("");
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, number>>>({});

  // Modals States
  const [modalType, setModalType] = useState<"estudiante"|"excel"|"ra"|"act"|"asignarMateria"|null>(null);
  const [formEst, setFormEst] = useState({ id: "", num: 0, nom: "", ape: "" });
  const [formRa, setFormRa] = useState({ id: "", cod: "", desc: "", pond: 0 });
  const [formAct, setFormAct] = useState({ id: "", raId: "", nom: "", pond: 0 });
  
  // States for Asignar Materia
  const [allMaterias, setAllMaterias] = useState<{id: string, nombre: string}[]>([]);
  const [materiaToAssign, setMateriaToAssign] = useState("");

  const fetchCurso = useCallback(async () => {
    const res = await fetch(`/api/cursos/${cursoId}`);
    const data: ActionResult<CursoDetail> = await res.json();
    if (data.success && data.data) {
      setCurso(data.data);
      if (data.data.materias.length > 0 && !selectedMateriaId) {
        setSelectedMateriaId(data.data.materias[0].id);
      }
      const grades: Record<string, Record<string, number>> = {};
      data.data.materias.forEach(cm => {
        cm.ras.forEach(ra => {
          ra.actividades.forEach(act => {
            grades[act.id] = {};
            act.calificaciones.forEach(cal => {
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

  const materiaActual = useMemo(() => curso?.materias.find(m => m.id === selectedMateriaId), [curso, selectedMateriaId]);
  const sumRAs = useMemo(() => materiaActual?.ras.reduce((acc, ra) => acc + ra.ponderacion, 0) || 0, [materiaActual]);
  const invalidRAs = useMemo(() => materiaActual?.ras.filter(ra => ra.actividades.reduce((a, b) => a + b.ponderacion, 0) !== 100) || [], [materiaActual]);
  const isValidMatrix = sumRAs === 100 && invalidRAs.length === 0;

  const calculateRANota = useCallback((raId: string, estudianteId: string): number => {
    if (!materiaActual) return 0;
    const ra = materiaActual.ras.find((r) => r.id === raId);
    if (!ra || ra.actividades.length === 0) return 0;
    let nota = 0;
    for (const act of ra.actividades) {
      const puntaje = localGrades[act.id]?.[estudianteId] ?? 0;
      nota += puntaje * (act.ponderacion / 100);
    }
    return round1(nota);
  }, [materiaActual, localGrades]);

  const calculateNotaFinal = useCallback((estudianteId: string): number => {
    if (!materiaActual) return 0;
    let notaFinal = 0;
    for (const ra of materiaActual.ras) {
      const notaRA = calculateRANota(ra.id, estudianteId);
      notaFinal += notaRA * (ra.ponderacion / 100);
    }
    return round1(notaFinal);
  }, [materiaActual, calculateRANota]);

  const handleGradeChange = (actId: string, estId: string, val: string) => {
    if (!isValidMatrix) {
      toast.error("La matriz no es válida matemáticamente (Revise sumas de 100%).");
      return;
    }
    const num = val === "" ? 0 : parseFloat(val);
    if (isNaN(num)) return;
    const clamped = Math.min(100, Math.max(0, num));
    setLocalGrades(prev => ({ ...prev, [actId]: { ...prev[actId], [estId]: clamped } }));
  };

  const handleGradeSave = async (actId: string, estId: string) => {
    if (!isValidMatrix) return;
    const puntaje = localGrades[actId]?.[estId] ?? 0;
    const res = await guardarCalificacionInline(estId, actId, puntaje);
    if (!res.success) toast.error(res.error);
  };

  const submitEstudiante = async () => {
    if (!formEst.nom.trim() || !formEst.ape.trim()) return toast.error("Nombre y Apellido requeridos");
    if (formEst.id) {
      const r = await actualizarEstudiante(formEst.id, formEst.num, formEst.nom, formEst.ape);
      if (r.success) { toast.success("Editado"); setModalType(null); fetchCurso(); } else toast.error(r.error);
    } else {
      const r = await crearEstudiante(formEst.num, formEst.nom, formEst.ape, cursoId);
      if (r.success) { toast.success("Creado"); setModalType(null); fetchCurso(); } else toast.error(r.error);
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

  if (loading) return <div className="p-8"><Skeleton className="h-8 w-64 mb-6" /><Skeleton className="h-96" /></div>;
  if (!curso) return <div className="p-8">Curso no encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
          <BookOpen className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">{curso.nombre}</h1>
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
            {/* Cabecera de Materias - NUEVO BOTÓN AÑADIDO AQUÍ */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border justify-between">
              <div className="flex items-center gap-4">
                <Label className="font-semibold text-gray-700">Materia Seleccionada:</Label>
                {curso.materias.length === 0 ? (
                  <div className="text-sm text-yellow-600 font-medium">Este curso aún no tiene materias asignadas.</div>
                ) : (
                  <Select value={selectedMateriaId} onValueChange={setSelectedMateriaId}>
                    <SelectTrigger className="w-80">
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
                        <h4 className="font-bold text-yellow-800">¡Advertencia! La configuración matemática está incompleta.</h4>
                        <ul className="list-disc pl-5 text-sm text-yellow-700 mt-1">
                          {sumRAs !== 100 && <li>La suma de todos los RAs es {sumRAs}%. Debe ser 100%.</li>}
                          {invalidRAs.map(ra => (
                            <li key={ra.id}>Las actividades del <strong>{ra.codigoRA}</strong> suman {ra.actividades.reduce((a,b)=>a+b.ponderacion,0)}%. Debe ser 100%.</li>
                          ))}
                        </ul>
                        <p className="text-xs font-semibold text-yellow-800 mt-2">Los campos de calificación han sido bloqueados hasta corregir la estructura.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-sm">
                  <CardHeader className="pb-0 pt-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Libro de Calificaciones</CardTitle>
                      <CardDescription>Haga clic en los íconos de lápiz ✏️ de las cabeceras para editar ponderaciones.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => { setFormRa({ id: "", cod: "", desc: "", pond: 0 }); setModalType("ra"); }}>
                      <Plus className="w-4 h-4 mr-1"/> Añadir RA
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 mt-4 overflow-x-auto w-full">
                    <table className="w-full text-sm border-collapse min-w-[800px]">
                      <thead>
                        <tr>
                          <th rowSpan={2} className="sticky left-0 z-20 bg-gray-100 border-b border-r px-4 py-3 text-left font-semibold text-gray-700 shadow-[1px_0_0_0_#e5e7eb]">
                            Estudiantes
                          </th>
                          {materiaActual.ras.map(ra => (
                            <th key={ra.id} colSpan={ra.actividades.length || 1} className="bg-blue-50 border-b border-r px-2 py-2 text-center align-top relative group">
                              <div className="flex justify-center items-center gap-2 font-bold text-blue-900">
                                {ra.codigoRA} <span className="text-blue-600">({ra.ponderacion}%)</span>
                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-200 rounded text-blue-700" onClick={() => { setFormRa({ id: ra.id, cod: ra.codigoRA, desc: ra.descripcion, pond: ra.ponderacion }); setModalType("ra"); }}><Pencil className="w-3 h-3"/></button>
                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-200 rounded text-green-700" onClick={() => { setFormAct({ id: "", raId: ra.id, nom: "", pond: 0 }); setModalType("act"); }} title="Añadir Actividad"><Plus className="w-4 h-4"/></button>
                              </div>
                              <p className="text-[10px] text-blue-700/70 truncate max-w-[200px] mx-auto font-normal" title={ra.descripcion}>{ra.descripcion}</p>
                            </th>
                          ))}
                          <th rowSpan={2} className="bg-gray-800 text-white border-b border-l px-4 py-3 text-center font-bold w-24 shadow-[-1px_0_0_0_#e5e7eb]">
                            Nota Final
                          </th>
                        </tr>
                        <tr>
                          {materiaActual.ras.map(ra => (
                            ra.actividades.length === 0 ? (
                              <th key={`empty-${ra.id}`} className="bg-white border-b border-r px-2 py-2 text-center text-xs text-red-500 font-medium">Sin Actividades</th>
                            ) : (
                              ra.actividades.map(act => (
                                <th key={act.id} className="bg-white border-b border-r px-2 py-1 text-center font-medium text-gray-700 relative group min-w-[100px]">
                                  <div className="flex justify-center items-center gap-1">
                                    <span className="truncate max-w-[80px]" title={act.nombre}>{act.nombre}</span>
                                    <span className="text-gray-400 text-[10px] font-bold">{act.ponderacion}%</span>
                                    <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded text-gray-500 absolute right-1" onClick={() => { setFormAct({ id: act.id, raId: act.raId, nom: act.nombre, pond: act.ponderacion }); setModalType("act"); }}><Pencil className="w-3 h-3"/></button>
                                  </div>
                                </th>
                              ))
                            )
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {curso.estudiantes.map((est) => {
                          const nf = calculateNotaFinal(est.id);
                          const colorBadge = nf >= 70 ? 'bg-green-100 text-green-800 border-green-200' : nf >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200';
                          return (
                            <tr key={est.id} className="hover:bg-blue-50/30">
                              <td className="sticky left-0 z-10 bg-white px-4 py-2 border-r shadow-[1px_0_0_0_#e5e7eb]">
                                <div className="font-medium text-gray-900 whitespace-nowrap">{est.apellido}, {est.nombre}</div>
                              </td>
                              {materiaActual.ras.map(ra => (
                                ra.actividades.length === 0 ? (
                                  <td key={`empty-cell-${ra.id}-${est.id}`} className="bg-gray-50 border-r px-2 text-center"></td>
                                ) : (
                                  ra.actividades.map(act => (
                                    <td key={act.id} className="px-1 py-1 border-r text-center align-middle">
                                      <input
                                        type="number" min={0} max={100} step={0.1}
                                        disabled={!isValidMatrix}
                                        className="w-16 h-8 text-center text-sm border rounded mx-auto disabled:bg-gray-100 disabled:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={localGrades[act.id]?.[est.id] ?? ""}
                                        onChange={(e) => handleGradeChange(act.id, est.id, e.target.value)}
                                        onBlur={() => handleGradeSave(act.id, est.id)}
                                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                      />
                                    </td>
                                  ))
                                )
                              ))}
                              <td className="px-2 py-2 border-l text-center bg-gray-50 font-bold shadow-[-1px_0_0_0_#e5e7eb]">
                                <Badge variant="outline" className={`text-sm ${colorBadge}`}>{nf.toFixed(1)}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Calculator className="text-slate-400 h-8 w-8" />
                    <div className="text-sm text-slate-600">
                      <strong>Cálculo Aplicado:</strong> Cada Actividad vale su % dentro de su RA. La sumatoria de las Actividades da la nota del RA. Luego, la <em>Nota Final</em> se calcula sumando el valor porcentual de cada RA obtenido.
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

        <Dialog open={modalType === "estudiante"} onOpenChange={(o) => !o && setModalType(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{formEst.id ? "Editar" : "Nuevo"} Estudiante</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Nº Orden</Label>
                <Input type="number" className="col-span-3" value={formEst.num} onChange={e => setFormEst({...formEst, num: parseInt(e.target.value)||0})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Nombres</Label>
                <Input className="col-span-3" value={formEst.nom} onChange={e => setFormEst({...formEst, nom: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Apellidos</Label>
                <Input className="col-span-3" value={formEst.ape} onChange={e => setFormEst({...formEst, ape: e.target.value})} />
              </div>
              <Button onClick={submitEstudiante} className="w-full">Guardar</Button>
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
                <Input type="number" min={1} max={100} className="col-span-3" value={formRa.pond} onChange={e => setFormRa({...formRa, pond: parseInt(e.target.value)||0})} />
              </div>
              <div className="flex justify-between mt-4">
                {formRa.id && <Button variant="destructive" onClick={async () => { await eliminarRA(formRa.id); setModalType(null); fetchCurso(); }}><Trash2 className="w-4 h-4 mr-2"/> Eliminar RA</Button>}
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
                {formAct.id && <Button variant="destructive" onClick={async () => { await eliminarActividad(formAct.id); setModalType(null); fetchCurso(); }}><Trash2 className="w-4 h-4 mr-2"/> Eliminar</Button>}
                <Button onClick={submitActividad} className={!formAct.id ? "w-full" : ""}>Guardar Actividad</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
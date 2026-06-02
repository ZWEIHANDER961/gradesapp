import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursoId = searchParams.get("cursoId");

    if (!cursoId) {
      return NextResponse.json({ success: false, error: "cursoId requerido." }, { status: 400 });
    }

    const estudiantes = await prisma.estudiante.findMany({
      where: { cursoId },
      orderBy: { numeroOrden: "asc" },
    });
    return NextResponse.json({ success: true, data: estudiantes });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { numeroOrden, nombre, apellido, cursoId } = await req.json();
    if (!numeroOrden || !nombre?.trim() || !apellido?.trim() || !cursoId) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }
    const estudiante = await prisma.estudiante.create({
      data: {
        numeroOrden,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        cursoId,
      },
    });
    return NextResponse.json({ success: true, data: estudiante.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, numeroOrden, nombre, apellido } = await req.json();
    if (!id || !numeroOrden || !nombre?.trim() || !apellido?.trim()) {
      return NextResponse.json({ success: false, error: "Todos los campos son requeridos." }, { status: 400 });
    }
    await prisma.estudiante.update({
      where: { id },
      data: { numeroOrden, nombre: nombre.trim(), apellido: apellido.trim() },
    });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido." }, { status: 400 });
    }
    await prisma.estudiante.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const materias = await prisma.materia.findMany({
      include: { _count: { select: { cursoMaterias: true } } },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ success: true, data: materias });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre } = await req.json();
<<<<<<< HEAD
    const materia = await prisma.materia.create({ data: { nombre: nombre.trim() } });
    return NextResponse.json({ success: true, data: materia.id });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
=======
    if (!nombre?.trim()) {
      return NextResponse.json({ success: false, error: "Nombre requerido." }, { status: 400 });
    }
    const materia = await prisma.materia.create({ data: { nombre: nombre.trim() } });
    return NextResponse.json({ success: true, data: materia.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    if (msg.includes("Unique")) {
      return NextResponse.json({ success: false, error: "Esa materia ya existe." }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, nombre } = await req.json();
    if (!id || !nombre?.trim()) {
      return NextResponse.json({ success: false, error: "ID y nombre requeridos." }, { status: 400 });
    }
    await prisma.materia.update({ where: { id }, data: { nombre: nombre.trim() } });
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
    await prisma.materia.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
>>>>>>> 657b4de2789b913c725039f61cb1307c61f21cb6

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MATERIAS_SEED = [
  "Diseño de portales web y recursos multimedia",
  "Diseño y desarrollo de base de datos",
  "Administración de base de datos",
  "Desarrollo e implementación de soluciones web y multimedia",
  "Implementación y mantenimiento de aplicaciones y sistemas informáticos",
];

async function main() {
  const count = await prisma.materia.count();
  if (count === 0) {
    for (const nombre of MATERIAS_SEED) {
      await prisma.materia.create({ data: { nombre } });
    }
    console.log("Seed: 5 materias insertadas correctamente.");
  } else {
    console.log(`Seed: Ya existen ${count} materias. No se insertaron duplicados.`);
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

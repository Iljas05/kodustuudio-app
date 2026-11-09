// Idempotent seed: creates/updates ONLY the six built-in system prompts.
// It never touches conversations, messages or custom prompts, so it is safe to run on every deploy.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PromptStyle } from "../src/generated/prisma/client";

const builtInPrompts = [
  {
    key: "lyhike",
    name: "Lühike",
    style: PromptStyle.SHORT,
    isDefault: false,
    content: "Anna lühike ja konkreetne sisustusnõuanne. Vasta ühe-kahe lausega ilma pikkade selgitusteta.",
  },
  {
    key: "uksikasjalik",
    name: "Üksikasjalik",
    style: PromptStyle.DETAILED,
    isDefault: false,
    content: "Anna üksikasjalik sisustusnõuanne koos selgituste ja asjakohaste hoiatustega.",
  },
  {
    key: "algajasobralik",
    name: "Algajasõbralik",
    style: PromptStyle.BEGINNER,
    isDefault: true,
    content: "Selgita sisustust lihtsalt ja sõbralikult, nii et ka algaja saab nõuandest aru. Lisa ohutusmärkus.",
  },
  {
    key: "coder",
    name: "Coder",
    style: PromptStyle.NONE,
    isDefault: false,
    content: "Demoprofiil: programmeerija abiline. Ei muuda vastuseid ega CSV-põhist otsingut.",
  },
  {
    key: "writer",
    name: "Writer",
    style: PromptStyle.NONE,
    isDefault: false,
    content: "Demoprofiil: kirjutaja abiline. Ei muuda vastuseid ega CSV-põhist otsingut.",
  },
  {
    key: "math",
    name: "Math",
    style: PromptStyle.NONE,
    isDefault: false,
    content: "Demoprofiil: matemaatika abiline. Ei muuda vastuseid ega CSV-põhist otsingut.",
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL puudub. Seadista see Railway keskkonnamuutujana.");
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    for (const prompt of builtInPrompts) {
      await prisma.systemPrompt.upsert({
        where: { key: prompt.key },
        update: { name: prompt.name, content: prompt.content, style: prompt.style, isBuiltIn: true, isDefault: prompt.isDefault },
        create: { ...prompt, isBuiltIn: true },
      });
    }
    console.log(`Seed done: ${builtInPrompts.length} built-in prompts upserted.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

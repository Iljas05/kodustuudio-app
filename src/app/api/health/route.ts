import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Always evaluated at request time, never during the build.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok" });
  } catch {
    // Deliberately no error details: they could leak connection information.
    return NextResponse.json(
      { status: "error", database: "unavailable", message: "Andmebaas pole praegu kättesaadav." },
      { status: 503 },
    );
  }
}

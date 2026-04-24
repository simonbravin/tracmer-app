import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@tracmer-app/database";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

function prismaErrorToResponse(
  e: Prisma.PrismaClientKnownRequestError,
):
  | { message: string; status: 409 }
  | { message: string; status: 500 }
  | { message: string; status: 503 } {
  if (e.code === "P2002" && (e.meta?.target as string[] | undefined)?.includes("email")) {
    return { message: "Ya existe una cuenta con ese correo.", status: 409 };
  }
  if (e.code === "P2002") {
    return { message: "Ya existe una cuenta con ese correo.", status: 409 };
  }
  if (["P1001", "P1000", "P1008", "P1017", "P1010"].includes(e.code)) {
    return {
      message: "No pudimos conectar a la base de datos. Reintentá en unos minutos.",
      status: 503,
    };
  }
  if (e.code === "P2021" || e.code === "P2022") {
    return {
      message: "Error de esquema en la base de datos. Avisale al administrador (migraciones).",
      status: 503,
    };
  }
  return { message: "Error al guardar. Intentá de nuevo.", status: 500 };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { name, email, password } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  try {
    const exists = await prisma.user.findFirst({
      where: { email: emailNorm, deletedAt: null },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email: emailNorm,
        name: name.trim(),
        displayName: name.trim(),
        passwordHash,
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = prismaErrorToResponse(e);
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("[register] Prisma known", e.code, e.message);
      } else {
        // eslint-disable-next-line no-console
        console.error("[register] Prisma", e.code, e.message, e.meta);
      }
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    if (e instanceof Prisma.PrismaClientUnknownRequestError || e instanceof Prisma.PrismaClientValidationError) {
      // eslint-disable-next-line no-console
      console.error("[register] Prisma unknown/validation", e);
      return NextResponse.json(
        { error: "Error al guardar. Intentá de nuevo." },
        { status: 500 },
      );
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // eslint-disable-next-line no-console
      console.error("[register] Prisma init", e.message);
      return NextResponse.json(
        { error: "No pudimos conectar a la base de datos. Revisá la configuración." },
        { status: 503 },
      );
    }
    // eslint-disable-next-line no-console
    console.error("[register] Unexpected", e);
    return NextResponse.json(
      { error: "Error del servidor. Intentá de nuevo." },
      { status: 500 },
    );
  }
}

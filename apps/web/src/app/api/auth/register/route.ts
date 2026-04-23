import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@tracmer-app/database";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

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
}

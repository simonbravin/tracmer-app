import { createHash } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@tracmer-app/database";

const bodySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
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
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const row = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) {
    return NextResponse.json(
      { error: "El enlace no es válido o expiró. Pedí uno nuevo." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.deleteMany({
      where: { userId: row.userId, usedAt: null, id: { not: row.id } },
    });
  });

  return NextResponse.json({ ok: true });
}

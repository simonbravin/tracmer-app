import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@tracmer-app/database";

import { sendPasswordResetEmail } from "@/lib/auth/send-password-reset";

const bodySchema = z.object({
  email: z.string().email(),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const sent = await sendPasswordResetEmail(user.email, rawToken);
  if (!sent.ok) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
    return NextResponse.json({ error: sent.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

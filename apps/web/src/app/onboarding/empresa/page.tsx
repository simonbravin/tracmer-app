import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CompleteOrgForm } from "@/components/onboarding/complete-org-form";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@tracmer-app/database";

import { completeOnboardingForm } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingEmpresaPage() {
  getServerEnv();
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/onboarding/empresa");
  }

  const active = await prisma.membership.count({
    where: { userId: session.user.id, deletedAt: null, status: "active" },
  });
  if (active > 0) {
    redirect("/tablero");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-12">
      <CompleteOrgForm action={completeOnboardingForm} />
    </div>
  );
}

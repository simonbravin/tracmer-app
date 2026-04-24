"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@tracmer-app/database";

import { P } from "@/lib/permissions/keys";
import { enforcePermission } from "@/lib/permissions/server";

import { requireOrganizationContext } from "./require-organization";
import {
  clientContactFormSchema,
  clientFormSchema,
  formDataToObject,
} from "./validation";

const CLIENTES = "/clientes";

export type ActionState =
  | { success: true; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function mapPrismaToMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: string }).code === "string"
  ) {
    const c = (err as { code: string }).code;
    if (c === "P2002") {
      return "Ya existe un registro con esos datos (p. ej. CUIT duplicado en la organización).";
    }
    if (c === "P2003" || c === "P2025") {
      return "No se pudo completar: referencia inexistente.";
    }
  }
  if (err instanceof Error && process.env.NODE_ENV === "development") {
    return err.message;
  }
  return "Ocurrió un error al guardar. Intentá de nuevo.";
}

export async function createClient(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const deniedCreate = await enforcePermission(org.ctx, P.clients.create);
  if (deniedCreate) {
    return { success: false, error: deniedCreate };
  }
  const raw = formDataToObject(formData);
  const parsed = clientFormSchema.safeParse({
    legalName: raw.legalName,
    displayName: raw.displayName,
    taxId: raw.taxId,
    address: raw.address,
    phone: raw.phone,
    email: raw.email,
    website: raw.website,
    contactName: raw.contactName,
    notes: raw.notes,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const e of parsed.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return {
      success: false,
      error: "Revisá los campos",
      fieldErrors: fe,
    };
  }
  const d = parsed.data;
  let client: { id: string };
  try {
    client = await prisma.client.create({
      data: {
        organizationId: org.ctx.organizationId,
        legalName: d.legalName,
        displayName: d.displayName,
        taxId: d.taxId,
        address: d.address,
        phone: d.phone,
        email: d.email,
        website: d.website,
        contactName: d.contactName,
        notes: d.notes,
        createdByUserId: org.ctx.appUserId,
      },
      select: { id: true },
    });
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
  revalidatePath(CLIENTES);
  revalidatePath(`${CLIENTES}/${client.id}`);
  redirect(`${CLIENTES}/${client.id}`);
}

export async function updateClient(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const denied = await enforcePermission(org.ctx, P.clients.edit);
  if (denied) {
    return { success: false, error: denied };
  }
  const raw = formDataToObject(formData);
  const parsed = clientFormSchema.safeParse({
    legalName: raw.legalName,
    displayName: raw.displayName,
    taxId: raw.taxId,
    address: raw.address,
    phone: raw.phone,
    email: raw.email,
    website: raw.website,
    contactName: raw.contactName,
    notes: raw.notes,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const e of parsed.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revisá los campos", fieldErrors: fe };
  }
  const d = parsed.data;
  const existing = await prisma.client.findFirst({
    where: { id, organizationId: org.ctx.organizationId, deletedAt: null },
  });
  if (!existing) {
    return { success: false, error: "El cliente no existe o está archivado." };
  }
  try {
    await prisma.client.update({
      where: { id: existing.id },
      data: {
        legalName: d.legalName,
        displayName: d.displayName,
        taxId: d.taxId,
        address: d.address,
        phone: d.phone,
        email: d.email,
        website: d.website,
        contactName: d.contactName,
        notes: d.notes,
      },
    });
    revalidatePath(CLIENTES);
    revalidatePath(`${CLIENTES}/${id}`);
    revalidatePath(`${CLIENTES}/${id}/editar`);
    return { success: true, message: "Cambios guardados." };
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
}

export async function archiveClient(clientId: string): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const deniedAr = await enforcePermission(org.ctx, P.clients.archive);
  if (deniedAr) {
    return { success: false, error: deniedAr };
  }
  const existing = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: org.ctx.organizationId,
      deletedAt: null,
    },
  });
  if (!existing) {
    return { success: false, error: "El cliente no se encontró." };
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.client.update({
      where: { id: existing.id },
      data: { deletedAt: now },
    }),
    prisma.clientContact.updateMany({
      where: {
        clientId: existing.id,
        organizationId: org.ctx.organizationId,
        deletedAt: null,
      },
      data: { deletedAt: now },
    }),
  ]);
  revalidatePath(CLIENTES);
  revalidatePath(`${CLIENTES}/${clientId}`);
  return { success: true, message: "Cliente archivado." };
}

export async function createClientContact(
  clientId: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const deniedCc = await enforcePermission(org.ctx, P.clients.edit);
  if (deniedCc) {
    return { success: false, error: deniedCc };
  }
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: org.ctx.organizationId,
      deletedAt: null,
    },
  });
  if (!client) {
    return { success: false, error: "Cliente no encontrado o archivado." };
  }
  const raw = formDataToObject(formData);
  const parsed = clientContactFormSchema.safeParse({
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    roleLabel: raw.roleLabel,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const e of parsed.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revisá el contacto", fieldErrors: fe };
  }
  const d = parsed.data;
  try {
    await prisma.clientContact.create({
      data: {
        organizationId: org.ctx.organizationId,
        clientId: client.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        roleLabel: d.roleLabel,
      },
    });
    revalidatePath(`${CLIENTES}/${clientId}`);
    return { success: true, message: "Contacto agregado." };
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
}

export async function updateClientContact(
  clientId: string,
  contactId: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const deniedUc = await enforcePermission(org.ctx, P.clients.edit);
  if (deniedUc) {
    return { success: false, error: deniedUc };
  }
  const contact = await prisma.clientContact.findFirst({
    where: {
      id: contactId,
      clientId,
      organizationId: org.ctx.organizationId,
      deletedAt: null,
    },
  });
  if (!contact) {
    return { success: false, error: "Contacto no encontrado." };
  }
  const raw = formDataToObject(formData);
  const parsed = clientContactFormSchema.safeParse({
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    roleLabel: raw.roleLabel,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const e of parsed.error.issues) {
      const p = e.path[0];
      if (typeof p === "string") fe[p] = e.message;
    }
    return { success: false, error: "Revisá el contacto", fieldErrors: fe };
  }
  const d = parsed.data;
  try {
    await prisma.clientContact.update({
      where: { id: contact.id },
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        roleLabel: d.roleLabel,
      },
    });
    revalidatePath(`${CLIENTES}/${clientId}`);
    return { success: true, message: "Contacto actualizado." };
  } catch (e) {
    return { success: false, error: mapPrismaToMessage(e) };
  }
}

export async function archiveClientContact(
  clientId: string,
  contactId: string,
): Promise<ActionState> {
  const org = await requireOrganizationContext();
  if (!org.ok) {
    return { success: false, error: "Necesitás una organización asignada." };
  }
  const deniedAc = await enforcePermission(org.ctx, P.clients.edit);
  if (deniedAc) {
    return { success: false, error: deniedAc };
  }
  const contact = await prisma.clientContact.findFirst({
    where: {
      id: contactId,
      clientId,
      organizationId: org.ctx.organizationId,
      deletedAt: null,
    },
  });
  if (!contact) {
    return { success: false, error: "Contacto no encontrado." };
  }
  await prisma.clientContact.update({
    where: { id: contact.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath(`${CLIENTES}/${clientId}`);
  return { success: true, message: "Contacto archivado." };
}

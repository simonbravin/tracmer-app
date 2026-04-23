import { Prisma } from "@prisma/client";

export const TOLERANCE = new Prisma.Decimal("0.01");

export const MAX_ALLOCATION_LINES = 50;
export const MAX_FEE_LINES = 30;

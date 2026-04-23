import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Transferencias",
};

export default function TransferenciasPage() {
  return <PagePlaceholder title="Transferencias entre cuentas" />;
}

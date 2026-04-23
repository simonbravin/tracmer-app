"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Search } from "lucide-react";

import { appNavigation } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type NavCommandMenuProps = {
  /** `compact`: solo icono (estilo App Shell 4). `default`: botón ancho en desktop. */
  variant?: "default" | "compact";
};

export function NavCommandMenu({ variant = "default" }: NavCommandMenuProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable=true]")) {
        return;
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const dialog = (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar página…" />
      <CommandList>
        <CommandEmpty>Ningún resultado.</CommandEmpty>
        {appNavigation.map((section, i) => (
          <React.Fragment key={section.title}>
            {i > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={section.title}>
              {section.links.map((link) => (
                <CommandItem
                  key={link.href}
                  value={`${link.title} ${link.href}`}
                  onSelect={() => run(link.href)}
                >
                  {link.title}
                  <CommandShortcut className="font-mono text-[10px] opacity-60">
                    Ir
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );

  if (variant === "compact") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setOpen(true)}
          aria-label="Abrir paleta de navegación"
        >
          <Search className="h-4 w-4" aria-hidden />
        </Button>
        {dialog}
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir paleta de navegación"
      >
        <Search className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "hidden h-9 w-full max-w-md justify-start gap-2 text-muted-foreground sm:inline-flex",
        )}
        onClick={() => setOpen(true)}
        aria-label="Abrir paleta de navegación"
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">Buscar o ir a…</span>
        <CommandShortcut className="ml-auto hidden font-mono text-[10px] lg:inline">
          ⌘K
        </CommandShortcut>
      </Button>
      {dialog}
    </>
  );
}

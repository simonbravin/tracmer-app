import { Skeleton } from "@/components/ui/skeleton";

export default function CobranzasLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-32 w-full max-w-2xl" />
      <Skeleton className="h-12 w-full max-w-xl" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

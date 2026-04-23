import { Skeleton } from "@/components/ui/skeleton";

export default function DepositosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-40 w-full max-w-3xl" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

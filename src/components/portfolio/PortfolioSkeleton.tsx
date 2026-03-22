'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function PortfolioSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      {/* Total value skeleton */}
      <div className="card p-6 text-center space-y-3">
        <Skeleton className="h-4 w-20 mx-auto" />
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>

      {/* Chain chips skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Donut + breakdown skeleton */}
      <div className="card p-5">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Skeleton className="w-44 h-44 rounded-full" />
          <div className="flex-1 space-y-3 w-full">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Token list skeleton */}
      <div className="card p-5 space-y-1">
        <Skeleton className="h-5 w-20 mb-3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

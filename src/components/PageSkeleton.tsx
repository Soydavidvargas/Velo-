import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-[#0b3658] flex flex-col antialiased">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#dde7ee] px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Logo brand placeholder */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl skeleton-shimmer" />
            <div className="space-y-1.5">
              <div className="h-4 w-20 rounded-md skeleton-shimmer" />
              <div className="h-2.5 w-36 rounded-md skeleton-shimmer hidden sm:block" />
            </div>
          </div>

          {/* Nav links placeholder */}
          <div className="hidden md:flex items-center gap-6">
            <div className="h-3.5 w-24 rounded-md skeleton-shimmer" />
            <div className="h-3.5 w-24 rounded-md skeleton-shimmer" />
            <div className="h-3.5 w-28 rounded-md skeleton-shimmer" />
            <div className="h-3.5 w-24 rounded-md skeleton-shimmer" />
          </div>

          {/* Action buttons placeholder */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-24 rounded-full skeleton-shimmer" />
            <div className="h-8 w-24 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </header>

      {/* Main Skeleton Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-10">
        {/* Hero Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="h-6 w-52 rounded-full skeleton-shimmer" />
            <div className="h-10 w-4/5 rounded-2xl skeleton-shimmer" />
            <div className="h-10 w-3/5 rounded-2xl skeleton-shimmer" />
            <div className="space-y-2 pt-2">
              <div className="h-3.5 w-full rounded-md skeleton-shimmer" />
              <div className="h-3.5 w-5/6 rounded-md skeleton-shimmer" />
            </div>

            {/* Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="h-20 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] p-3 space-y-2">
                <div className="h-4 w-6 rounded-md skeleton-shimmer" />
                <div className="h-3 w-20 rounded-md skeleton-shimmer" />
                <div className="h-2.5 w-28 rounded-md skeleton-shimmer" />
              </div>
              <div className="h-20 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] p-3 space-y-2">
                <div className="h-4 w-6 rounded-md skeleton-shimmer" />
                <div className="h-3 w-20 rounded-md skeleton-shimmer" />
                <div className="h-2.5 w-28 rounded-md skeleton-shimmer" />
              </div>
              <div className="h-20 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] p-3 space-y-2">
                <div className="h-4 w-6 rounded-md skeleton-shimmer" />
                <div className="h-3 w-20 rounded-md skeleton-shimmer" />
                <div className="h-2.5 w-28 rounded-md skeleton-shimmer" />
              </div>
            </div>
          </div>

          {/* Form / Visual Card Skeleton */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl p-6 bg-white border border-[#dde7ee] shadow-sm space-y-4">
              <div className="h-10 w-full rounded-2xl skeleton-shimmer" />
              <div className="space-y-2 pt-2">
                <div className="h-3.5 w-32 rounded-md skeleton-shimmer" />
                <div className="h-9 w-full rounded-xl skeleton-shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-40 rounded-md skeleton-shimmer" />
                <div className="h-9 w-full rounded-xl skeleton-shimmer" />
              </div>
              <div className="h-11 w-full rounded-xl skeleton-shimmer mt-4" />
            </div>
          </div>
        </div>

        {/* Social Proof Strip Skeleton */}
        <div className="p-6 rounded-3xl bg-[#e6f1fa] border border-[#dde7ee]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="flex flex-col items-center space-y-2">
                <div className="h-6 w-20 rounded-md skeleton-shimmer" />
                <div className="h-3 w-24 rounded-md skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>

        {/* Services Grid Skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-6 w-48 rounded-lg skeleton-shimmer" />
            <div className="h-8 w-60 rounded-xl skeleton-shimmer hidden sm:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(idx => (
              <div key={idx} className="rounded-3xl p-5 bg-white border border-[#dde7ee] shadow-sm space-y-4">
                <div className="h-40 w-full rounded-2xl skeleton-shimmer" />
                <div className="h-4 w-3/4 rounded-md skeleton-shimmer" />
                <div className="h-3 w-full rounded-md skeleton-shimmer" />
                <div className="h-3 w-5/6 rounded-md skeleton-shimmer" />
                <div className="flex justify-between items-center pt-3 border-t border-[#dde7ee]">
                  <div className="h-5 w-20 rounded-md skeleton-shimmer" />
                  <div className="h-8 w-24 rounded-xl skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="border-t border-[#dde7ee] py-6 px-4 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-4 w-64 rounded-md skeleton-shimmer" />
          <div className="h-4 w-72 rounded-md skeleton-shimmer" />
        </div>
      </footer>
    </div>
  );
};

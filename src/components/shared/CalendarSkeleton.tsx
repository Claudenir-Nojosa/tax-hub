// components/shared/CalendarSkeleton.tsx
interface CalendarSkeletonProps {
  isMobile?: boolean;
}

export function CalendarSkeleton({ isMobile = false }: CalendarSkeletonProps) {
  return (
    <div className="grid grid-cols-7 gap-px dark:bg-gray-950 bg-gray-100">
      {Array.from({ length: isMobile ? 35 : 42 }).map((_, index) => (
        <div
          key={index}
          className={`p-1 md:p-2 border dark:border-emerald-900/40 ${
            index % 7 === 0 || index % 7 === 6
              ? "dark:bg-gray-900 bg-emerald-50/30"
              : "dark:bg-gray-950 bg-white"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="h-4 w-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
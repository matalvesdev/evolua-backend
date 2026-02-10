import { Card } from "@/components/ui/card"

export default function AgendamentosLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="h-6 sm:h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 sm:h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        </div>
        <div className="h-10 w-full sm:w-36 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* List skeleton */}
      <div className="space-y-3 sm:space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-center min-w-12 sm:min-w-15">
                  <div className="h-6 sm:h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
                  <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded mx-auto mt-1" />
                </div>
                <div>
                  <div className="h-4 sm:h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 sm:h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

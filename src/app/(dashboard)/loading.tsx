import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-9 w-56 bg-white/10" /><Skeleton className="mt-2 h-4 w-full max-w-md bg-white/10" /></div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-56 rounded-xl bg-white/10" />)}
      </div>
    </div>
  )
}

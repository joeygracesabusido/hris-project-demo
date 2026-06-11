import { useQuery } from '@tanstack/react-query'

export interface DashboardStats {
  totalEmployees: number
  presentToday: number
  onLeaveToday: number
  absentPerDepartment: { name: string; absent: number; total: number }[]
  personalStats?: {
    isPresent: boolean
    isOnLeave: boolean
    employeeName: string
    department: string
    subDepartment?: string
  }
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch dashboard stats')
  return res.json()
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })
}

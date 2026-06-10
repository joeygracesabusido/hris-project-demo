'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

export interface TimeLog {
  id: string
  employeeId: string
  date: string
  clockIn: string | null
  clockOut: string | null
  workHours: number
  shift: Shift | null
  employee: {
    fullName: string
    employeeId: string
  }
}

export interface PaginatedResponse {
  data: TimeLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface FetchTimeLogsParams {
  page?: number
  limit?: number
  search?: string
}

async function fetchTimeLogs(params: FetchTimeLogsParams = {}): Promise<PaginatedResponse> {
  const { page = 1, limit = 20, search = '' } = params
  const queryParams = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search) queryParams.set('search', search)

  const res = await fetch(`/api/time-logs?${queryParams}`, { credentials: 'include' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch time logs')
  return data
}

export function useTimeLogs(params: FetchTimeLogsParams = {}) {
  return useQuery({
    queryKey: ['time-logs', params],
    queryFn: () => fetchTimeLogs(params),
  })
}

export function useDeleteTimeLog() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/time-logs?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete time log')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-logs'] })
      toast({ title: 'Time log deleted' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

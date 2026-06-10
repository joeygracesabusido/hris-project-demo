import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import type { LeaveRequest } from '@/types'

async function fetchLeaves(): Promise<LeaveRequest[]> {
  const res = await fetch('/api/leaves', { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch leaves')
  return data
}

export function useLeaves() {
  return useQuery({
    queryKey: ['leaves'],
    queryFn: fetchLeaves,
  })
}

export function useCreateLeave() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create leave')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] })
      toast({ title: 'Leave filed' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useReviewLeave() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update leave')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] })
      toast({ title: 'Leave updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface ApprovalRuleData {
  id: string
  approverId: string
  requestType: string
  scope: string
  minDays: number
  maxDays: number
  level: number
  departmentId: string | null
  isActive: boolean
  approver?: { id: string; fullName: string; isActive: boolean }
  department?: { id: string; name: string }
}

async function fetchApprovalRules(params?: Record<string, string>): Promise<ApprovalRuleData[]> {
  const url = new URL('/api/approval-rules', window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch approval rules')
  return data
}

export function useApprovalRules(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['approval-rules', params],
    queryFn: () => fetchApprovalRules(params),
  })
}

export function useCreateApprovalRule() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Partial<ApprovalRuleData>) => {
      const res = await fetch('/api/approval-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create approval rule')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-rules'] })
      toast({ title: 'Approval rule created' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useUpdateApprovalRule() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<ApprovalRuleData>) => {
      const res = await fetch(`/api/approval-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update approval rule')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-rules'] })
      toast({ title: 'Approval rule updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeleteApprovalRule() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/approval-rules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete approval rule')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-rules'] })
      toast({ title: 'Approval rule deactivated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

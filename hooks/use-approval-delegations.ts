import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface DelegationData {
  id: string
  approverId: string
  delegatedToId: string
  requestType: string | null
  delegationStart: string
  delegationEnd: string
  isActive: boolean
  approver?: { id: string; fullName: string }
  delegatedTo?: { id: string; fullName: string }
}

async function fetchDelegations(): Promise<DelegationData[]> {
  const res = await fetch('/api/approval-delegations', { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch delegations')
  return data
}

export function useDelegations() {
  return useQuery({
    queryKey: ['approval-delegations'],
    queryFn: fetchDelegations,
  })
}

export function useCreateDelegation() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Partial<DelegationData>) => {
      const res = await fetch('/api/approval-delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create delegation')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-delegations'] })
      toast({ title: 'Delegation created' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useUpdateDelegation() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<DelegationData>) => {
      const res = await fetch(`/api/approval-delegations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update delegation')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-delegations'] })
      toast({ title: 'Delegation updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeleteDelegation() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/approval-delegations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete delegation')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-delegations'] })
      toast({ title: 'Delegation removed' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

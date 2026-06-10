import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { subDepartments: number }
}

async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch('/api/departments', { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch departments')
  return data
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: { name: string; code: string; description?: string }) => {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast({ title: 'Department created' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; code: string; description?: string }) => {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast({ title: 'Department updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to deactivate department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast({ title: 'Department deactivated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

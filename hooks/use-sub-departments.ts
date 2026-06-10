import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface SubDepartment {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  departmentId: string
  createdAt: string
  updatedAt: string
  department?: { name: string; code: string }
  _count?: { projects: number; employees: number }
}

async function fetchSubDepartments(departmentId?: string): Promise<SubDepartment[]> {
  const url = departmentId
    ? `/api/sub-departments?departmentId=${departmentId}`
    : '/api/sub-departments'
  const res = await fetch(url, { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch sub-departments')
  return data
}

export function useSubDepartments(departmentId?: string) {
  return useQuery({
    queryKey: ['sub-departments', departmentId],
    queryFn: () => fetchSubDepartments(departmentId),
  })
}

export function useCreateSubDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: { name: string; code: string; description?: string; departmentId: string }) => {
      const res = await fetch('/api/sub-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create sub-department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-departments'] })
      toast({ title: 'Sub-department created' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useUpdateSubDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; code: string; description?: string; departmentId: string }) => {
      const res = await fetch(`/api/sub-departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update sub-department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-departments'] })
      toast({ title: 'Sub-department updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeleteSubDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sub-departments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to deactivate sub-department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-departments'] })
      toast({ title: 'Sub-department deactivated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

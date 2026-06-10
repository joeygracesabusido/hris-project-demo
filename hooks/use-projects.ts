import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface Project {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  subDepartmentId: string
  createdAt: string
  updatedAt: string
  subDepartment?: { name: string; code: string }
  _count?: { employees: number }
}

async function fetchProjects(subDepartmentId?: string): Promise<Project[]> {
  const url = subDepartmentId
    ? `/api/projects?subDepartmentId=${subDepartmentId}`
    : '/api/projects'
  const res = await fetch(url, { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch projects')
  return data
}

export function useProjects(subDepartmentId?: string) {
  return useQuery({
    queryKey: ['projects', subDepartmentId],
    queryFn: () => fetchProjects(subDepartmentId),
    enabled: !!subDepartmentId || true,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: { name: string; code: string; description?: string; subDepartmentId: string }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create project')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Project created' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; code: string; description?: string; subDepartmentId: string }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update project')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Project updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to deactivate project')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Project deactivated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

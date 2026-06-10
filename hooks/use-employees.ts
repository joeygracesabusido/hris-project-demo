import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface Employee {
  id: string
  employeeNumber: number
  fullName: string
  email: string
  employeeId: string
  position: string
  subDepartmentId: string | null
  subDepartment?: { id: string; name: string; code: string }
  projectId: string | null
  project?: { id: string; name: string; code: string }
  payType: string
  basicSalary: number
  dailyRate: number
  payrollFrequency: string
  hireDate: string
  isActive: boolean
  employeeStatus: string
  regularizationDate?: string
  managerId?: string
  tin: string
  sssNo: string
  philhealthNo: string
  pagibigNo: string
  bankName: string
  bankAccountNo: string
}

export interface CreateEmployee {
  fullName: string
  email: string
  position: string
  subDepartmentId: string
  projectId?: string
  payType: string
  basicSalary: number
  dailyRate?: number
  payrollFrequency: string
  managerId?: string
  hireDate: string
  tin?: string
  sssNo?: string
  philhealthNo?: string
  pagibigNo?: string
  bankName?: string
  bankAccountNo?: string
  employeeStatus?: string
  regularizationDate?: string
}

export interface UpdateEmployee {
  id: string
  fullName?: string
  email?: string
  position?: string
  subDepartmentId?: string
  projectId?: string | null
  payType?: string
  basicSalary?: number
  dailyRate?: number
  payrollFrequency?: string
  managerId?: string | null
  hireDate?: string
  tin?: string
  sssNo?: string
  philhealthNo?: string
  pagibigNo?: string
  bankName?: string
  bankAccountNo?: string
  isActive?: boolean
  employeeStatus?: string
  regularizationDate?: string | null
  employeeId?: string
}

async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch('/api/employees', { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch employees')
  return data
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateEmployee) => {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create employee')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast({ title: 'Employee created' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: UpdateEmployee) => {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update employee')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast({ title: 'Employee updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete employee')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast({ title: 'Employee deleted' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useEnrollFace() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ employeeId, descriptor }: { employeeId: string; descriptor: number[] }) => {
      const res = await fetch(`/api/employees/${employeeId}/face`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ faceDescriptor: descriptor }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to enroll face')
      return json
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

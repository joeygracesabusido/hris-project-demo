import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface PayrollEmployee {
  id: string
  fullName: string
  employeeNumber: number
  employeeId: string
  department: string
  position: string
  basicSalary: number
  payrollFrequency: string
  payType?: string
  dailyRate?: number
  email?: string
  hireDate?: string
  isActive?: boolean
  employeeStatus?: string
  tin?: string
  sssNo?: string
  philhealthNo?: string
  pagibigNo?: string
  bankName?: string
  bankAccountNo?: string
}

export interface PayrollRecord {
  id: string
  employeeId: string
  employee: PayrollEmployee
  month: number
  year: number
  periodStart: string
  periodEnd: string
  basicSalary: number
  workDays: number
  daysWorked: number
  otHours: number
  otPay: number
  holidayPay: number
  grossPay: number
  sssEmployee: number
  philhealthEmployee: number
  pagibigEmployee: number
  withholdingTax: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
  status: string
  createdAt: string
  adjustmentAdd?: number
  adjustmentDeduct?: number
  adjustmentReason?: string
  lateMinutes?: number
  undertimeMinutes?: number
  lateDeduction?: number
  undertimeDeduction?: number
}

async function fetchPayroll(): Promise<PayrollRecord[]> {
  const res = await fetch('/api/payroll', { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch payroll')
  return data
}

export function usePayrollList() {
  return useQuery({
    queryKey: ['payroll'],
    queryFn: fetchPayroll,
  })
}

export function useComputePayroll() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to compute payroll')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] })
      toast({ title: 'Payroll computed' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeletePayroll() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payroll?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete payroll')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] })
      toast({ title: 'Payroll deleted' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

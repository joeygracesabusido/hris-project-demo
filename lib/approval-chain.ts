import prisma from '@/lib/prisma'
import type { ApprovalRequestType, ApprovalScope } from '@prisma/client'

export interface ResolvedApprover {
  employeeId: string
  fullName: string
  level: number
  scope: ApprovalScope
}

async function findHrEmployee(): Promise<string | null> {
  const hrUser = await prisma.user.findFirst({
    where: { role: 'HR' },
    include: { employees: true },
  })
  return hrUser?.employees?.[0]?.id ?? null
}

async function resolveApproverForScope(
  scope: ApprovalScope,
  employeeId: string,
  departmentId?: string
): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { subDepartment: { include: { department: true } } },
  })

  if (!employee) return null

  switch (scope) {
    case 'DIRECT_REPORTS':
      return employee.managerId ?? null

    case 'SUB_DEPARTMENT':
      if (employee.subDepartment?.department?.headId) {
        return employee.subDepartment.department.headId
      }
      return employee.managerId ?? null

    case 'DEPARTMENT': {
      const deptId = departmentId ?? employee.subDepartment?.department?.id
      if (deptId) {
        const dept = await prisma.department.findUnique({ where: { id: deptId } })
        return dept?.headId ?? null
      }
      return employee.managerId ?? null
    }

    case 'ALL':
      return findHrEmployee()

    default:
      return null
  }
}

async function checkDelegation(
  approverId: string,
  requestType: ApprovalRequestType | null,
  delegationStart: Date,
  delegationEnd: Date
): Promise<string | null> {
  const delegation = await prisma.approvalDelegation.findFirst({
    where: {
      approverId,
      isActive: true,
      requestType: requestType ?? undefined,
      delegationStart: { lte: delegationEnd },
      delegationEnd: { gte: delegationStart },
    },
  })

  return delegation?.delegatedToId ?? null
}

export async function resolveApprovalChain(
  requestType: ApprovalRequestType,
  employeeId: string,
  value: number,
  requestDate?: Date
): Promise<ResolvedApprover[]> {
  const rules = await prisma.approvalRule.findMany({
    where: {
      requestType,
      isActive: true,
      minDays: { lte: value },
      maxDays: { gte: value },
    },
    orderBy: [{ level: 'asc' }, { minDays: 'asc' }],
  })

  if (rules.length === 0) {
    const hrId = await findHrEmployee()
    if (hrId) {
      const hr = await prisma.employee.findUnique({
        where: { id: hrId },
        select: { fullName: true },
      })
      return [{ employeeId: hrId, fullName: hr?.fullName ?? 'HR', level: 1, scope: 'ALL' }]
    }
    return []
  }

  const chain: ResolvedApprover[] = []
  const seenApproverIds = new Set<string>()

  for (const rule of rules) {
    if (!rule.approverId) continue

    let approverId = rule.approverId

    // Check delegation
    if (requestDate) {
      const delegatedTo = await checkDelegation(approverId, requestType, requestDate, requestDate)
      if (delegatedTo) {
        approverId = delegatedTo
      }
    }

    // Skip if approver is the requestor
    if (approverId === employeeId) {
      console.warn(`Approver ${rule.approverId} is the requestor, escalating to next level`)
      continue
    }

    // Skip if approver is not active
    const approver = await prisma.employee.findUnique({
      where: { id: approverId },
      select: { fullName: true, isActive: true },
    })

    if (!approver?.isActive) {
      console.warn(`Approver ${approverId} is not active, skipping to next level`)
      continue
    }

    // Skip if already in chain
    if (seenApproverIds.has(approverId)) continue

    seenApproverIds.add(approverId)
    chain.push({
      employeeId: approverId,
      fullName: approver.fullName,
      level: rule.level,
      scope: rule.scope,
    })
  }

  return chain
}

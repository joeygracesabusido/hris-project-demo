import prisma from '@/lib/prisma'
import type { ApprovalRequestType, ApprovalScope } from '@prisma/client'

export interface ResolvedApprover {
  employeeId: string
  fullName: string
  level: number
  scope: ApprovalScope
}

async function findHrEmployee(): Promise<{ id: string; fullName: string } | null> {
  const hrUser = await prisma.user.findFirst({
    where: { role: 'HR' },
    include: { employees: true },
  })

  const hrEmployee = hrUser?.employees?.[0]
  if (!hrEmployee) return null

  return { id: hrEmployee.id, fullName: hrEmployee.fullName }
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
      OR: [
        { requestType: requestType },
        { requestType: null },
      ],
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
  try {
    if (value < 0) return []

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
      const hr = await findHrEmployee()
      if (hr) {
        return [{ employeeId: hr.id, fullName: hr.fullName, level: 1, scope: 'ALL' }]
      }
      return []
    }

    // Batch pre-fetch all rule approvers
    const approverIds = [...new Set(rules.map(r => r.approverId).filter((id): id is string => id !== null))]
    const employees = await prisma.employee.findMany({
      where: { id: { in: approverIds } },
      select: { id: true, fullName: true, isActive: true },
    })
    const employeeMap = new Map(employees.map(e => [e.id, { fullName: e.fullName, isActive: e.isActive }]))

    // First pass: resolve delegation for each rule, collect all resolved approverIds
    const resolvedApproverIds = new Set<string>()
    const ruleResolutions: Array<{ rule: (typeof rules)[number]; approverId: string }> = []

    for (const rule of rules) {
      if (!rule.approverId) continue

      let approverId = rule.approverId

      if (requestDate) {
        const delegatedTo = await checkDelegation(approverId, requestType, requestDate, requestDate)
        if (delegatedTo) {
          approverId = delegatedTo
        }
      }

      resolvedApproverIds.add(approverId)
      ruleResolutions.push({ rule, approverId })
    }

    // Batch fetch any delegated-to approvers not in the original batch
    const missingIds = [...resolvedApproverIds].filter(id => !employeeMap.has(id))
    if (missingIds.length > 0) {
      const missingEmployees = await prisma.employee.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, fullName: true, isActive: true },
      })
      for (const emp of missingEmployees) {
        employeeMap.set(emp.id, { fullName: emp.fullName, isActive: emp.isActive })
      }
    }

    // Second pass: build the chain from resolved data
    const chain: ResolvedApprover[] = []
    const seenApproverIds = new Set<string>()

    for (const { rule, approverId } of ruleResolutions) {
      if (approverId === employeeId) {
        console.warn(`Approver ${rule.approverId} is the requestor, escalating to next level`)
        continue
      }

      const approver = employeeMap.get(approverId)
      if (!approver?.isActive) {
        console.warn(`Approver ${approverId} is not active, skipping to next level`)
        continue
      }

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
  } catch (error) {
    console.error('Error resolving approval chain:', error)
    return []
  }
}

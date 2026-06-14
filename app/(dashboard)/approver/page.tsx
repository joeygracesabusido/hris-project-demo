'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getClientCookies } from '@/lib/client-cookies'
import { ADMIN_ROLES } from '@/lib/auth-shared'
import { useApprovalRules, type ApprovalRuleData } from '@/hooks/use-approval-rules'
import { useDelegations, type DelegationData } from '@/hooks/use-approval-delegations'
import { useDepartments } from '@/hooks/use-departments'
import { EditRuleModal } from '@/components/approver/edit-rule-modal'
import { DelegationModal } from '@/components/approver/delegation-modal'

const REQUEST_TYPES = ['LEAVE', 'OVERTIME', 'TRANSFER', 'EXPENSE'] as const
const MAX_LEVELS = 3

export default function ApproverPage() {
  const [userRole, setUserRole] = useState('')
  const [selectedRule, setSelectedRule] = useState<ApprovalRuleData | null>(null)
  const [showNewRuleModal, setShowNewRuleModal] = useState(false)
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [selectedDelegation, setSelectedDelegation] = useState<DelegationData | null>(null)
  const [showNewDelegationModal, setShowNewDelegationModal] = useState(false)

  useEffect(() => {
    const cookies = getClientCookies()
    if (!cookies.isLoggedIn) {
      window.location.href = '/login'
      return
    }
    setUserRole(cookies.userRole || '')
  }, [])

  const isAdminOrHR = (ADMIN_ROLES as readonly string[]).includes(userRole)

  const { data: rules, isLoading: loadingRules } = useApprovalRules()
  const { data: delegations } = useDelegations()
  const { data: departments, isLoading: loadingDepts } = useDepartments()

  if (loadingRules || loadingDepts) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Loading approver configuration...</p>
      </div>
    )
  }

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev)
      if (next.has(deptId)) next.delete(deptId)
      else next.add(deptId)
      return next
    })
  }

  const getRuleForCell = (deptId: string | null, requestType: string, level: number): ApprovalRuleData | undefined => {
    return rules?.find(
      (r) => r.departmentId === deptId && r.requestType === requestType && r.level === level
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Approvers
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure approval chains and delegations
        </p>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Approval Rules</TabsTrigger>
          <TabsTrigger value="delegations">Delegations</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Approval Rules Matrix</CardTitle>
              {isAdminOrHR && (
                <Button onClick={() => setShowNewRuleModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Rule
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Department</TableHead>
                    {REQUEST_TYPES.map((rt) => (
                      Array.from({ length: MAX_LEVELS }, (_, i) => i + 1).map((lvl) => (
                        <TableHead key={`${rt}-L${lvl}`} className="text-center text-xs">
                          {rt}<br />L{lvl}
                        </TableHead>
                      ))
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments?.map((dept) => {
                    const isExpanded = expandedDepts.has(dept.id)
                    return (
                      <TableRow key={dept.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => toggleDept(dept.id)}>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <span className="font-medium">{dept.name}</span>
                          </div>
                        </TableCell>
                        {REQUEST_TYPES.map((rt) =>
                          Array.from({ length: MAX_LEVELS }, (_, i) => i + 1).map((lvl) => {
                            const rule = getRuleForCell(dept.id, rt, lvl)
                            return (
                              <TableCell key={`${rt}-${lvl}`} className="text-center">
                                {rule ? (
                                  isAdminOrHR ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedRule(rule)}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      {rule.approver?.fullName ?? '\u2014'}
                                    </Button>
                                  ) : (
                                    <span className="text-xs">{rule.approver?.fullName ?? '\u2014'}</span>
                                  )
                                ) : isAdminOrHR ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowNewRuleModal(true)}
                                    className="text-muted-foreground hover:text-foreground"
                                    title="Add rule"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground">\u2014</span>
                                )}
                              </TableCell>
                            )
                          })
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Delegations</CardTitle>
              {isAdminOrHR && (
                <Button onClick={() => setShowNewDelegationModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Delegation
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {delegations && delegations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Approver</TableHead>
                      <TableHead>Delegated To</TableHead>
                      <TableHead>Request Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      {isAdminOrHR && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegations.map((d: DelegationData) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.approver?.fullName ?? '\u2014'}</TableCell>
                        <TableCell>{d.delegatedTo?.fullName ?? '\u2014'}</TableCell>
                        <TableCell>{d.requestType ?? 'All'}</TableCell>
                        <TableCell>{new Date(d.delegationStart).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(d.delegationEnd).toLocaleDateString()}</TableCell>
                        {isAdminOrHR && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDelegation(d)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No active delegations</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit existing rule modal */}
      {selectedRule && isAdminOrHR && (
        <EditRuleModal rule={selectedRule} onClose={() => setSelectedRule(null)} />
      )}

      {/* Create new rule modal */}
      {showNewRuleModal && isAdminOrHR && (
        <EditRuleModal onClose={() => setShowNewRuleModal(false)} />
      )}

      {/* Edit existing delegation modal */}
      {selectedDelegation && isAdminOrHR && (
        <DelegationModal delegation={selectedDelegation} onClose={() => setSelectedDelegation(null)} />
      )}

      {/* Create new delegation modal */}
      {showNewDelegationModal && isAdminOrHR && (
        <DelegationModal onClose={() => setShowNewDelegationModal(false)} />
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useCreateDelegation,
  useUpdateDelegation,
  useDeleteDelegation,
  type DelegationData,
} from '@/hooks/use-approval-delegations'
import { useEmployees } from '@/hooks/use-employees'

interface Props {
  delegation?: DelegationData | null
  onClose: () => void
}

const REQUEST_TYPES = ['LEAVE', 'OVERTIME', 'TRANSFER', 'EXPENSE']

export function DelegationModal({ delegation, onClose }: Props) {
  const isNew = !delegation

  const [formData, setFormData] = useState({
    approverId: delegation?.approverId ?? '',
    delegatedToId: delegation?.delegatedToId ?? '',
    requestType: delegation?.requestType ?? '',
    delegationStart: delegation?.delegationStart
      ? new Date(delegation.delegationStart).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    delegationEnd: delegation?.delegationEnd
      ? new Date(delegation.delegationEnd).toISOString().split('T')[0]
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: delegation?.isActive ?? true,
  })

  const { data: employees } = useEmployees()
  const createDelegation = useCreateDelegation()
  const updateDelegation = useUpdateDelegation()
  const deleteDelegation = useDeleteDelegation()

  // Auto-close on successful mutation
  useEffect(() => {
    if (createDelegation.isSuccess || updateDelegation.isSuccess || deleteDelegation.isSuccess) {
      onClose()
    }
  }, [createDelegation.isSuccess, updateDelegation.isSuccess, deleteDelegation.isSuccess, onClose])

  const handleSave = () => {
    const payload = {
      approverId: formData.approverId,
      delegatedToId: formData.delegatedToId,
      requestType: formData.requestType || null,
      delegationStart: formData.delegationStart,
      delegationEnd: formData.delegationEnd,
      isActive: formData.isActive,
    }

    if (isNew) {
      createDelegation.mutate(payload as any)
    } else {
      updateDelegation.mutate({ id: delegation.id, ...payload })
    }
  }

  const handleDelete = () => {
    if (delegation && confirm('Deactivate this delegation?')) {
      deleteDelegation.mutate(delegation.id)
    }
  }

  const isPending = createDelegation.isPending || updateDelegation.isPending || deleteDelegation.isPending
  const approvers = employees?.filter((e) => e.id !== formData.delegatedToId) ?? []
  const delegates = employees?.filter((e) => e.id !== formData.approverId) ?? []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{isNew ? 'Add Delegation' : 'Edit Delegation'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Approver (Original)</Label>
            <Select value={formData.approverId} onValueChange={(v) => setFormData({ ...formData, approverId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select approver" />
              </SelectTrigger>
              <SelectContent>
                {approvers?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Delegate To</Label>
            <Select value={formData.delegatedToId} onValueChange={(v) => setFormData({ ...formData, delegatedToId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select delegate" />
              </SelectTrigger>
              <SelectContent>
                {delegates?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Request Type (optional — select "All Types" for all)</Label>
            <Select
              value={formData.requestType || 'all'}
              onValueChange={(v) => setFormData({ ...formData, requestType: v === 'all' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All request types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.delegationStart}
                onChange={(e) => setFormData({ ...formData, delegationStart: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.delegationEnd}
                onChange={(e) => setFormData({ ...formData, delegationEnd: e.target.value })}
              />
            </div>
          </div>

          {!isNew && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          {!isNew && (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              Deactivate
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !formData.approverId || !formData.delegatedToId || !formData.delegationStart || !formData.delegationEnd}
          >
            {isPending ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

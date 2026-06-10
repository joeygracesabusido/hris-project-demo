'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useUpdateApprovalRule, useDeleteApprovalRule, type ApprovalRuleData } from '@/hooks/use-approval-rules'
import { useEmployees } from '@/hooks/use-employees'

interface Props {
  rule: ApprovalRuleData
  onClose: () => void
}

const REQUEST_TYPES = ['LEAVE', 'OVERTIME', 'TRANSFER', 'EXPENSE']
const SCOPES = ['DIRECT_REPORTS', 'SUB_DEPARTMENT', 'DEPARTMENT', 'ALL']

export function EditRuleModal({ rule, onClose }: Props) {
  const [formData, setFormData] = useState({
    approverId: rule.approverId,
    requestType: rule.requestType,
    scope: rule.scope,
    minDays: rule.minDays,
    maxDays: rule.maxDays,
    level: rule.level,
    isActive: rule.isActive,
  })

  const { data: employees } = useEmployees()
  const updateRule = useUpdateApprovalRule()
  const deleteRule = useDeleteApprovalRule()

  useEffect(() => {
    setFormData({
      approverId: rule.approverId,
      requestType: rule.requestType,
      scope: rule.scope,
      minDays: rule.minDays,
      maxDays: rule.maxDays,
      level: rule.level,
      isActive: rule.isActive,
    })
  }, [rule])

  const handleSave = () => {
    updateRule.mutate({ id: rule.id, ...formData })
  }

  const handleDelete = () => {
    if (confirm('Deactivate this approval rule?')) {
      deleteRule.mutate(rule.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Edit Approval Rule</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Approver</Label>
            <Select value={formData.approverId} onValueChange={(v) => setFormData({ ...formData, approverId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select approver" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Request Type</Label>
            <Select value={formData.requestType} onValueChange={(v) => setFormData({ ...formData, requestType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Scope</Label>
              <Select value={formData.scope} onValueChange={(v) => setFormData({ ...formData, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Level</Label>
              <Input
                type="number"
                min="1"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min Days</Label>
              <Input
                type="number"
                min="0"
                value={formData.minDays}
                onChange={(e) => setFormData({ ...formData, minDays: parseInt(e.target.value, 10) })}
              />
            </div>

            <div>
              <Label>Max Days</Label>
              <Input
                type="number"
                min="0"
                value={formData.maxDays}
                onChange={(e) => setFormData({ ...formData, maxDays: parseInt(e.target.value, 10) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
            />
            <Label>Active</Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="destructive" onClick={handleDelete}>Deactivate</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateRule.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

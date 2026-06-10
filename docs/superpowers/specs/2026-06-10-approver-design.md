# Approver Management — Design Spec

## Overview

Add a dedicated Approver management feature to the HRIS system. Replaces the current hardcoded `managerId`-based approval with a configurable, multi-level approval chain system compliant with Philippine DOLE requirements.

### Goals
- HR/Admin can configure who approves what per request type and department
- Multi-level sequential approval chains (Manager → Department Head → HR)
- Threshold-based routing (e.g., leave > 3 days needs extra approval)
- Approver delegation when primary is unavailable (on leave, offline)
- Audit trail for all approval actions

### Non-Goals
- Real-time notifications for pending approvals (future feature)
- Auto-escalation timeout (future feature)
- Mobile approval interface (future feature)

---

## Data Model

### Enums

```prisma
enum ApprovalRequestType { LEAVE, OVERTIME, TRANSFER, EXPENSE }
enum ApprovalScope { DIRECT_REPORTS, SUB_DEPARTMENT, DEPARTMENT, ALL }
```

### Department (Modified)

Add `headId` field to existing Department model to designate the department head for approval routing:

```prisma
model Department {
  // ... existing fields ...
  headId    String?   @db.ObjectId
  head      Employee? @relation("DepartmentHead", fields: [headId], references: [id])
}
```

### ApprovalRule

Core model defining who approves what, at which level, under what conditions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (ObjectId) | Unique identifier |
| `approverId` | String (ObjectId) → Employee | The employee who is the approver |
| `requestType` | ApprovalRequestType | LEAVE, OVERTIME, TRANSFER, EXPENSE |
| `scope` | ApprovalScope | DIRECT_REPORTS, SUB_DEPARTMENT, DEPARTMENT, ALL |
| `minDays` | Int (default 0) | Minimum threshold to trigger this rule |
| `maxDays` | Int (default 999) | Maximum threshold for this rule |
| `level` | Int (default 1) | Approval level in chain (1 = first, 2 = second) |
| `departmentId` | String? (ObjectId) → Department | Optional department scoping |
| `isActive` | Boolean (default true) | Whether this rule is active |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### ApprovalDelegation

Tracks time-based delegation when primary approver is unavailable.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (ObjectId) | Unique identifier |
| `approverId` | String (ObjectId) → Employee | Original approver who is delegating |
| `delegatedToId` | String (ObjectId) → Employee | Person receiving the delegation |
| `requestType` | ApprovalRequestType? | Specific type or null for all types |
| `delegationStart` | DateTime | When delegation starts |
| `delegationEnd` | DateTime | When delegation ends |
| `isActive` | Boolean (default true) | Whether delegation is active |
| `createdAt` | DateTime | Creation timestamp |

---

## Default Philippine Approval Rules (Seeded)

Applied on `npm run db:push` via seed script.

| Level | Request Type | Threshold | Scope | Approver Role |
|-------|-------------|-----------|-------|--------------|
| 1 | LEAVE | 0–2 days | DIRECT_REPORTS | Manager |
| 2 | LEAVE | 3–5 days | DEPARTMENT | Department Head |
| 3 | LEAVE | >5 days | ALL | HR |
| 1 | OVERTIME | 0–4 hours | DIRECT_REPORTS | Manager |
| 2 | OVERTIME | >4 hours | DEPARTMENT | HR |
| 1 | TRANSFER | any | DEPARTMENT | Department Head |
| 1 | EXPENSE | any | DEPARTMENT | Department Head |

---

## Approval Chain Resolution

When a request is created, the system resolves the approval chain via `resolveApprovalChain(requestType, employeeId, value)`:

1. **Find matching rules**: Query ApprovalRule for the request type where `minDays ≤ value ≤ maxDays` and rule is active
2. **Resolve approver per level**: For each rule level, find the approver based on scope:
   - DIRECT_REPORTS → use employee's managerId
   - SUB_DEPARTMENT → use sub-department head (employee's subDepartment)
   - DEPARTMENT → use Department.headId (department head set by HR in Department management)
   - ALL → use HR as approver
3. **Apply delegation**: Check ApprovalDelegation for active delegations during the request period; swap approver if delegated
4. **Handle edge cases**:
   - No approver configured → default to HR
   - Approver is the requestor → escalate to next level
   - Approver terminated (isActive=false) → skip to next level, log warning
5. **Return ordered chain**: `[approver1, approver2, ...]`

---

## UI Design

### Main View — Matrix Grid

- **Rows**: Departments (expandable to show sub-departments)
- **Columns**: Request types × levels (LEAVE L1, LEAVE L2, OVERTIME L1, OVERTIME L2)
- **Cells**: Show approver name; click to edit rule

### Edit Rule Modal

- Approver select dropdown (filtered by role: MANAGER/ADMIN/HR)
- Threshold range inputs (min/max days or hours)
- Scope selector (direct reports, sub-dept, department, all)
- Active/inactive toggle
- Save/Cancel buttons

### Delegations Tab

- Table of active delegations with start/end dates
- "New Delegation" button opens modal:
  - Select approver (who is delegating)
  - Select delegate (who receives authority)
  - Set date range
  - Optional: specific request type or all types

### Audit Tab

- Read-only table showing approval action history
- Columns: Timestamp, Request, Approver, Action (APPROVED/REJECTED), Notes

---

## Integration with Existing Flows

### Changes to Leave/Overtime API Routes

**Before**: `approverId` set to `managerId` directly
**After**: Call `resolveApprovalChain()` on request creation; store resolved chain

### Approval Actions

- Approving advances request to next level in chain
- Rejection terminates the chain (request is rejected)
- Final level approval completes the request
- If all approvers at a level are skipped (terminated/requestor), advance automatically

### Role-Based Access

- ADMIN/HR: Full access to manage rules and delegations
- MANAGER: View only for their department's rules
- EMPLOYEE: Cannot access Approver management

---

## Error Handling & Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| No approver configured for request type | Default to HR as final approver |
| Approver terminated (isActive=false) | Skip to next level; log warning |
| Approver is the requestor | Escalate to next level automatically |
| Overlapping delegations | Most specific scope wins, then earliest start date |
| Employee changes department mid-cycle | Pending requests keep original chain; new requests use new structure |
| Delegation period expired | Treat as no delegation; use primary approver |

---

## API Endpoints

### GET /api/approval-rules

Returns all approval rules with approver details. Supports filtering by requestType, departmentId, level, isActive.

### POST /api/approval-rules

Creates a new approval rule. Requires ADMIN or HR role.

### PATCH /api/approval-rules/:id

Updates an existing approval rule. Requires ADMIN or HR role.

### DELETE /api/approval-rules/:id

Soft-deletes (sets isActive=false) an approval rule. Requires ADMIN or HR role.

### GET /api/approval-delegations

Returns all delegations. Supports filtering by approverId, requestType, isActive.

### POST /api/approval-delegations

Creates a new delegation. Requires ADMIN or HR role.

### PATCH /api/approval-delegations/:id

Updates an existing delegation. Requires ADMIN or HR role.

---

## Files to Create/Modify

### New Files
- `app/api/approval-rules/route.ts` — Approval rules CRUD API
- `app/api/approval-delegations/route.ts` — Delegations CRUD API
- `hooks/use-approval-rules.ts` — React Query hook for rules
- `hooks/use-approval-delegations.ts` — React Query hook for delegations
- `lib/approval-chain.ts` — Chain resolution logic
- `app/(dashboard)/approver/page.tsx` — Main Approver page with matrix view
- `components/approver/edit-rule-modal.tsx` — Modal for editing rules

### Modified Files
- `prisma/schema.prisma` — Add ApprovalRule, ApprovalDelegation models + headId to Department
- `app/(dashboard)/layout.tsx` — Add Approver nav item under Master List
- `app/api/leaves/route.ts` — Use resolveApprovalChain instead of managerId
- `app/api/overtime/route.ts` — Same pattern
- `prisma/seed.ts` — Seed default Philippine approval rules

# Government Info Page Design

## Overview

A read-only table page under Master List that displays employee government information (SSS, PhilHealth, Pag-IBIG, TIN, bank details) with search and department filtering.

## Access Control

- **ADMIN/HR**: See all employees' government info
- **EMPLOYEE**: Sees only their own record (no filters shown)

## Data Model

All fields already exist in the Employee model — no schema changes needed:

| Field | Schema | Required? |
|-------|--------|-----------|
| `employeeId` | String, unique | Yes |
| `fullName` | String | Yes |
| `tin` | String | Yes |
| `sssNo` | String | Yes |
| `philhealthNo` | String | Yes |
| `pagibigNo` | String | Yes |
| `bankName` | String? | Optional |
| `bankAccountNo` | String? | Optional |

## API

- **GET /api/gov-info** — Returns employee government info with department/sub-department names included
  - Query param: `departmentId` (optional filter)
  - ADMIN/HR: returns all employees; EMPLOYEE: returns only their own record via `getEmployeeIdForUser()`

## UI

- **Title**: "Government Info" with ShieldCheck icon (blue theme, matching Master List)
- **Filters** (ADMIN/HR only): Search input (by name or employee ID) + Department dropdown
- **Table columns**: Employee ID | Full Name | SSS No. | PhilHealth No. | Pag-IBIG No. | TIN | Bank | Bank Acct No.
- **Responsive**: Card layout on mobile, table on desktop

## Files

| File | Action |
|------|--------|
| `app/api/gov-info/route.ts` | Create — GET endpoint with auth filtering |
| `hooks/use-gov-info.ts` | Create — React Query hook |
| `app/(dashboard)/gov-info/page.tsx` | Create — UI page |
| `app/(dashboard)/layout.tsx` | Modify — add nav item under Master List |

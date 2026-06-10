# Organization Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Department → Sub Department → Project hierarchy with CRUD pages and cascading selects in the employee form.

**Architecture:** Three new Prisma models with foreign key relations. Dedicated API routes per model following existing patterns. React Query hooks for data fetching. Client-side pages with modal dialogs matching existing UI patterns. Data migration script to convert existing `department` strings to proper relations.

**Tech Stack:** Prisma (MongoDB), Next.js 14 App Router, React Query, shadcn/ui, Tailwind CSS

---

### Task 1: Add Prisma Models — Department, SubDepartment, Project

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the three new models to schema.prisma**

Add after the Holiday model (around line 354), before TimeLog:

```prisma
model Department {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  name        String    @unique
  code        String    @unique
  description String?
  isActive    Boolean   @default(true)
  
  subDepartments SubDepartment[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("departments")
}

model SubDepartment {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  code        String    @unique
  description String?
  isActive    Boolean   @default(true)
  
  departmentId String   @db.ObjectId
  department   Department @relation(fields: [departmentId], references: [id])
  
  projects     Project[]
  employees    Employee[]
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@map("subdepartments")
}

model Project {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  code        String    @unique
  description String?
  isActive    Boolean   @default(true)
  
  subDepartmentId String @db.ObjectId
  subDepartment   SubDepartment @relation(fields: [subDepartmentId], references: [id])
  
  employees   Employee[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("projects")
}
```

- [ ] **Step 2: Modify the Employee model**

In the Employee model, remove the line:
```prisma
department    String
```

Replace it with:
```prisma
subDepartmentId    String?   @db.ObjectId
subDepartment      SubDepartment? @relation(fields: [subDepartmentId], references: [id])

projectId          String?   @db.ObjectId
project            Project? @relation(fields: [projectId], references: [id])
```

Also add indexes:
```prisma
  @@index([subDepartmentId])
  @@index([projectId])
```

Remove the old `@@index([department])` line.

- [ ] **Step 3: Push schema to database**

Run: `npm run db:push`
Expected: Schema pushed successfully without errors

- [ ] **Step 4: Regenerate Prisma Client**

Run: `npx prisma generate`
Expected: Prisma Client generated successfully

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Department, SubDepartment, Project models to schema"
```

---

### Task 2: Data Migration Script — Convert Existing Department Strings

**Files:**
- Create: `scripts/migrate-org-structure.ts`

- [ ] **Step 1: Create the migration script**

Write file `scripts/migrate-org-structure.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEPARTMENT_CODES: Record<string, string> = {
  'IT': 'IT',
  'HR': 'HR',
  'Finance': 'FIN',
  'Marketing': 'MKT',
  'Operations': 'OPS',
  'Sales': 'SAL',
  'Engineering': 'ENG',
  'Admin': 'ADM',
}

async function main() {
  console.log('Starting org structure migration...')

  const existingEmployees = await prisma.employee.findMany({
    where: { subDepartmentId: null },
    select: { id: true, department: true },
  })

  if (existingEmployees.length === 0) {
    console.log('No employees need migration. Exiting.')
    return
  }

  const uniqueDepartments = [...new Set(existingEmployees.map(e => e.department).filter(Boolean))]
  console.log(`Found ${uniqueDepartments.length} unique departments to migrate:`, uniqueDepartments)

  const departmentMap = new Map<string, string>()
  const subDepartmentMap = new Map<string, string>()

  for (const deptName of uniqueDepartments) {
    if (!deptName) continue

    const code = DEPARTMENT_CODES[deptName] || deptName.toUpperCase().slice(0, 3)

    const department = await prisma.department.upsert({
      where: { name: deptName },
      update: {},
      create: {
        name: deptName,
        code,
      },
    })
    departmentMap.set(deptName, department.id)
    console.log(`  Department: ${deptName} (${code}) → ${department.id}`)

    const subDepartment = await prisma.subDepartment.upsert({
      where: { code: `${code}-MAIN` },
      update: {},
      create: {
        name: deptName,
        code: `${code}-MAIN`,
        departmentId: department.id,
      },
    })
    subDepartmentMap.set(deptName, subDepartment.id)
    console.log(`  SubDept: ${deptName} (${code}-MAIN) → ${subDepartment.id}`)
  }

  for (const emp of existingEmployees) {
    if (!emp.department) continue
    const subDeptId = subDepartmentMap.get(emp.department)
    if (!subDeptId) continue

    await prisma.employee.update({
      where: { id: emp.id },
      data: { subDepartmentId: subDeptId },
    })
  }

  console.log(`Migrated ${existingEmployees.length} employees successfully.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Run the migration script**

Run: `npx ts-node --esm scripts/migrate-org-structure.ts`
Expected: Script runs and creates departments/sub-departments for existing employee data

- [ ] **Step 3: Verify migration**

Run: `npx prisma studio` — Check that departments, sub-departments exist and employees reference them

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-org-structure.ts
git commit -m "feat: add org structure data migration script"
```

---

### Task 3: Department API Route

**Files:**
- Create: `app/api/departments/route.ts`

- [ ] **Step 1: Create the API route**

Write file `app/api/departments/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { subDepartments: true } },
      },
    })
    return NextResponse.json(departments)
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: { name, code, description: description || '' },
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating department:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create department', details: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create the update/delete route**

Create file `app/api/departments/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description } = body

    const department = await prisma.department.update({
      where: { id: params.id },
      data: { name, code, description: description ?? null },
    })

    return NextResponse.json(department)
  } catch (error: unknown) {
    console.error('Error updating department:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update department', details: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const subDepts = await prisma.subDepartment.count({
      where: { departmentId: params.id, isActive: true },
    })

    if (subDepts > 0) {
      return NextResponse.json(
        { error: `Cannot deactivate: ${subDepts} active sub-department(s) depend on this` },
        { status: 409 }
      )
    }

    await prisma.department.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Department deactivated' })
  } catch (error: unknown) {
    console.error('Error deactivating department:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to deactivate department', details: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify the API works**

Run dev server: `npm run dev`
Test in browser or curl: `curl http://localhost:3000/api/departments`
Expected: JSON array of departments

- [ ] **Step 4: Commit**

```bash
git add app/api/departments/
git commit -m "feat: add department API routes (GET, POST, PUT, DELETE)"
```

---

### Task 4: Sub Department API Route

**Files:**
- Create: `app/api/sub-departments/route.ts`
- Create: `app/api/sub-departments/[id]/route.ts`

- [ ] **Step 1: Create the list/create route**

Write file `app/api/sub-departments/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')

    const where: Record<string, unknown> = { isActive: true }
    if (departmentId) {
      where.departmentId = departmentId
    }

    const subDepartments = await prisma.subDepartment.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        department: { select: { name: true, code: true } },
        _count: { select: { projects: true, employees: true } },
      },
    })

    return NextResponse.json(subDepartments)
  } catch (error) {
    console.error('Error fetching sub-departments:', error)
    return NextResponse.json({ error: 'Failed to fetch sub-departments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description, departmentId } = body

    if (!name || !code || !departmentId) {
      return NextResponse.json({ error: 'Name, code, and departmentId are required' }, { status: 400 })
    }

    const subDepartment = await prisma.subDepartment.create({
      data: { name, code, description: description || '', departmentId },
    })

    return NextResponse.json(subDepartment, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating sub-department:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create sub-department', details: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create the update/delete route**

Write file `app/api/sub-departments/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description, departmentId } = body

    const subDepartment = await prisma.subDepartment.update({
      where: { id: params.id },
      data: { name, code, description: description ?? null, departmentId },
    })

    return NextResponse.json(subDepartment)
  } catch (error: unknown) {
    console.error('Error updating sub-department:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update sub-department', details: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const projects = await prisma.project.count({
      where: { subDepartmentId: params.id, isActive: true },
    })

    const employees = await prisma.employee.count({
      where: { subDepartmentId: params.id },
    })

    if (projects > 0 || employees > 0) {
      const reasons: string[] = []
      if (projects > 0) reasons.push(`${projects} active project(s)`)
      if (employees > 0) reasons.push(`${employees} employee(s)`)
      return NextResponse.json(
        { error: `Cannot deactivate: depends on ${reasons.join(', ')}` },
        { status: 409 }
      )
    }

    await prisma.subDepartment.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Sub-department deactivated' })
  } catch (error: unknown) {
    console.error('Error deactivating sub-department:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to deactivate sub-department', details: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify the API**

Test: `curl http://localhost:3000/api/sub-departments`
Expected: JSON array of sub-departments with department info and counts

- [ ] **Step 4: Commit**

```bash
git add app/api/sub-departments/
git commit -m "feat: add sub-department API routes"
```

---

### Task 5: Project API Route

**Files:**
- Create: `app/api/projects/route.ts`
- Create: `app/api/projects/[id]/route.ts`

- [ ] **Step 1: Create the list/create route**

Write file `app/api/projects/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subDepartmentId = searchParams.get('subDepartmentId')

    const where: Record<string, unknown> = { isActive: true }
    if (subDepartmentId) {
      where.subDepartmentId = subDepartmentId
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        subDepartment: { select: { name: true, code: true } },
        _count: { select: { employees: true } },
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description, subDepartmentId } = body

    if (!name || !code || !subDepartmentId) {
      return NextResponse.json({ error: 'Name, code, and subDepartmentId are required' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: { name, code, description: description || '', subDepartmentId },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating project:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create project', details: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create the update/delete route**

Write file `app/api/projects/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description, subDepartmentId } = body

    const project = await prisma.project.update({
      where: { id: params.id },
      data: { name, code, description: description ?? null, subDepartmentId },
    })

    return NextResponse.json(project)
  } catch (error: unknown) {
    console.error('Error updating project:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update project', details: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequestSession(request)
    if (!hasAdminAccess(session.userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const employees = await prisma.employee.count({
      where: { projectId: params.id },
    })

    if (employees > 0) {
      return NextResponse.json(
        { error: `Cannot deactivate: ${employees} employee(s) assigned to this project` },
        { status: 409 }
      )
    }

    await prisma.project.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Project deactivated' })
  } catch (error: unknown) {
    console.error('Error deactivating project:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to deactivate project', details: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify the API**

Test: `curl http://localhost:3000/api/projects`
Expected: JSON array of projects with sub-department info and employee counts

- [ ] **Step 4: Commit**

```bash
git add app/api/projects/
git commit -m "feat: add project API routes"
```

---

### Task 6: React Query Hooks — Departments

**Files:**
- Create: `hooks/use-departments.ts`

- [ ] **Step 1: Create the hooks file**

Write file `hooks/use-departments.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { subDepartments: number }
}

async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch('/api/departments', { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch departments')
  return data
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: { name: string; code: string; description?: string }) => {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast({ title: 'Department created' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; code: string; description?: string }) => {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast({ title: 'Department updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to deactivate department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast({ title: 'Department deactivated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-departments.ts
git commit -m "feat: add department React Query hooks"
```

---

### Task 7: React Query Hooks — Sub Departments

**Files:**
- Create: `hooks/use-sub-departments.ts`

- [ ] **Step 1: Create the hooks file**

Write file `hooks/use-sub-departments.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export interface SubDepartment {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  departmentId: string
  createdAt: string
  updatedAt: string
  department?: { name: string; code: string }
  _count?: { projects: number; employees: number }
}

async function fetchSubDepartments(departmentId?: string): Promise<SubDepartment[]> {
  const url = departmentId
    ? `/api/sub-departments?departmentId=${departmentId}`
    : '/api/sub-departments'
  const res = await fetch(url, { credentials: 'include' })
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch sub-departments')
  return data
}

export function useSubDepartments(departmentId?: string) {
  return useQuery({
    queryKey: ['sub-departments', departmentId],
    queryFn: () => fetchSubDepartments(departmentId),
    enabled: !!departmentId || true,
  })
}

export function useCreateSubDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: { name: string; code: string; description?: string; departmentId: string }) => {
      const res = await fetch('/api/sub-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create sub-department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-departments'] })
      toast({ title: 'Sub-department created' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useUpdateSubDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; code: string; description?: string; departmentId: string }) => {
      const res = await fetch(`/api/sub-departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update sub-department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-departments'] })
      toast({ title: 'Sub-department updated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}

export function useDeleteSubDepartment() {
  const qc = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sub-departments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to deactivate sub-department')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-departments'] })
      toast({ title: 'Sub-department deactivated' })
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-sub-departments.ts
git commit -m "feat: add sub-department React Query hooks"
```

---

### Task 8: React Query Hooks — Projects

**Files:**
- Create: `hooks/use-projects.ts`

- [ ] **Step 1: Create the hooks file**

Write file `hooks/use-projects.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-projects.ts
git commit -m "feat: add project React Query hooks"
```

---

### Task 9: Departments Page

**Files:**
- Create: `app/(dashboard)/departments/page.tsx`

- [ ] **Step 1: Create the page**

Write file `app/(dashboard)/departments/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Plus, Search, Building2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
} from '@/hooks/use-departments'
import type { Department } from '@/hooks/use-departments'

const initialForm = { name: '', code: '', description: '' }

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments()
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()
  const deleteDepartment = useDeleteDepartment()
  const { toast } = useToast()

  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ ...initialForm })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDept) {
      await updateDepartment.mutateAsync({ id: selectedDept.id, ...formData })
    } else {
      await createDepartment.mutateAsync(formData)
    }
    setShowModal(false)
    setSelectedDept(null)
    setFormData({ ...initialForm })
  }

  const handleEdit = (dept: Department) => {
    setSelectedDept(dept)
    setFormData({ name: dept.name, code: dept.code, description: dept.description || '' })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!selectedDept) return
    try {
      await deleteDepartment.mutateAsync(selectedDept.id)
      setShowDeleteModal(false)
      setSelectedDept(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate'
      toast({ variant: 'destructive', title: 'Error', description: msg })
    }
  }

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500">Manage organizational departments</p>
        </div>
        <Button onClick={() => { setSelectedDept(null); setFormData({ ...initialForm }); setShowModal(true) }}>
          <Plus className="w-5 h-5" /> Add Department
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input type="text" placeholder="Search departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10" />
      </div>

      {isLoading ? (
        <Card className="shadow-sm"><CardContent className="p-12 text-center text-gray-500">Loading departments...</CardContent></Card>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Sub-Depts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepts.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell><Badge variant="secondary">{dept.code}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate text-gray-500">{dept.description || '—'}</TableCell>
                  <TableCell>{dept._count?.subDepartments ?? 0}</TableCell>
                  <TableCell><Badge variant={dept.isActive ? 'success' : 'secondary'}>{dept.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedDept(dept); setShowDeleteModal(true) }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDepts.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No departments found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label>Name *</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="IT, Finance, HR..." />
            </div>
            <div>
              <Label>Code *</Label>
              <Input name="code" value={formData.code} onChange={handleChange} required placeholder="IT, FIN, HR..." />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                placeholder="Optional description..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createDepartment.isPending || updateDepartment.isPending}>
                {selectedDept ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) setShowDeleteModal(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Department?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm pt-2">This will deactivate <strong>{selectedDept?.name}</strong>. Sub-departments and employees referencing it will still exist but the department will be hidden.</p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700" disabled={deleteDepartment.isPending}>
              {deleteDepartment.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to `http://localhost:3000/departments` in browser
Expected: Table showing migrated departments with sub-department counts

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/departments/page.tsx
git commit -m "feat: add departments CRUD page"
```

---

### Task 10: Sub Departments Page

**Files:**
- Create: `app/(dashboard)/sub-departments/page.tsx`

- [ ] **Step 1: Create the page**

Write file `app/(dashboard)/sub-departments/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  useSubDepartments, useCreateSubDepartment, useUpdateSubDepartment, useDeleteSubDepartment,
} from '@/hooks/use-sub-departments'
import { useDepartments } from '@/hooks/use-departments'
import type { SubDepartment } from '@/hooks/use-sub-departments'

const initialForm = { name: '', code: '', description: '', departmentId: '' }

export default function SubDepartmentsPage() {
  const { data: subDepts = [], isLoading: loadingSubDepts } = useSubDepartments()
  const { data: departments = [] } = useDepartments()
  const createSubDept = useCreateSubDepartment()
  const updateSubDept = useUpdateSubDepartment()
  const deleteSubDept = useDeleteSubDepartment()
  const { toast } = useToast()

  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSubDept, setSelectedSubDept] = useState<SubDepartment | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ ...initialForm })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSubDept) {
      await updateSubDept.mutateAsync({ id: selectedSubDept.id, ...formData })
    } else {
      await createSubDept.mutateAsync(formData)
    }
    setShowModal(false)
    setSelectedSubDept(null)
    setFormData({ ...initialForm })
  }

  const handleEdit = (subDept: SubDepartment) => {
    setSelectedSubDept(subDept)
    setFormData({ name: subDept.name, code: subDept.code, description: subDept.description || '', departmentId: subDept.departmentId })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!selectedSubDept) return
    try {
      await deleteSubDept.mutateAsync(selectedSubDept.id)
      setShowDeleteModal(false)
      setSelectedSubDept(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate'
      toast({ variant: 'destructive', title: 'Error', description: msg })
    }
  }

  const filteredSubDepts = subDepts.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sub Departments</h1>
          <p className="text-gray-500">Manage sub-departments under each department</p>
        </div>
        <Button onClick={() => { setSelectedSubDept(null); setFormData({ ...initialForm }); setShowModal(true) }}>
          <Plus className="w-5 h-5" /> Add Sub Department
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input type="text" placeholder="Search sub-departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10" />
      </div>

      {loadingSubDepts ? (
        <Card className="shadow-sm"><CardContent className="p-12 text-center text-gray-500">Loading sub-departments...</CardContent></Card>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubDepts.map((subDept) => (
                <TableRow key={subDept.id}>
                  <TableCell className="font-medium">{subDept.name}</TableCell>
                  <TableCell><Badge variant="secondary">{subDept.code}</Badge></TableCell>
                  <TableCell>{subDept.department?.name || '—'}</TableCell>
                  <TableCell>{subDept._count?.projects ?? 0}</TableCell>
                  <TableCell>{subDept._count?.employees ?? 0}</TableCell>
                  <TableCell><Badge variant={subDept.isActive ? 'success' : 'secondary'}>{subDept.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(subDept)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSubDept(subDept); setShowDeleteModal(true) }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubDepts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No sub-departments found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSubDept ? 'Edit Sub Department' : 'Add Sub Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label>Department *</Label>
              <Select value={formData.departmentId} onValueChange={(v) => setFormData(prev => ({ ...prev, departmentId: v }))} required>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name *</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="Backend, Frontend..." />
            </div>
            <div>
              <Label>Code *</Label>
              <Input name="code" value={formData.code} onChange={handleChange} required placeholder="IT-BE, IT-FE..." />
            </div>
            <div>
              <Label>Description</Label>
              <textarea name="description" value={formData.description} onChange={handleChange} className="w-full border rounded-md p-2 text-sm" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createSubDept.isPending || updateSubDept.isPending}>
                {selectedSubDept ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) setShowDeleteModal(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Deactivate Sub Department?</DialogTitle></DialogHeader>
          <p className="text-gray-500 text-sm pt-2">This will deactivate <strong>{selectedSubDept?.name}</strong>. Projects and employees referencing it will still exist.</p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700" disabled={deleteSubDept.isPending}>
              {deleteSubDept.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to `http://localhost:3000/sub-departments` in browser
Expected: Table showing sub-departments with department names and counts

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/sub-departments/page.tsx
git commit -m "feat: add sub-departments CRUD page"
```

---

### Task 11: Projects Page

**Files:**
- Create: `app/(dashboard)/projects/page.tsx`

- [ ] **Step 1: Create the page**

Write file `app/(dashboard)/projects/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  useProjects, useCreateProject, useUpdateProject, useDeleteProject,
} from '@/hooks/use-projects'
import { useSubDepartments } from '@/hooks/use-sub-departments'
import type { Project } from '@/hooks/use-projects'

const initialForm = { name: '', code: '', description: '', subDepartmentId: '' }

export default function ProjectsPage() {
  const { data: projects = [], isLoading: loadingProjects } = useProjects()
  const { data: subDepts = [] } = useSubDepartments()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const { toast } = useToast()

  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ ...initialForm })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedProject) {
      await updateProject.mutateAsync({ id: selectedProject.id, ...formData })
    } else {
      await createProject.mutateAsync(formData)
    }
    setShowModal(false)
    setSelectedProject(null)
    setFormData({ ...initialForm })
  }

  const handleEdit = (project: Project) => {
    setSelectedProject(project)
    setFormData({ name: project.name, code: project.code, description: project.description || '', subDepartmentId: project.subDepartmentId })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!selectedProject) return
    try {
      await deleteProject.mutateAsync(selectedProject.id)
      setShowDeleteModal(false)
      setSelectedProject(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate'
      toast({ variant: 'destructive', title: 'Error', description: msg })
    }
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.subDepartment?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Manage projects under sub-departments</p>
        </div>
        <Button onClick={() => { setSelectedProject(null); setFormData({ ...initialForm }); setShowModal(true) }}>
          <Plus className="w-5 h-5" /> Add Project
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10" />
      </div>

      {loadingProjects ? (
        <Card className="shadow-sm"><CardContent className="p-12 text-center text-gray-500">Loading projects...</CardContent></Card>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Sub Department</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell><Badge variant="secondary">{project.code}</Badge></TableCell>
                  <TableCell>{project.subDepartment?.name || '—'}</TableCell>
                  <TableCell>{project._count?.employees ?? 0}</TableCell>
                  <TableCell><Badge variant={project.isActive ? 'success' : 'secondary'}>{project.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(project)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(project); setShowDeleteModal(true) }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProjects.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No projects found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label>Sub Department *</Label>
              <Select value={formData.subDepartmentId} onValueChange={(v) => setFormData(prev => ({ ...prev, subDepartmentId: v }))} required>
                <SelectTrigger><SelectValue placeholder="Select sub department" /></SelectTrigger>
                <SelectContent>
                  {subDepts.map(s => <SelectItem key={s.id} value={s.id}>{s.department?.name} / {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name *</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="Project Alpha..." />
            </div>
            <div>
              <Label>Code *</Label>
              <Input name="code" value={formData.code} onChange={handleChange} required placeholder="PRJ-001..." />
            </div>
            <div>
              <Label>Description</Label>
              <textarea name="description" value={formData.description} onChange={handleChange} className="w-full border rounded-md p-2 text-sm" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createProject.isPending || updateProject.isPending}>
                {selectedProject ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) setShowDeleteModal(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Deactivate Project?</DialogTitle></DialogHeader>
          <p className="text-gray-500 text-sm pt-2">This will deactivate <strong>{selectedProject?.name}</strong>. Employees referencing it will still exist.</p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700" disabled={deleteProject.isPending}>
              {deleteProject.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to `http://localhost:3000/projects` in browser
Expected: Empty table (no projects yet) with "Add Project" button working

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/projects/page.tsx
git commit -m "feat: add projects CRUD page"
```

---

### Task 12: Update Navigation Sidebar

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add new nav items to the HRIS section**

In `app/(dashboard)/layout.tsx`, find the `navItems` array. In the HRIS subItems, add three new entries after the Employees item (around line 31):

```typescript
import { Building2, Folders } from 'lucide-react'
```

Add to the imports at the top of the file.

Then in the HRIS `subItems` array, add after the employees entry:

```typescript
{ href: '/departments', label: 'Departments', icon: Building2, iconColor: 'text-emerald-400', adminOnly: true },
{ href: '/sub-departments', label: 'Sub Departments', icon: Folders, iconColor: 'text-emerald-400', adminOnly: true },
{ href: '/projects', label: 'Projects', icon: Folders, iconColor: 'text-emerald-400', adminOnly: true },
```

- [ ] **Step 2: Update the isHrisActive check**

Find the `isHrisActive` variable (around line 113) and add the new paths:

```typescript
const isHrisActive = pathname.startsWith('/users') || pathname.startsWith('/employees') || pathname.startsWith('/departments') || pathname.startsWith('/sub-departments') || pathname.startsWith('/projects') || pathname.startsWith('/schedules') || pathname.startsWith('/leave-credits') || pathname.startsWith('/leaves') || pathname.startsWith('/overtime') || pathname.startsWith('/time-logs') || pathname.startsWith('/holidays');
```

- [ ] **Step 3: Verify navigation works**

Navigate to each new page URL and confirm the sidebar highlights correctly

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/layout.tsx
git commit -m "feat: add departments, sub-departments, projects to sidebar navigation"
```

---

### Task 13: Update Employee API — Replace department with Relations

**Files:**
- Modify: `app/api/employees/route.ts`

- [ ] **Step 1: Update the POST handler**

In `app/api/employees/route.ts`, modify the POST handler to accept `subDepartmentId` and `projectId` instead of `department`:

Replace the destructuring in the POST handler (around line 72):

```typescript
    const {
      fullName, email, position, subDepartmentId, projectId, basicSalary, dailyRate, payType,
      payrollFrequency, managerId, hireDate, tin, sssNo, philhealthNo, pagibigNo, bankName, bankAccountNo,
      employeeStatus, regularizationDate,
    } = body;
```

Replace the employee create data (around line 86):

```typescript
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: nextNumber,
        fullName, email,
        employeeId,
        position,
        subDepartmentId: subDepartmentId || null,
        projectId: projectId || null,
        payType: payType || 'MONTHLY',
        basicSalary: parseFloat(basicSalary || '0'),
        dailyRate: payType === 'DAILY' ? (parseFloat(dailyRate) || calculateDailyRate(parseFloat(basicSalary))) : parseFloat(dailyRate || '0'),
        payrollFrequency,
        managerId: managerId || null,
        hireDate: new Date(hireDate),
        tin: tin || '', sssNo: sssNo || '', philhealthNo: philhealthNo || '', pagibigNo: pagibigNo || '',
        bankName: bankName || '', bankAccountNo: bankAccountNo || '',
        isActive: true,
        employeeStatus: employeeStatus || 'PROBATIONARY',
        regularizationDate: regularizationDate ? new Date(regularizationDate) : null,
      },
    });
```

- [ ] **Step 2: Update the PUT handler**

In the PUT handler, update the `allowedFields` array (around line 136):

```typescript
    const allowedFields = [
      'employeeId', 'fullName', 'email', 'position', 'subDepartmentId', 'projectId', 'basicSalary', 'dailyRate', 'payType',
      'payrollFrequency', 'managerId', 'hireDate', 'tin', 'sssNo', 'philhealthNo',
      'pagibigNo', 'bankName', 'bankAccountNo', 'isActive', 'employeeStatus', 'regularizationDate'
    ];
```

- [ ] **Step 3: Update the GET handler to include relations**

In the GET handler, update the `findMany` call to include department info:

```typescript
    const employees = await prisma.employee.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        subDepartment: {
          include: {
            department: { select: { name: true } },
          },
        },
        project: { select: { name: true, code: true } },
      },
    });
```

- [ ] **Step 4: Verify the API**

Test creating an employee with `subDepartmentId` and `projectId` via curl or browser dev tools

- [ ] **Step 5: Commit**

```bash
git add app/api/employees/route.ts
git commit -m "feat: update employee API to use subDepartmentId and projectId relations"
```

---

### Task 14: Update Employee Hook Types

**Files:**
- Modify: `hooks/use-employees.ts`

- [ ] **Step 1: Update the Employee interface**

In `hooks/use-employees.ts`, update the `Employee` interface to include the new fields:

```typescript
export interface Employee {
  id: string
  employeeNumber: number
  fullName: string
  email: string
  employeeId: string
  position: string
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
  subDepartmentId?: string
  projectId?: string
  subDepartment?: {
    id: string
    name: string
    department?: { name: string }
  }
  project?: {
    id: string
    name: string
    code: string
  }
}
```

Remove the `department: string` field from the interface.

- [ ] **Step 2: Commit**

```bash
git add hooks/use-employees.ts
git commit -m "feat: update Employee hook types for org structure"
```

---

### Task 15: Update Employee Page — Cascading Selects

**Files:**
- Modify: `app/(dashboard)/employees/page.tsx`

- [ ] **Step 1: Remove hardcoded departments array and add new hooks**

Remove the `departments` constant (around line 37):
```typescript
const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Engineering', 'Admin'];
```

Add imports at the top of the file:
```typescript
import { useDepartments } from '@/hooks/use-departments'
import { useSubDepartments } from '@/hooks/use-sub-departments'
import { useProjects } from '@/hooks/use-projects'
```

- [ ] **Step 2: Update the initialForm**

Replace the `department` field with `subDepartmentId` and `projectId`:

```typescript
const initialForm = {
  employeeId: '', fullName: '', email: '', position: '', subDepartmentId: '', projectId: '',
  payType: 'MONTHLY', basicSalary: '', dailyRate: '',
  payrollFrequency: 'MONTHLY', managerId: '', hireDate: '',
  tin: '', sssNo: '', philhealthNo: '', pagibigNo: '',
  bankName: '', bankAccountNo: '',
  employeeStatus: 'PROBATIONARY', regularizationDate: '',
};
```

- [ ] **Step 3: Add hook calls in the component**

Inside `EmployeesPage`, after the existing hooks, add:

```typescript
  const { data: departments = [] } = useDepartments()
  const { data: subDepts = [] } = useSubDepartments(formData.subDepartmentId ? undefined : undefined)
  const { data: projects = [] } = useProjects(formData.projectId ? undefined : undefined)
```

Actually, we need to conditionally fetch based on selections. Replace with:

```typescript
  const { data: departments = [] } = useDepartments()
  const selectedDeptId = subDepts.length > 0 && formData.subDepartmentId
    ? subDepts.find(s => s.id === formData.subDepartmentId)?.departmentId
    : undefined
  const { data: subDepts = [] } = useSubDepartments(selectedDeptId)
  const { data: projects = [] } = useProjects(formData.subDepartmentId || undefined)
```

Wait, this is getting complex. Let me simplify — we need to track which department is selected to filter sub-departments, and which sub-dept to filter projects. Let me add state for this.

Actually, the simplest approach: fetch all sub-departments and all projects, then filter on the client side based on the selected department/sub-department. This matches the existing pattern in the codebase.

Add after `useEmployees`:

```typescript
  const { data: departments = [] } = useDepartments()
  const { data: allSubDepts = [] } = useSubDepartments()
  const { data: allProjects = [] } = useProjects()
```

- [ ] **Step 4: Update the Department select in the form**

Find the Department select (around line 389) and replace it with three cascading selects:

Replace this block:
```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-bold uppercase text-slate-400">Department *</Label>
  <Select
    value={formData.department}
    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
    disabled={userRole === 'EMPLOYEE'}
  >
    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
      <SelectValue placeholder="Select Department" />
    </SelectTrigger>
    <SelectContent>
      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
```

With:
```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-bold uppercase text-slate-400">Department *</Label>
  <Select
    value={formData.subDepartmentId ? (allSubDepts.find(s => s.id === formData.subDepartmentId)?.departmentId || '') : ''}
    onValueChange={(value) => setFormData(prev => ({ ...prev, subDepartmentId: '', projectId: '' }))}
    disabled={userRole === 'EMPLOYEE'}
  >
    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
      <SelectValue placeholder="Select Department" />
    </SelectTrigger>
    <SelectContent>
      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
<div className="space-y-1.5">
  <Label className="text-xs font-bold uppercase text-slate-400">Sub Department *</Label>
  <Select
    value={formData.subDepartmentId}
    onValueChange={(value) => setFormData(prev => ({ ...prev, subDepartmentId: value, projectId: '' }))}
    disabled={userRole === 'EMPLOYEE'}
  >
    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
      <SelectValue placeholder="Select Sub Department" />
    </SelectTrigger>
    <SelectContent>
      {allSubDepts
        .filter(s => s.departmentId === (formData.subDepartmentId ? allSubDepts.find(x => x.id === formData.subDepartmentId)?.departmentId : ''))
        .map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
<div className="space-y-1.5">
  <Label className="text-xs font-bold uppercase text-slate-400">Project *</Label>
  <Select
    value={formData.projectId}
    onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
    disabled={userRole === 'EMPLOYEE'}
  >
    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
      <SelectValue placeholder="Select Project" />
    </SelectTrigger>
    <SelectContent>
      {allProjects
        .filter(p => p.subDepartmentId === formData.subDepartmentId)
        .map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
```

Hmm, this cascading logic is getting complex. Let me use a cleaner approach with useEffect to track the selected department.

Let me revise — add state for the selected department ID:

Add in the component state section (after existing useState calls):
```typescript
  const [selectedDeptId, setSelectedDeptId] = useState('')
```

Then the cascading selects become:

```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-bold uppercase text-slate-400">Department *</Label>
  <Select
    value={selectedDeptId || (formData.subDepartmentId ? allSubDepts.find(s => s.id === formData.subDepartmentId)?.departmentId || '' : '')}
    onValueChange={(value) => { setSelectedDeptId(value); setFormData(prev => ({ ...prev, subDepartmentId: '', projectId: '' })) }}
    disabled={userRole === 'EMPLOYEE'}
  >
    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
      <SelectValue placeholder="Select Department" />
    </SelectTrigger>
    <SelectContent>
      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
<div className="space-y-1.5">
  <Label className="text-xs font-bold uppercase text-slate-400">Sub Department *</Label>
  <Select
    value={formData.subDepartmentId}
    onValueChange={(value) => { setFormData(prev => ({ ...prev, subDepartmentId: value, projectId: '' })) }}
    disabled={userRole === 'EMPLOYEE' || !selectedDeptId}
  >
    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
      <SelectValue placeholder="Select Sub Department" />
    </SelectTrigger>
    <SelectContent>
      {allSubDepts.filter(s => s.departmentId === selectedDeptId)
        .map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
<div className="space-y-1.5">
  <Label className="text-xs font-bold uppercase text-slate-400">Project *</Label>
  <Select
    value={formData.projectId}
    onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
    disabled={userRole === 'EMPLOYEE' || !formData.subDepartmentId}
  >
    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
      <SelectValue placeholder="Select Project" />
    </SelectTrigger>
    <SelectContent>
      {allProjects.filter(p => p.subDepartmentId === formData.subDepartmentId)
        .map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 5: Update the handleEdit function**

In `handleEdit`, replace the department reference with subDepartmentId and projectId. Around line 120, change:

```typescript
      department: employee.department,
```

To:

```typescript
      subDepartmentId: employee.subDepartmentId || '',
      projectId: employee.projectId || '',
```

And add setting the selectedDeptId when editing:

```typescript
    if (employee.subDepartmentId) {
      const subDept = allSubDepts.find(s => s.id === employee.subDepartmentId)
      if (subDept) setSelectedDeptId(subDept.departmentId)
    }
```

Wait, `allSubDepts` might not be loaded yet when handleEdit is called. Better to set it in a useEffect or just let the user re-select. For now, keep it simple — don't auto-set selectedDeptId in handleEdit. The cascading selects will still work because we show all sub-departments for editing.

Actually, for a better UX during edit, let me add the useEffect:

Add after the existing useEffect for cookies:
```typescript
  useEffect(() => {
    if (selectedEmployee && allSubDepts.length > 0) {
      const subDept = allSubDepts.find(s => s.id === selectedEmployee.subDepartmentId)
      if (subDept) setSelectedDeptId(subDept.departmentId)
    }
  }, [selectedEmployee, allSubDepts])
```

- [ ] **Step 6: Update the handleSubmit payload**

In `handleSubmit`, the form data now includes `subDepartmentId` and `projectId` instead of `department`. The existing payload spreading should handle this automatically since we spread `formData`.

- [ ] **Step 7: Update the employee table display**

In the table, replace the department column to show the full hierarchy. Around line 318, change:

```tsx
<TableCell className="text-sm font-medium text-gray-600">{employee.department}</TableCell>
```

To:

```tsx
<TableCell className="text-sm">
  <div className="flex flex-col">
    <span className="font-medium text-gray-700">{employee.subDepartment?.department?.name || '—'}</span>
    <span className="text-xs text-gray-400">{employee.subDepartment?.name || ''}{employee.project ? ` → ${employee.project.name}` : ''}</span>
  </div>
</TableCell>
```

And in the mobile card view (around line 230), change:

```tsx
<p className="font-medium text-gray-700">{employee.department}</p>
```

To:

```tsx
<p className="font-medium text-gray-700">{employee.subDepartment?.department?.name || '—'}</p>
<p className="text-xs text-gray-400">{employee.subDepartment?.name || ''}{employee.project ? ` → ${employee.project.name}` : ''}</p>
```

- [ ] **Step 8: Update the resetForm to include new fields**

The `resetForm` function uses `initialForm` which already has the new fields.

- [ ] **Step 9: Verify the employee page works end-to-end**

1. Create a test project in /projects
2. Create a new employee and select Department → Sub Dept → Project
3. Edit an existing employee and verify cascading selects work
4. Verify the table shows department hierarchy

- [ ] **Step 10: Commit**

```bash
git add app/\(dashboard\)/employees/page.tsx
git commit -m "feat: update employee form with cascading org structure selects"
```

---

### Task 16: Update Seed Script for New Schema

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add department/sub-department/project seeding before employees**

In `prisma/seed.ts`, after the user creation and before the employee creation (around line 115), add:

```typescript
  console.log('Created users')

  const departments = await Promise.all([
    prisma.department.upsert({ where: { name: 'IT' }, update: {}, create: { name: 'IT', code: 'IT' } }),
    prisma.department.upsert({ where: { name: 'HR' }, update: {}, create: { name: 'HR', code: 'HR' } }),
    prisma.department.upsert({ where: { name: 'Finance' }, update: {}, create: { name: 'Finance', code: 'FIN' } }),
    prisma.department.upsert({ where: { name: 'Marketing' }, update: {}, create: { name: 'Marketing', code: 'MKT' } }),
    prisma.department.upsert({ where: { name: 'Sales' }, update: {}, create: { name: 'Sales', code: 'SAL' } }),
  ])

  const subDepts = await Promise.all([
    prisma.subDepartment.upsert({ where: { code: 'IT-MAIN' }, update: {}, create: { name: 'IT', code: 'IT-MAIN', departmentId: departments[0].id } }),
    prisma.subDepartment.upsert({ where: { code: 'HR-MAIN' }, update: {}, create: { name: 'HR', code: 'HR-MAIN', departmentId: departments[1].id } }),
    prisma.subDepartment.upsert({ where: { code: 'FIN-MAIN' }, update: {}, create: { name: 'Finance', code: 'FIN-MAIN', departmentId: departments[2].id } }),
    prisma.subDepartment.upsert({ where: { code: 'MKT-MAIN' }, update: {}, create: { name: 'Marketing', code: 'MKT-MAIN', departmentId: departments[3].id } }),
    prisma.subDepartment.upsert({ where: { code: 'SAL-MAIN' }, update: {}, create: { name: 'Sales', code: 'SAL-MAIN', departmentId: departments[4].id } }),
  ])

  const projects = await Promise.all([
    prisma.project.upsert({ where: { code: 'PRJ-001' }, update: {}, create: { name: 'HRIS Platform', code: 'PRJ-001', subDepartmentId: subDepts[0].id } }),
    prisma.project.upsert({ where: { code: 'PRJ-002' }, update: {}, create: { name: 'Payroll System', code: 'PRJ-002', subDepartmentId: subDepts[0].id } }),
    prisma.project.upsert({ where: { code: 'PRJ-003' }, update: {}, create: { name: 'Talent Acquisition', code: 'PRJ-003', subDepartmentId: subDepts[1].id } }),
    prisma.project.upsert({ where: { code: 'PRJ-004' }, update: {}, create: { name: 'Budget Planning', code: 'PRJ-004', subDepartmentId: subDepts[2].id } }),
  ])

  console.log('Created org structure')
```

- [ ] **Step 2: Update employee creation to use subDepartmentId/projectId**

In the employees array, replace `department: 'IT'` etc. with `subDepartmentId` and `projectId`. For example:

```typescript
    {
      userId: manager1.id,
      employeeNumber: 1001,
      employeeId: 'EMP001',
      fullName: 'John Smith',
      email: 'manager1@hris.ph',
      position: 'IT Manager',
      subDepartmentId: subDepts[0].id,
      projectId: projects[0].id,
      basicSalary: 60000,
      payrollFrequency: 'MONTHLY',
      hireDate: new Date('2024-01-15'),
      isActive: true,
      tin: '123456789012',
      sssNo: '1234567890',
      philhealthNo: '123456789012',
      pagibigNo: '123456789012',
      bankName: 'BPI',
      bankAccountNo: '1234567890',
    },
```

Do this for all 7 employees, mapping:
- IT employees (John Smith, Juan dela Cruz) → subDepts[0], projects[0] or [1]
- HR employees (Sarah Johnson, Ana Reyes) → subDepts[1], projects[2]
- Finance employee (Pedro Garcia) → subDepts[2], projects[3]
- Marketing employee (Maria Santos) → subDepts[3], no project
- Sales employee (Michael Lee) → subDepts[4], no project

- [ ] **Step 3: Verify seed works**

Run: `npm run db:seed`
Expected: Seed completes without errors, org structure is created

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: update seed script with org structure data"
```

---

### Task 17: Full Build and Lint Verification

**Files:** None (verification task)

- [ ] **Step 1: Run linting**

Run: `npm run lint`
Expected: No lint errors. Fix any issues if found.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build completes without errors. Fix any TypeScript errors if found.

- [ ] **Step 3: Test the full flow in dev mode**

1. Run `npm run dev`
2. Login as admin
3. Navigate to Departments — verify CRUD works
4. Navigate to Sub Departments — verify CRUD works with department selector
5. Navigate to Projects — verify CRUD works with sub-department selector
6. Navigate to Employees — create a new employee, select Department → Sub Dept → Project
7. Verify the employee table shows the hierarchy correctly
8. Edit an existing employee and verify cascading selects work

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from org structure feature"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Database Schema — Task 1 (3 new models + Employee changes)
- [x] API Endpoints — Tasks 3, 4, 5 (CRUD for each model)
- [x] UI Pages — Tasks 9, 10, 11 (Departments, Sub Departments, Projects pages)
- [x] Navigation — Task 12 (sidebar updates)
- [x] Employee form cascading selects — Task 15
- [x] Data Migration — Task 2
- [x] Seed script update — Task 16
- [x] Error handling (soft delete with dependency checks) — Tasks 3, 4, 5

**Placeholder scan:** No TBDs or TODOs found. All code is complete with exact file paths and content.

**Type consistency:** 
- `Department`, `SubDepartment`, `Project` interfaces match Prisma models
- Hook function signatures are consistent across all three model hooks
- Employee interface updated to remove `department: string` and add relation types

**No gaps detected.**

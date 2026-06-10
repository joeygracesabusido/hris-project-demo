# Organization Structure — Departments, Sub Departments, Projects

## Overview

Add a proper organizational hierarchy (Department → Sub Department → Project) to the HRIS app. Currently, `department` is a hardcoded string field on the Employee model. This replaces it with 3 new related models and dedicated CRUD pages for managing org structure.

## Decisions

- **Hierarchy**: 3-level — Department → Sub Department → Project
- **Approach**: Separate Prisma models with proper foreign key relations (Approach A)
- **Management**: Dedicated CRUD pages for each model (best practice for data governance)
- **Employee-Project**: One project per employee at a time
- **Access Control**: ADMIN + HR can manage; all logged-in users can view

---

## Database Schema

### New Models

```prisma
model Department {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  name        String    @unique     // "IT", "Finance", "HR"
  code        String    @unique     // "IT", "FIN", "HR" — short identifier
  description String?
  isActive    Boolean   @default(true)
  
  subDepartments SubDepartment[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("departments")
}

model SubDepartment {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  name        String                    // "Backend", "Frontend", "QA"
  code        String    @unique         // "IT-BE", "IT-FE"
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
  name        String                    // "Project Alpha", "Cloud Migration"
  code        String    @unique         // "PRJ-001"
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

### Employee Model Changes

**Remove**:
```prisma
department    String
```

**Add**:
```prisma
subDepartmentId    String?   @db.ObjectId
subDepartment      SubDepartment? @relation(fields: [subDepartmentId], references: [id])

projectId          String?   @db.ObjectId
project            Project? @relation(fields: [projectId], references: [id])
```

---

## API Endpoints

### Departments

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| GET | `/api/departments` | List all active departments | All |
| POST | `/api/departments` | Create department | ADMIN, HR |
| PUT | `/api/departments/:id` | Update department | ADMIN, HR |
| DELETE | `/api/departments/:id` | Deactivate department (soft delete) | ADMIN, HR |

### Sub Departments

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| GET | `/api/sub-departments` | List all active sub-depts (filter by `departmentId`) | All |
| POST | `/api/sub-departments` | Create sub-department | ADMIN, HR |
| PUT | `/api/sub-departments/:id` | Update sub-department | ADMIN, HR |
| DELETE | `/api/sub-departments/:id` | Deactivate sub-department | ADMIN, HR |

### Projects

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| GET | `/api/projects` | List all active projects (filter by `subDepartmentId`) | All |
| POST | `/api/projects` | Create project | ADMIN, HR |
| PUT | `/api/projects/:id` | Update project | ADMIN, HR |
| DELETE | `/api/projects/:id` | Deactivate project | ADMIN, HR |

### Modified Employee Endpoints

- `POST /api/employees` — Accepts `subDepartmentId`, `projectId` instead of `department` string
- `PUT /api/employees` — Same change
- `GET /api/employees` — Include `_count` for department/sub-dept headcount

---

## UI Pages and Navigation

### New Pages

| Route | Page | Description |
|-------|------|-------------|
| `/departments` | Departments | CRUD for departments |
| `/sub-departments` | Sub Departments | CRUD for sub-departments |
| `/projects` | Projects | CRUD for projects |

### Navigation Structure

New items added under the HRIS section in the sidebar:

```
HRIS ▾
  └ Users
  └ Employees
  └ Departments          ← new
  └ Sub Departments      ← new
  └ Projects             ← new
  └ Shift Schedule
  └ Leave Credits
  └ Leaves
  └ Overtime
  └ Time Logs
  └ Holidays
```

### Page Layout Pattern

All three pages follow the same pattern:
- Table with columns: Name, Code, Description, Headcount/Count, Status badge (Active/Inactive)
- "Add" button opens a modal dialog
- Edit icon opens the same modal pre-filled with existing data
- Delete shows confirmation modal; blocked if dependent items exist

### Employee Form Changes

The department dropdown is replaced with 3 cascading selects:

1. **Department** — selecting loads Sub Department options
2. **Sub Department** — selecting loads Project options
3. **Project** — final selection

All three are required fields. Existing employees migrated via seed script.

---

## Data Migration

### Strategy

A seed/migration script runs on first `db:push`:

1. Read existing employee `department` string values
2. Create `Department` records for each unique value (IT, HR, Finance, Marketing, Operations, Sales, Engineering, Admin)
3. Create a default `SubDepartment` under each department (same name as the department)
4. Update employees to reference the new `subDepartmentId`

### Idempotency

The migration script checks if departments already exist before creating them — running it multiple times is safe.

---

## Error Handling

- **Deleting a department with active sub-departments** → blocked, shows which sub-departments depend on it
- **Deleting a sub-department with active projects or employees** → blocked, shows counts
- **Deleting a project with assigned employees** → blocked, shows employee count
- **Soft delete**: `isActive: false` instead of hard delete — preserves data integrity
- **Employee references inactive sub-dept/project** → allowed (no cascade delete), shown as "(Inactive)" in UI

---

## Code Organization

```
/app
  /(dashboard)
    /departments/page.tsx           # Department CRUD page
    /sub-departments/page.tsx       # Sub Department CRUD page
    /projects/page.tsx              # Project CRUD page
  /api
    /departments/route.ts           # Department API
    /sub-departments/route.ts       # Sub Department API
    /projects/route.ts              # Project API

/hooks
  /use-departments.ts               # React Query hooks for departments
  /use-sub-departments.ts           # React Query hooks for sub-departments
  /use-projects.ts                  # React Query hooks for projects

/prisma
  /schema.prisma                    # Updated with new models
```

---

## Out of Scope (Future)

- Org chart visualization
- Project budget tracking
- Employee transfer history (audit trail of department/project changes)
- Department head auto-assignment based on hierarchy

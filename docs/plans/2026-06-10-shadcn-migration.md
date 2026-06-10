# Shadcn UI Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert all HRIS pages from raw HTML/Tailwind to consistent shadcn/ui components

**Architecture:** Existing `components/ui/` already has 17 shadcn components installed. Migration replaces raw `<table>`, `<button>`, `<input>`, `<select>`, modal divs, and alert() calls with shadcn equivalents (Table, Button, Input, Select, Dialog, Badge, Toast).

**Tech Stack:** shadcn/ui (Radix primitives), Tailwind CSS, clsx + tailwind-merge (via cn()), Lucide icons

---

### Task 1: Update shadcn config & add missing components

**Files:**
- Create: `components.json`
- Modify: `package.json` (add any missing deps)
- Create: `components/ui/form.tsx` (if needed)
- Create: `components/ui/separator.tsx`
- Create: `components/ui/popover.tsx`
- Create: `components/ui/command.tsx`
- Create: `components/ui/scroll-area.tsx`

**Steps:**
1. Create `components.json` for shadcn CLI
2. Install any missing radix packages
3. Add missing shadcn components

### Task 2: Convert Layout

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

**Changes:**
- Use shadcn `Sheet` for mobile sidebar
- Use shadcn `ScrollArea` for nav
- Use shadcn `Button` variant="ghost" for nav items
- Use shadcn `Separator` between sections

### Task 3: Convert Payroll pages

**Files:**
- Modify: `app/(dashboard)/payroll/page.tsx`
- Modify: `app/(dashboard)/payroll/advances/page.tsx`

**Changes:**
- Replace raw `<table>` with shadcn `Table` (TableHeader, TableRow, TableCell, etc.)
- Replace raw `<button>` with shadcn `Button` variants
- Replace raw `<input>/<select>` with shadcn `Input`/`Select`
- Replace raw modal divs with shadcn `Dialog`
- Replace `alert()` with shadcn `Toast`
- Use `Card` for groupings
- Use `Badge` for statuses

### Task 4: Convert Time Logs page

**Files:**
- Modify: `app/(dashboard)/time-logs/page.tsx`

**Changes:**
- Replace raw `<table>` with shadcn `Table`
- Replace raw form elements with shadcn equivalents
- Replace raw modal with shadcn `Dialog`
- Use `Badge` for overtime status

### Task 5: Convert Employees page

**Files:**
- Modify: `app/(dashboard)/employees/page.tsx`

**Changes:**
- Use shadcn `Table` for employee list
- Use shadcn `Dialog` for add/edit modals
- Use shadcn `Select` for dropdowns
- Use `Badge` for status
- Use shadcn `Button` throughout

### Task 6: Convert Schedules, Holidays, Settings pages

**Files:**
- Modify: `app/(dashboard)/schedules/page.tsx`
- Modify: `app/(dashboard)/holidays/page.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`

**Changes:**
- Convert all raw elements to shadcn equivalents
- Replace modals with `Dialog`
- Replace tables with `Table`
- Use `Badge`, `Button`, `Card` consistently

### Task 7: Convert remaining pages

**Files:**
- Modify: `app/(dashboard)/users/page.tsx`
- Modify: `app/(dashboard)/leaves/page.tsx`
- Modify: `app/(dashboard)/leave-credits/page.tsx`
- Modify: `app/(dashboard)/overtime/page.tsx`
- Modify: `app/(dashboard)/reports/page.tsx`
- Modify: `app/(dashboard)/reports/print-payroll/page.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Changes:**
- Convert all raw elements to shadcn equivalents
- Consistent styling across all pages

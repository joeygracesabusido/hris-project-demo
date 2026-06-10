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

  // Use findRaw to access legacy department field (removed from Prisma schema)
  const rawResult = await prisma.employee.findRaw({
    filter: {
      department: { $exists: true },
      subDepartmentId: { $exists: false },
    },
    options: {
      projection: { _id: 1, department: 1, fullName: 1 },
    },
  })

  if (!rawResult || rawResult.length === 0) {
    console.log('No employees need migration. Exiting.')
    return
  }

  // Extract employees - findRaw returns { _id: { $oid: "..." }, ... }
  const existingEmployees = rawResult.map((rec: Record<string, unknown>) => {
    const idObj = rec._id as { $oid: string }
    return {
      id: idObj.$oid,
      department: rec.department as string,
      fullName: rec.fullName as string,
    }
  })

  const uniqueDepartments = [...new Set(existingEmployees.map(e => e.department).filter(Boolean))]
  console.log(`Found ${existingEmployees.length} employees across ${uniqueDepartments.length} unique departments:`, uniqueDepartments)

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

  let updatedCount = 0
  for (const emp of existingEmployees) {
    if (!emp.department) continue
    const subDeptId = subDepartmentMap.get(emp.department)
    if (!subDeptId) {
      console.log(`  Skipping ${emp.fullName}: no sub-department for ${emp.department}`)
      continue
    }

    await prisma.employee.update({
      where: { id: emp.id },
      data: { subDepartmentId: subDeptId },
    })
    updatedCount++
    console.log(`  Updated ${emp.fullName} → subDepartmentId: ${subDeptId}`)
  }

  console.log(`Migrated ${updatedCount} employees successfully.`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

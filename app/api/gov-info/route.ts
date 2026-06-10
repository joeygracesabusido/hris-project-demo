import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEmployeeIdForUser } from '@/lib/user-employee-link';
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    let userEmail: string, userRole: string;
    try {
      const session = await getRequestSession(request);
      userEmail = session.userEmail;
      userRole = session.userRole;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    // Build where clause
    const whereClause: Record<string, unknown> = {};

    if (departmentId) {
      // Filter by department — need to find sub-departments under this department first
      const subDepts = await prisma.subDepartment.findMany({
        where: { departmentId },
        select: { id: true },
      });
      whereClause.subDepartmentId = { in: subDepts.map(sd => sd.id) };
    }

    // Non-admin role: only show their own record
    if (!hasAdminAccess(userRole)) {
      const linkedEmployeeId = await getEmployeeIdForUser(userEmail, userRole);
      if (linkedEmployeeId) {
        whereClause.id = linkedEmployeeId;
      } else {
        whereClause.email = userEmail;
      }
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      orderBy: { fullName: 'asc' },
      select: {
        employeeId: true,
        fullName: true,
        sssNo: true,
        philhealthNo: true,
        pagibigNo: true,
        tin: true,
        bankName: true,
        bankAccountNo: true,
        subDepartment: {
          select: {
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(employees);
  } catch (error: unknown) {
    console.error('Error fetching government info:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch government info', details: msg }, { status: 500 });
  }
}

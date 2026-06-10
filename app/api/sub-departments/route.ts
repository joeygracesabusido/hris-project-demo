import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const where: Record<string, unknown> = { isActive: true };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const subDepartments = await prisma.subDepartment.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        department: { select: { name: true, code: true } },
        _count: { select: { projects: true, employees: true } },
      },
    });

    return NextResponse.json(subDepartments);
  } catch (error: unknown) {
    console.error('Error fetching sub-departments:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch sub-departments', details: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let userRole: string;
    try {
      const session = await getRequestSession(request);
      userRole = session.userRole;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, departmentId } = body;

    if (!name || !code || !departmentId) {
      return NextResponse.json({ error: 'Name, code, and departmentId are required' }, { status: 400 });
    }

    const subDepartment = await prisma.subDepartment.create({
      data: { name, code, description: description ?? null, departmentId },
    });

    return NextResponse.json(subDepartment, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating sub-department:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create sub-department', details: msg }, { status: 500 });
  }
}

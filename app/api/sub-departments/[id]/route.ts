import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const subDepartment = await prisma.subDepartment.update({
      where: { id },
      data: { name, code, description: description ?? null, departmentId },
    });

    return NextResponse.json(subDepartment);
  } catch (error: unknown) {
    console.error('Error updating sub-department:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update sub-department', details: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const projects = await prisma.project.count({
      where: { subDepartmentId: id, isActive: true },
    });

    const employees = await prisma.employee.count({
      where: { subDepartmentId: id },
    });

    if (projects > 0 || employees > 0) {
      const reasons: string[] = [];
      if (projects > 0) reasons.push(`${projects} active project(s)`);
      if (employees > 0) reasons.push(`${employees} employee(s)`);
      return NextResponse.json(
        { error: `Cannot deactivate: depends on ${reasons.join(', ')}` },
        { status: 409 }
      );
    }

    await prisma.subDepartment.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Sub-department deactivated' });
  } catch (error: unknown) {
    console.error('Error deactivating sub-department:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to deactivate sub-department', details: msg }, { status: 500 });
  }
}

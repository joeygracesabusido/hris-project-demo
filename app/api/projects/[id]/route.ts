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
    const { name, code, description, subDepartmentId } = body;

    const project = await prisma.project.update({
      where: { id },
      data: { name, code, description: description ?? null, subDepartmentId },
    });

    return NextResponse.json(project);
  } catch (error: unknown) {
    console.error('Error updating project:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update project', details: msg }, { status: 500 });
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

    const employees = await prisma.employee.count({
      where: { projectId: id },
    });

    if (employees > 0) {
      return NextResponse.json(
        { error: `Cannot deactivate: ${employees} employee(s) assigned to this project` },
        { status: 409 }
      );
    }

    await prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Project deactivated' });
  } catch (error: unknown) {
    console.error('Error deactivating project:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to deactivate project', details: msg }, { status: 500 });
  }
}

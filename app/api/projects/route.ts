import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subDepartmentId = searchParams.get('subDepartmentId');

    const where: Record<string, unknown> = { isActive: true };
    if (subDepartmentId) {
      where.subDepartmentId = subDepartmentId;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        subDepartment: { select: { name: true, code: true } },
        _count: { select: { employees: true } },
      },
    });

    return NextResponse.json(projects);
  } catch (error: unknown) {
    console.error('Error fetching projects:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch projects', details: msg }, { status: 500 });
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
    const { name, code, description, subDepartmentId } = body;

    if (!name || !code || !subDepartmentId) {
      return NextResponse.json({ error: 'Name, code, and subDepartmentId are required' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: { name, code, description: description ?? null, subDepartmentId },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create project', details: msg }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    let userRole: string;
    try {
      const session = await getRequestSession(request);
      userRole = session.userRole;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestType = searchParams.get('requestType');
    const departmentId = searchParams.get('departmentId');
    const level = searchParams.get('level');

    const whereClause: Record<string, unknown> = { isActive: true };

    if (requestType) whereClause.requestType = requestType;
    if (departmentId) whereClause.departmentId = departmentId;
    if (level) whereClause.level = parseInt(level, 10);

    const rules = await prisma.approvalRule.findMany({
      where: whereClause,
      orderBy: [{ level: 'asc' }, { minDays: 'asc' }],
      include: {
        approver: { select: { id: true, fullName: true, isActive: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(rules);
  } catch (error: unknown) {
    console.error('Error fetching approval rules:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch approval rules', details: msg }, { status: 500 });
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { approverId, requestType, scope, minDays, maxDays, level, departmentId } = body;

    if (!approverId || !requestType) {
      return NextResponse.json({ error: 'Approver and request type are required' }, { status: 400 });
    }

    const rule = await prisma.approvalRule.create({
      data: {
        approverId,
        requestType,
        scope: scope ?? 'DIRECT_REPORTS',
        minDays: minDays ?? 0,
        maxDays: maxDays ?? 999,
        level: level ?? 1,
        departmentId: departmentId ?? null,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating approval rule:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create approval rule', details: msg }, { status: 500 });
  }
}

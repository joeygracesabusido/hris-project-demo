import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const approverId = searchParams.get('approverId');

    const whereClause: Record<string, unknown> = { isActive: true };
    if (approverId) whereClause.approverId = approverId;

    const delegations = await prisma.approvalDelegation.findMany({
      where: whereClause,
      include: {
        approver: { select: { id: true, fullName: true } },
        delegatedTo: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json(delegations);
  } catch (error: unknown) {
    console.error('Error fetching delegations:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch delegations', details: msg }, { status: 500 });
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
    const { approverId, delegatedToId, delegationStart, delegationEnd, requestType } = body;

    if (!approverId || !delegatedToId || !delegationStart || !delegationEnd) {
      return NextResponse.json({ error: 'All fields except requestType are required' }, { status: 400 });
    }

    const delegation = await prisma.approvalDelegation.create({
      data: {
        approverId,
        delegatedToId,
        delegationStart: new Date(delegationStart),
        delegationEnd: new Date(delegationEnd),
        requestType: requestType ?? null,
      },
    });

    return NextResponse.json(delegation, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating delegation:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create delegation', details: msg }, { status: 500 });
  }
}

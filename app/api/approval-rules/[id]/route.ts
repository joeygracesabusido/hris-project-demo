import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    const rule = await prisma.approvalRule.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(rule);
  } catch (error: unknown) {
    console.error('Error updating approval rule:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update approval rule', details: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Soft delete
    await prisma.approvalRule.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting approval rule:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete approval rule', details: msg }, { status: 500 });
  }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRequestSession, hasAdminAccess } from '@/lib/auth-helpers'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let userRole: string
    try {
      const session = await getRequestSession(request)
      userRole = session.userRole
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description } = body

    const department = await prisma.department.update({
      where: { id },
      data: { name, code, description: description ?? null },
    })

    return NextResponse.json(department)
  } catch (error: unknown) {
    console.error('Error updating department:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update department', details: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let userRole: string
    try {
      const session = await getRequestSession(request)
      userRole = session.userRole
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const subDepts = await prisma.subDepartment.count({
      where: { departmentId: id, isActive: true },
    })

    if (subDepts > 0) {
      return NextResponse.json(
        { error: `Cannot deactivate: ${subDepts} active sub-department(s) depend on this` },
        { status: 409 }
      )
    }

    await prisma.department.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Department deactivated' })
  } catch (error: unknown) {
    console.error('Error deactivating department:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to deactivate department', details: msg }, { status: 500 })
  }
}

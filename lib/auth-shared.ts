import type { Role } from '@prisma/client'

export const ADMIN_ROLES: Role[] = ['ADMIN', 'HR', 'MANAGER']

export function hasAdminAccess(userRole: string): boolean {
  return ADMIN_ROLES.includes(userRole as Role)
}

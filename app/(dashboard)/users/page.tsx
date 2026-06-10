'use client';

import { useState, useEffect } from 'react';
import { Check, X, Clock, UserCheck, UserX, Shield, Briefcase, Users, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type UserRole = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

interface User {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('EMPLOYEE');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchUsers();

    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    setUserRole(cookies.userRole || '');
  }, []);

  if (!mounted) return null;

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      });

      if (res.ok) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, status } : user
        ));
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleRoleUpdate = async (userId: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        setEditingUserId(null);
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const startEditingRole = (user: User) => {
    setEditingUserId(user.id);
    setNewRole(user.role);
  };

  const cancelRoleEdit = () => {
    setEditingUserId(null);
  };

  const getRoleBadge = (role: UserRole) => {
    const config: Record<UserRole, { icon: LucideIcon; variant: 'secondary' | 'default'; className: string }> = {
      ADMIN: { icon: Shield, variant: 'default', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200' },
      HR: { icon: UserCog, variant: 'default', className: 'bg-pink-100 text-pink-700 hover:bg-pink-100 border-pink-200' },
      MANAGER: { icon: Briefcase, variant: 'default', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' },
      EMPLOYEE: { icon: Users, variant: 'secondary', className: '' },
    };

    const { icon: Icon, className, variant } = config[role];
    return (
      <Badge variant={variant} className={`flex items-center gap-1 ${className}`}>
        <Icon className="w-3 h-3" />
        {role}
      </Badge>
    );
  };

  const canEditRoles = userRole === 'ADMIN' || userRole === 'HR';

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.status === filter;
  });

  const pendingUsers = users.filter(u => u.status === 'FOR_APPROVAL');
  const approvedUsers = users.filter(u => u.status === 'APPROVED');
  const rejectedUsers = users.filter(u => u.status === 'REJECTED');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FOR_APPROVAL':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="success" className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="flex items-center gap-1"><UserX className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage user registrations and approvals</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilter('all')}
          className={`rounded-none border-b-2 ${
            filter === 'all'
              ? 'border-blue-600'
              : 'border-transparent'
          }`}
        >
          All Users ({users.length})
        </Button>
        <Button
          variant={filter === 'FOR_APPROVAL' ? 'default' : 'ghost'}
          onClick={() => setFilter('FOR_APPROVAL')}
          className={`rounded-none border-b-2 ${
            filter === 'FOR_APPROVAL'
              ? 'border-yellow-500'
              : 'border-transparent'
          }`}
        >
          Pending ({pendingUsers.length})
        </Button>
        <Button
          variant={filter === 'APPROVED' ? 'default' : 'ghost'}
          onClick={() => setFilter('APPROVED')}
          className={`rounded-none border-b-2 ${
            filter === 'APPROVED'
              ? 'border-green-600'
              : 'border-transparent'
          }`}
        >
          Approved ({approvedUsers.length})
        </Button>
        <Button
          variant={filter === 'REJECTED' ? 'default' : 'ghost'}
          onClick={() => setFilter('REJECTED')}
          className={`rounded-none border-b-2 ${
            filter === 'REJECTED'
              ? 'border-red-600'
              : 'border-transparent'
          }`}
        >
          Rejected ({rejectedUsers.length})
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        {loading ? (
          <CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent>
        ) : filteredUsers.length === 0 ? (
          <CardContent className="p-8 text-center text-muted-foreground">No users found</CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {user.name?.[0] || user.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    {editingUserId === user.id && canEditRoles ? (
                      <div className="flex items-center gap-2">
                        <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="EMPLOYEE">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-green-100 text-green-600 hover:bg-green-200" onClick={() => handleRoleUpdate(user.id)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-gray-100 text-gray-600 hover:bg-gray-200" onClick={cancelRoleEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {getRoleBadge(user.role)}
                        {canEditRoles && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditingRole(user)} title="Edit role">
                            <UserCog className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {userRole === 'ADMIN' && user.status === 'FOR_APPROVAL' && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="bg-green-100 text-green-600 hover:bg-green-200" onClick={() => handleStatusChange(user.id, 'APPROVED')} title="Approve">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="bg-red-100 text-red-600 hover:bg-red-200" onClick={() => handleStatusChange(user.id, 'REJECTED')} title="Reject">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSubDepartments, useCreateSubDepartment, useUpdateSubDepartment, useDeleteSubDepartment } from '@/hooks/use-sub-departments';
import { useDepartments } from '@/hooks/use-departments';
import { getClientCookies } from '@/lib/client-cookies';
import { hasAdminAccess } from '@/lib/auth-shared';
import type { SubDepartment } from '@/hooks/use-sub-departments';
import type { Department } from '@/hooks/use-departments';

const initialForm = { name: '', code: '', description: '', departmentId: '' };

export default function SubDepartmentsPage() {
  const { data: subDepartments = [], isLoading } = useSubDepartments();
  const { data: departments = [] } = useDepartments();
  const createSubDepartment = useCreateSubDepartment();
  const updateSubDepartment = useUpdateSubDepartment();
  const deleteSubDepartment = useDeleteSubDepartment();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<SubDepartment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [formData, setFormData] = useState({ ...initialForm });

  useEffect(() => {
    const cookies = getClientCookies();
    if (!cookies.isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    setUserRole(cookies.userRole);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSubDepartment) {
        await updateSubDepartment.mutateAsync({ id: selectedSubDepartment.id, ...formData });
      } else {
        await createSubDepartment.mutateAsync(formData);
      }
      setShowModal(false);
      setSelectedSubDepartment(null);
      setFormData({ ...initialForm });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    }
  };

  const resetForm = () => setFormData({ ...initialForm });

  const handleEdit = (subDept: SubDepartment) => {
    setSelectedSubDepartment(subDept);
    setFormData({
      name: subDept.name,
      code: subDept.code,
      description: subDept.description || '',
      departmentId: subDept.departmentId,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedSubDepartment) return;
    try {
      await deleteSubDepartment.mutateAsync(selectedSubDepartment.id);
      setShowDeleteModal(false);
      setSelectedSubDepartment(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    }
  };

  const filteredSubDepartments = subDepartments.filter(sd => {
    const matchesSearch = sd.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !departmentFilter || sd.departmentId === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const isAdmin = hasAdminAccess(userRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sub-Departments</h1>
          <p className="text-gray-500">Manage sub-department divisions</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setSelectedSubDepartment(null); resetForm(); setShowModal(true); }}>
            <Plus className="w-5 h-5" /> Add Sub-Department
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input type="text" placeholder="Search sub-departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10" />
        </div>
        <div className="w-64">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Departments</SelectItem>
              {departments.filter((d: Department) => d.isActive).map((dept: Department) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card className="shadow-sm"><CardContent className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Loading sub-departments...
        </CardContent></Card>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {filteredSubDepartments.map((subDept) => (
              <Card key={subDept.id} className="shadow-sm"><CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{subDept.name}</p>
                      <p className="text-xs text-gray-500">{subDept.code}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(subDept)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSubDepartment(subDept); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Department</p>
                    <p className="font-medium text-gray-700">{subDept.department?.name ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Projects</p>
                    <p className="font-medium text-gray-700">{subDept._count?.projects ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Employees</p>
                    <p className="font-medium text-gray-700">{subDept._count?.employees ?? 0}</p>
                  </div>
                </div>
                {subDept.description && (
                  <p className="text-sm text-gray-500">{subDept.description}</p>
                )}
              </CardContent></Card>
            ))}
            {filteredSubDepartments.length === 0 && (
              <Card className="shadow-sm"><CardContent className="p-8 text-center text-gray-400 text-sm">
                No sub-departments found.
              </CardContent></Card>
            )}
          </div>

          <div className="hidden lg:block bg-white rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Code</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Projects</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employees</TableHead>
                  {isAdmin && <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubDepartments.map((subDept) => (
                  <TableRow key={subDept.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center font-bold">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{subDept.name}</p>
                          {subDept.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{subDept.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-700">{subDept.code}</TableCell>
                    <TableCell className="text-sm text-gray-600">{subDept.department?.name ?? '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{subDept._count?.projects ?? 0}</TableCell>
                    <TableCell className="text-sm text-gray-600">{subDept._count?.employees ?? 0}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(subDept)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedSubDepartment(subDept); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Layers className="w-5 h-5" /></div>
              <DialogTitle className="text-xl font-bold">{selectedSubDepartment ? 'Edit Sub-Department' : 'Add Sub-Department'}</DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Name *</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Software Engineering" className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Code *</Label>
              <Input name="code" value={formData.code} onChange={handleChange} required placeholder="e.g. SWE" className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Department *</Label>
              <Select value={formData.departmentId} onValueChange={(value) => setFormData({ ...formData, departmentId: value })}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.filter((d: Department) => d.isActive).map((dept: Department) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name} ({dept.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Description</Label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description..."
                className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-11">Cancel</Button>
              <Button type="submit" className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white" disabled={createSubDepartment.isPending || updateSubDepartment.isPending}>
                {createSubDepartment.isPending || updateSubDepartment.isPending ? 'Saving...' : selectedSubDepartment ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) setShowDeleteModal(false); }}>
        <DialogContent className="sm:max-w-md p-0 gap-0">
          <DialogHeader className="p-8 pb-0">
            <DialogTitle className="text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-10 h-10" /></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Sub-Department?</h2>
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 pt-4">
            <p className="text-gray-500 mb-8 text-sm leading-relaxed text-center">
              This will deactivate <strong>{selectedSubDepartment?.name}</strong>. It will no longer be available for assignments.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1 h-11">Cancel</Button>
              <Button onClick={handleDelete} className="flex-1 h-11 bg-red-600 hover:bg-red-700" disabled={deleteSubDepartment.isPending}>
                {deleteSubDepartment.isPending ? 'Deactivating...' : 'Yes, Deactivate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/use-departments';
import { getClientCookies } from '@/lib/client-cookies';
import type { Department } from '@/hooks/use-departments';

const initialForm = { name: '', code: '', description: '' };

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
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
    setError('');

    if (selectedDepartment) {
      const result = await updateDepartment.mutateAsync({ id: selectedDepartment.id, ...formData });
      if (result?.error) { setError(result.error); return; }
    } else {
      const result = await createDepartment.mutateAsync(formData);
      if (result?.error) { setError(result.error); return; }
    }

    setShowModal(false);
    setSelectedDepartment(null);
    setFormData({ ...initialForm });
  };

  const resetForm = () => setFormData({ ...initialForm });

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;
    await deleteDepartment.mutateAsync(selectedDepartment.id);
    setShowDeleteModal(false);
    setSelectedDepartment(null);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500">Manage organizational departments</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setSelectedDepartment(null); resetForm(); setShowModal(true); }}>
            <Plus className="w-5 h-5" /> Add Department
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input type="text" placeholder="Search departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10" />
      </div>

      {isLoading ? (
        <Card className="shadow-sm"><CardContent className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Loading departments...
        </CardContent></Card>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {filteredDepartments.map((department) => (
              <Card key={department.id} className="shadow-sm"><CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{department.name}</p>
                      <p className="text-xs text-gray-500">{department.code}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(department)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedDepartment(department); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Sub-Departments</p>
                    <p className="font-medium text-gray-700">{department._count?.subDepartments ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Status</p>
                    <p className={`font-medium ${department.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {department.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                {department.description && (
                  <p className="text-sm text-gray-500">{department.description}</p>
                )}
              </CardContent></Card>
            ))}
            {filteredDepartments.length === 0 && (
              <Card className="shadow-sm"><CardContent className="p-8 text-center text-gray-400 text-sm">
                No departments found.
              </CardContent></Card>
            )}
          </div>

          <div className="hidden lg:block bg-white rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Code</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sub-Departments</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</TableHead>
                  {isAdmin && <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{department.name}</p>
                          {department.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{department.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-700">{department.code}</TableCell>
                    <TableCell className="text-sm text-gray-600">{department._count?.subDepartments ?? 0}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        department.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {department.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(department)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedDepartment(department); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
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
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Building2 className="w-5 h-5" /></div>
              <DialogTitle className="text-xl font-bold">{selectedDepartment ? 'Edit Department' : 'Add Department'}</DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-200">{error}</div>}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Name *</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Human Resources" className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Code *</Label>
              <Input name="code" value={formData.code} onChange={handleChange} required placeholder="e.g. HR" className="h-11" />
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
              <Button type="submit" className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white" disabled={createDepartment.isPending || updateDepartment.isPending}>
                {createDepartment.isPending || updateDepartment.isPending ? 'Saving...' : selectedDepartment ? 'Update' : 'Create'}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Department?</h2>
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 pt-4">
            <p className="text-gray-500 mb-8 text-sm leading-relaxed text-center">
              This will deactivate <strong>{selectedDepartment?.name}</strong>. It will no longer be available for assignments.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1 h-11">Cancel</Button>
              <Button onClick={handleDelete} className="flex-1 h-11 bg-red-600 hover:bg-red-700" disabled={deleteDepartment.isPending}>
                {deleteDepartment.isPending ? 'Deactivating...' : 'Yes, Deactivate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

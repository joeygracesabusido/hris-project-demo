'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/use-projects';
import { useSubDepartments } from '@/hooks/use-sub-departments';
import { getClientCookies } from '@/lib/client-cookies';
import { hasAdminAccess } from '@/lib/auth-shared';
import type { Project } from '@/hooks/use-projects';
import type { SubDepartment } from '@/hooks/use-sub-departments';

const initialForm = { name: '', code: '', description: '', subDepartmentId: '' };

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: subDepartments = [] } = useSubDepartments();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subDepartmentFilter, setSubDepartmentFilter] = useState('all');
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
    if (!formData.subDepartmentId) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Sub-department is required.' });
      return;
    }
    try {
      if (selectedProject) {
        await updateProject.mutateAsync({ id: selectedProject.id, ...formData });
      } else {
        await createProject.mutateAsync(formData);
      }
      setShowModal(false);
      setSelectedProject(null);
      setFormData({ ...initialForm });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    }
  };

  const resetForm = () => setFormData({ ...initialForm });

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      subDepartmentId: project.subDepartmentId,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      await deleteProject.mutateAsync(selectedProject.id);
      setShowDeleteModal(false);
      setSelectedProject(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubDept = subDepartmentFilter === 'all' || p.subDepartmentId === subDepartmentFilter;
    return matchesSearch && matchesSubDept;
  });

  const isAdmin = hasAdminAccess(userRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Manage project divisions</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setSelectedProject(null); resetForm(); setShowModal(true); }}>
            <Plus className="w-5 h-5" /> Add Project
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10" />
        </div>
        <div className="w-64">
          <Select value={subDepartmentFilter} onValueChange={setSubDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Sub-Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub-Departments</SelectItem>
              {subDepartments.filter((sd: SubDepartment) => sd.isActive).map((sd: SubDepartment) => (
                <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card className="shadow-sm"><CardContent className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Loading projects...
        </CardContent></Card>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="shadow-sm"><CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.code}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(project)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(project); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Sub-Department</p>
                    <p className="font-medium text-gray-700">{project.subDepartment?.name ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Employees</p>
                    <p className="font-medium text-gray-700">{project._count?.employees ?? 0}</p>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-500">{project.description}</p>
                )}
              </CardContent></Card>
            ))}
            {filteredProjects.length === 0 && (
              <Card className="shadow-sm"><CardContent className="p-8 text-center text-gray-400 text-sm">
                No projects found.
              </CardContent></Card>
            )}
          </div>

          <div className="hidden lg:block bg-white rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Code</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sub-Department</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employees</TableHead>
                  {isAdmin && <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-bold">
                          <FolderKanban className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{project.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-700">{project.code}</TableCell>
                    <TableCell className="text-sm text-gray-600">{project.subDepartment?.name ?? '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{project._count?.employees ?? 0}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(project)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(project); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
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
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><FolderKanban className="w-5 h-5" /></div>
              <DialogTitle className="text-xl font-bold">{selectedProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Name *</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Mobile App Development" className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Code *</Label>
              <Input name="code" value={formData.code} onChange={handleChange} required placeholder="e.g. MOB-APP" className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Sub-Department *</Label>
              <Select value={formData.subDepartmentId} onValueChange={(value) => setFormData({ ...formData, subDepartmentId: value })}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select sub-department..." />
                </SelectTrigger>
                <SelectContent>
                  {subDepartments.filter((sd: SubDepartment) => sd.isActive).map((sd: SubDepartment) => (
                    <SelectItem key={sd.id} value={sd.id}>{sd.name} ({sd.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Description</Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description..."
                className="h-24"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-11">Cancel</Button>
              <Button type="submit" className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white" disabled={createProject.isPending || updateProject.isPending}>
                {createProject.isPending || updateProject.isPending ? 'Saving...' : selectedProject ? 'Update' : 'Create'}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Project?</h2>
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 pt-4">
            <p className="text-gray-500 mb-8 text-sm leading-relaxed text-center">
              This will deactivate <strong>{selectedProject?.name}</strong>. It will no longer be available for assignments.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1 h-11">Cancel</Button>
              <Button onClick={handleDelete} className="flex-1 h-11 bg-red-600 hover:bg-red-700" disabled={deleteProject.isPending}>
                {deleteProject.isPending ? 'Deactivating...' : 'Yes, Deactivate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

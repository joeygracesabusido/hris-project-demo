'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, User, Pencil, Trash2, Wallet } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
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
import FaceCapture from '@/components/facial-recognition/FaceCapture';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useEnrollFace } from '@/hooks/use-employees';
import { useDepartments } from '@/hooks/use-departments';
import { useSubDepartments } from '@/hooks/use-sub-departments';
import { useProjects } from '@/hooks/use-projects';
import { getClientCookies } from '@/lib/client-cookies';
import type { Employee } from '@/hooks/use-employees';

const frequencies = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'SEMIMONTHLY', label: 'Semi-monthly' },
  { value: 'MONTHLY', label: 'Monthly' }
];

const initialForm = {
  employeeId: '', fullName: '', email: '', position: '',
  payType: 'MONTHLY', basicSalary: '', dailyRate: '',
  payrollFrequency: 'MONTHLY', managerId: '', hireDate: '',
  tin: '', sssNo: '', philhealthNo: '', pagibigNo: '',
  bankName: '', bankAccountNo: '',
  employeeStatus: 'PROBATIONARY', regularizationDate: '',
};

export default function EmployeesPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const enrollFace = useEnrollFace();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [faceEnrollStatus, setFaceEnrollStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [formData, setFormData] = useState({ ...initialForm });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [selectedSubDepartmentId, setSelectedSubDepartmentId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const { data: departments = [] } = useDepartments()
  const { data: subDepartments = [] } = useSubDepartments(selectedDepartmentId || undefined)
  const { data: projects = [] } = useProjects(selectedSubDepartmentId || undefined)

  useEffect(() => {
    const cookies = getClientCookies();
    if (!cookies.isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    setUserRole(cookies.userRole);
    setCurrentUserEmail(cookies.userEmail);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const basePayload = {
      ...formData,
      subDepartmentId: selectedSubDepartmentId,
      projectId: selectedProjectId || undefined,
      basicSalary: parseFloat(formData.basicSalary || '0'),
      dailyRate: parseFloat(formData.dailyRate || '0'),
      managerId: formData.managerId || undefined
    };

    if (selectedEmployee) {
      const result = await updateEmployee.mutateAsync({ id: selectedEmployee.id, ...basePayload });
      if (result?.error) { setError(result.error); return; }
    } else {
      const result = await createEmployee.mutateAsync(basePayload);
      if (result?.error) { setError(result.error); return; }
    }

    setShowModal(false);
    setSelectedEmployee(null);
    setFormData({ ...initialForm });
  };

  const resetForm = () => {
    setFormData({ ...initialForm });
    setSelectedDepartmentId('');
    setSelectedSubDepartmentId('');
    setSelectedProjectId('');
  };

  const handleEdit = (employee: Employee) => {
    if (userRole === 'EMPLOYEE') {
      setSelectedEmployee(employee);
      setShowFaceModal(true);
      return;
    }
    setSelectedEmployee(employee);
    setFormData({
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      position: employee.position,
      payType: employee.payType || 'MONTHLY',
      basicSalary: employee.basicSalary?.toString() || '0',
      dailyRate: employee.dailyRate?.toString() || '0',
      payrollFrequency: employee.payrollFrequency || 'MONTHLY',
      managerId: employee.managerId || '',
      hireDate: employee.hireDate.split('T')[0],
      tin: employee.tin || '',
      sssNo: employee.sssNo || '',
      philhealthNo: employee.philhealthNo || '',
      pagibigNo: employee.pagibigNo || '',
      bankName: employee.bankName || '',
      bankAccountNo: employee.bankAccountNo || '',
      employeeStatus: employee.employeeStatus || 'PROBATIONARY',
      regularizationDate: employee.regularizationDate ? employee.regularizationDate.split('T')[0] : '',
    });
    setSelectedSubDepartmentId(employee.subDepartmentId || '')
    setSelectedProjectId(employee.projectId || '')
    setSelectedDepartmentId((employee.subDepartment as { departmentId?: string })?.departmentId || '')
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    await deleteEmployee.mutateAsync(selectedEmployee.id);
    setShowDeleteModal(false);
    setSelectedEmployee(null);
  };

  const handleFaceCapture = async (descriptor: Float32Array) => {
    if (!selectedEmployee) return;
    setFaceEnrollStatus(null);

    try {
      await enrollFace.mutateAsync({
        employeeId: selectedEmployee.id,
        descriptor: Array.from(descriptor),
      });
      setFaceEnrollStatus({ ok: true, msg: `✓ Face enrolled for ${selectedEmployee.fullName}!` });
      setTimeout(() => setShowFaceModal(false), 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setFaceEnrollStatus({ ok: false, msg });
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500">Manage employee records and payroll rates</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setSelectedEmployee(null); resetForm(); setShowModal(true); }}>
            <Plus className="w-5 h-5" /> Add Employee
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input type="text" placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10" />
      </div>

      {isLoading ? (
        <Card className="shadow-sm"><CardContent className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Loading employees...
        </CardContent></Card>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="shadow-sm"><CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {employee.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{employee.fullName}</p>
                      <p className="text-xs text-gray-500">ID: {employee.employeeId}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedEmployee(employee); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                  {userRole === 'EMPLOYEE' && (
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedEmployee(employee); setShowFaceModal(true); }} className="text-green-600 hover:bg-green-50" title="Enroll Face">
                      <User className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Department</p>
                    <p className="font-medium text-gray-700">{employee.subDepartment?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Pay Type</p>
                    <Badge variant={employee.payType === 'DAILY' ? 'warning' : 'default'} className="mt-0.5">
                      {employee.payType || 'MONTHLY'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">
                      {employee.payType === 'DAILY' ? 'Daily Rate' : 'Salary'}
                    </p>
                    <p className="font-bold text-gray-900">
                      ₱{employee.payType === 'DAILY'
                        ? (employee.dailyRate || 0).toLocaleString()
                        : (employee.basicSalary || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Status</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <Badge variant={
                        employee.employeeStatus === 'REGULAR' ? 'success' :
                        employee.employeeStatus === 'PROBATIONARY' ? 'warning' :
                        'secondary'
                      }>
                        {employee.employeeStatus || 'PROBATIONARY'}
                      </Badge>
                      <Badge variant={employee.isActive ? 'success' : 'secondary'}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent></Card>
            ))}
            {filteredEmployees.length === 0 && (
              <Card className="shadow-sm"><CardContent className="p-8 text-center text-gray-400 text-sm">
                No employees found.
              </CardContent></Card>
            )}
          </div>

          <div className="hidden lg:block bg-white rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pay Type</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rate/Salary</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</TableHead>
                  {isAdmin && <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</TableHead>}
                  {userRole === 'EMPLOYEE' && <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Face</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {employee.fullName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{employee.fullName}</p>
                          <p className="text-xs text-gray-500">ID: {employee.employeeId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.payType === 'DAILY' ? 'warning' : 'default'}>
                        {employee.payType || 'MONTHLY'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">
                          ₱{employee.payType === 'DAILY' 
                            ? (employee.dailyRate || 0).toLocaleString() 
                            : (employee.basicSalary || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-medium">
                          {employee.payType === 'DAILY' ? 'per day' : 'per month'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-600">{employee.subDepartment?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={
                          employee.employeeStatus === 'REGULAR' ? 'success' :
                          employee.employeeStatus === 'PROBATIONARY' ? 'warning' :
                          'secondary'
                        }>
                          {employee.employeeStatus || 'PROBATIONARY'}
                        </Badge>
                        <Badge variant={employee.isActive ? 'success' : 'secondary'}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)} className="text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedEmployee(employee); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                    {userRole === 'EMPLOYEE' && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedEmployee(employee); setShowFaceModal(true); }} className="text-green-600 hover:bg-green-50" title="Enroll Face">
                          <User className="w-4 h-4" />
                        </Button>
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
        <DialogContent className="bg-slate-950 text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto border-slate-800 p-0 gap-0">
          <DialogHeader className="p-6 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400"><User className="w-5 h-5" /></div>
              <DialogTitle className="text-white text-xl font-bold">{selectedEmployee ? 'Edit Employee Profile' : 'Register New Employee'}</DialogTitle>
            </div>
          </DialogHeader>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {error && <div className="bg-red-900/20 text-red-400 p-4 rounded-xl text-sm font-medium border border-red-900/50">{error}</div>}
              {userRole === 'EMPLOYEE' && <div className="bg-green-900/20 text-green-400 p-4 rounded-xl text-sm font-medium border border-green-900/50">View mode - Only Face Enrollment is enabled</div>}

              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Personal & Role Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Full Name *</Label>
                    <Input name="fullName" value={formData.fullName} onChange={handleChange} required disabled={userRole === 'EMPLOYEE'} placeholder="Juan R. Dela Cruz" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 disabled:opacity-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Employee ID *</Label>
                    <Input name="employeeId" value={formData.employeeId} onChange={handleChange} required disabled={userRole === 'EMPLOYEE'} placeholder="EMP-0001" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 disabled:opacity-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Work Email *</Label>
                    <Input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={userRole === 'EMPLOYEE'} placeholder="juan@company.com" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 disabled:opacity-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Position *</Label>
                    <Input name="position" value={formData.position} onChange={handleChange} required disabled={userRole === 'EMPLOYEE'} placeholder="Senior Developer" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 disabled:opacity-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Department *</Label>
                    <Select
                      value={selectedDepartmentId}
                      onValueChange={(value) => {
                        setSelectedDepartmentId(value)
                        setSelectedSubDepartmentId('')
                        setSelectedProjectId('')
                      }}
                      disabled={userRole === 'EMPLOYEE'}
                    >
                      <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.filter(d => d.isActive).map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Sub-Department *</Label>
                    <Select
                      value={selectedSubDepartmentId}
                      onValueChange={(value) => {
                        setSelectedSubDepartmentId(value)
                        setSelectedProjectId('')
                      }}
                      disabled={!selectedDepartmentId || userRole === 'EMPLOYEE'}
                    >
                      <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
                        <SelectValue placeholder={selectedDepartmentId ? 'Select Sub-Department' : 'Select a department first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {subDepartments.filter(sd => sd.isActive).map(sd => (
                          <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Project</Label>
                    <Select
                      value={selectedProjectId}
                      onValueChange={(value) => setSelectedProjectId(value === '__none__' ? '' : value)}
                      disabled={!selectedSubDepartmentId || userRole === 'EMPLOYEE'}
                    >
                      <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
                        <SelectValue placeholder={selectedSubDepartmentId ? 'Select Project (optional)' : 'Select a sub-department first'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No project</SelectItem>
                        {projects.filter(p => p.isActive).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Employment Status</Label>
                    <Select
                      value={formData.employeeStatus}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, employeeStatus: value }))}
                      disabled={userRole === 'EMPLOYEE'}
                    >
                      <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white disabled:opacity-50">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PROBATIONARY">Probationary</SelectItem>
                        <SelectItem value="REGULAR">Regular</SelectItem>
                        <SelectItem value="RESIGNED">Resigned</SelectItem>
                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                        <SelectItem value="ONDESIGN">On Designation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Regularization Date</Label>
                    <Input type="date" name="regularizationDate" value={formData.regularizationDate} onChange={handleChange} className="h-11 bg-slate-900 border-slate-700 text-white" />
                    <p className="text-xs text-slate-500">Required when status is Regular</p>
                  </div>
                </div>
              </section>

              <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Payroll & Salary Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-500">Payment Type *</Label>
                    <Select
                      value={formData.payType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, payType: value }))}
                    >
                      <SelectTrigger className="w-full h-11 bg-white border rounded-lg font-bold">
                        <SelectValue placeholder="Select pay type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Fixed Monthly Salary</SelectItem>
                        <SelectItem value="DAILY">Daily Rate Basis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.payType === 'DAILY' ? (
                    <div className="space-y-1.5 animate-in slide-in-from-left-2 duration-200">
                      <Label className="text-xs font-bold uppercase text-slate-400 text-orange-400">Daily Rate (PHP) *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
                        <Input type="number" name="dailyRate" value={formData.dailyRate} onChange={handleChange} required placeholder="650" className="h-11 pl-8 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:ring-orange-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 animate-in slide-in-from-left-2 duration-200">
                      <Label className="text-xs font-bold uppercase text-slate-400 text-blue-400">Basic Monthly Salary (PHP) *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
                        <Input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} required placeholder="25000" className="h-11 pl-8 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600" />
                      </div>
                    </div>
                  )}


                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Payroll Frequency *</Label>
                    <Select
                      value={formData.payrollFrequency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, payrollFrequency: value }))}
                    >
                      <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencies.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Hire Date *</Label>
                    <Input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} required className="h-11 bg-slate-900 border-slate-700 text-white" />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Government IDs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">TIN *</Label>
                    <Input name="tin" value={formData.tin} onChange={handleChange} required placeholder="000-000-000-000" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">SSS No. *</Label>
                    <Input name="sssNo" value={formData.sssNo} onChange={handleChange} required placeholder="00-0000000-0" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">PhilHealth No. *</Label>
                    <Input name="philhealthNo" value={formData.philhealthNo} onChange={handleChange} required placeholder="00-000000000-0" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Pag-IBIG MID *</Label>
                    <Input name="pagibigNo" value={formData.pagibigNo} onChange={handleChange} required placeholder="0000-0000-0000" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600" />
                  </div>
                </div>
              </section>

              <section className="bg-blue-900/20 p-6 rounded-2xl border border-blue-900/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Biometric Enrollment</h3>
                  {selectedEmployee && (
                    <Button
                      type="button"
                      onClick={() => setShowFaceModal(true)}
                      className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {`Enroll Face for ${selectedEmployee.fullName}`}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-blue-400/80">
                  {selectedEmployee
                    ? 'Enroll the employee\'s face for secure attendance verification.'
                    : 'Face enrollment is only available for existing employees.'}
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Bank Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Bank Name</Label>
                    <Input name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g. BDO, BPI, GCash" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-slate-400">Account Number</Label>
                    <Input name="bankAccountNo" value={formData.bankAccountNo} onChange={handleChange} placeholder="0000000000" className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600" />
                  </div>
                </div>
              </section>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-slate-950 py-4 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</Button>
                {userRole !== 'EMPLOYEE' && (
                  <Button type="submit" className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white" disabled={createEmployee.isPending || updateEmployee.isPending}>
                    {createEmployee.isPending || updateEmployee.isPending ? 'Saving...' : selectedEmployee ? 'Update Profile' : 'Create Employee'}
                  </Button>
                )}
                {userRole === 'EMPLOYEE' && (
                  <Button type="button" onClick={() => { setShowModal(false); setShowFaceModal(true); }} className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white">Enroll Face</Button>
                )}
              </div>
            </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) setShowDeleteModal(false); }}>
        <DialogContent className="sm:max-w-md p-0 gap-0">
          <DialogHeader className="p-8 pb-0">
            <DialogTitle className="text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-10 h-10" /></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Profile?</h2>
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 pt-4">
            <p className="text-gray-500 mb-8 text-sm leading-relaxed text-center">This will permanently remove <strong>{selectedEmployee?.fullName}</strong> from the system. This action cannot be reversed.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1 h-11">No, Keep it</Button>
              <Button onClick={handleDelete} className="flex-1 h-11 bg-red-600 hover:bg-red-700" disabled={deleteEmployee.isPending}>
                {deleteEmployee.isPending ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFaceModal} onOpenChange={(open) => { if (!open) { setShowFaceModal(false); setFaceEnrollStatus(null); } }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0">
          <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><User className="w-5 h-5" /></div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Face Enrollment</DialogTitle>
                {selectedEmployee && <p className="text-xs text-gray-500">{selectedEmployee.fullName}</p>}
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {faceEnrollStatus && (
              <div className={`p-3 rounded-lg border text-sm font-medium ${
                faceEnrollStatus.ok
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {faceEnrollStatus.msg}
              </div>
            )}
            <FaceCapture mode="enroll" onCapture={handleFaceCapture} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

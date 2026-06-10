'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, Clock, ArrowLeft, Trash2, Pencil, Printer } from 'lucide-react';
import { format } from 'date-fns/format';
import Link from 'next/link';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface Employee {
  id: string;
  fullName: string;
  employeeId: string;
}

interface AdvancePayment {
  id: string;
  amount: number;
  balanceAfter: number;
  paymentDate: string;
  notes: string;
  payroll?: {
    periodStart: string;
    periodEnd: string;
  };
}

interface Advance {
  id: string;
  employeeId: string;
  employee: Employee;
  type: string;
  totalAmount: number;
  remainingBalance: number;
  deductionAmount: number;
  status: string;
  date?: string;
  reference?: string;
  createdAt: string;
  payments?: AdvancePayment[];
}

export default function AdvancesPage() {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    deductionAmount: '',
    totalAmount: '',
    date: '',
    reference: '',
  });
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  // Form state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'CASH_ADVANCE',
    totalAmount: '',
    deductionAmount: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  });

  useEffect(() => {
    fetchAdvances();
    fetchEmployees();
  }, []);

  const fetchAdvances = async () => {
    try {
      const res = await fetch('/api/advances', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch advances');
      const data: Advance[] = await res.json();
      setAdvances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data: Employee[] = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.employeeId) {
      setError('Please select an employee');
      return;
    }

    try {
      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().then(d => d as { error?: string; details?: string });
        throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to create advance'));
      }

      toast({ title: 'Success', description: 'Advance record created successfully!' });
      setShowModal(false);
      setFormData({ 
        employeeId: '', 
        type: 'CASH_ADVANCE', 
        totalAmount: '', 
        deductionAmount: '', 
        date: new Date().toISOString().split('T')[0], 
        reference: '' 
      });
      setEmployeeSearch('');
      fetchAdvances();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/advances?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete advance');
      toast({ title: 'Success', description: 'Advance record deleted successfully!' });
      fetchAdvances();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'An unknown error occurred', variant: 'destructive' });
    }
    setDeleteConfirmId(null);
  };

  const handleEdit = (advance: Advance) => {
    let dateValue = '';
    if (advance.date) {
      const d = new Date(advance.date);
      if (!isNaN(d.getTime())) {
        dateValue = d.toISOString().split('T')[0];
      }
    }
    setEditFormData({
      id: advance.id,
      deductionAmount: advance.deductionAmount.toString(),
      totalAmount: advance.totalAmount.toString(),
      date: dateValue,
      reference: advance.reference || '',
    });
    setSelectedAdvance(advance);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editFormData.id) {
      setError('Invalid advance ID');
      return;
    }

    try {
      const res = await fetch('/api/advances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) {
        const data = await res.json().then(d => d as { error?: string });
        throw new Error(data.error || 'Failed to update advance');
      }

      toast({ title: 'Success', description: 'Advance updated successfully!' });
      setShowEditModal(false);
      setEditFormData({ id: '', deductionAmount: '', totalAmount: '', date: '', reference: '' });
      fetchAdvances();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const fetchAdvanceDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/advances?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data: Advance = await res.json();
      setSelectedAdvance(data);
      setShowDetails(true);
    } catch (err) {
      console.error('Failed to load advance details:', err);
      toast({ title: 'Error', description: 'Failed to load advance details', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'CASH_ADVANCE': return 'Cash Advance';
      case 'SSS_LOAN': return 'SSS Loan';
      case 'PAGIBIG_LOAN': return 'Pag-IBIG Loan';
      default: return type;
    }
  };

  const filteredAdvances = advances.filter(advance => {
    const searchStr = searchTerm.toLowerCase();
    return (
      advance.employee.fullName.toLowerCase().includes(searchStr) ||
      advance.employee.employeeId.toLowerCase().includes(searchStr) ||
      advance.type.toLowerCase().includes(searchStr) ||
      advance.status.toLowerCase().includes(searchStr)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/payroll" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advances Management</h1>
            <p className="text-gray-500">Manage employee loans and repayments</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5" />
          Add New Advance
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-900">All Advances</h2>
          <div className="relative w-full sm:w-64">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <Input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-medium">No advances found</p>
            {searchTerm && <p className="text-sm mt-1">Try adjusting your search</p>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type / Ref</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Deduction</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdvances.map((advance) => (
                <TableRow key={advance.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{advance.employee.fullName}</div>
                    <div className="text-xs text-gray-500">{advance.employee.employeeId}</div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    <div className="font-medium text-gray-900">{getTypeName(advance.type)}</div>
                    {advance.reference && <div className="text-xs text-gray-400">Ref: {advance.reference}</div>}
                    {advance.date && <div className="text-[10px] text-gray-400">{format(new Date(advance.date), 'MMM dd, yyyy')}</div>}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    {formatCurrency(advance.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${advance.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(advance.remainingBalance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-blue-600 font-medium">
                    {formatCurrency(advance.deductionAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={advance.status === 'ACTIVE' ? 'secondary' : 'default'}>
                      {advance.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(advance)} title="Edit deduction amount">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => fetchAdvanceDetails(advance.id)} className="text-blue-600 hover:text-blue-800 font-medium">
                      SOA / History
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(advance.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Advance Record</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            
            <div className="relative">
              <Label>Select Employee *</Label>
              <div className="relative mt-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <Input
                  type="text"
                  placeholder="Search employee name..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setShowEmployeeList(true);
                  }}
                  onFocus={() => setShowEmployeeList(true)}
                  className="pl-10"
                />
              </div>
              
              {showEmployeeList && employees.length > 0 && (
                <div className="absolute z-[100] left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {employees
                    .filter(emp => emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase()))
                    .map(emp => (
                      <Button
                        key={emp.id}
                        type="button"
                        variant="ghost"
                        className="w-full justify-start rounded-none border-b last:border-0"
                        onClick={() => {
                          setFormData({ ...formData, employeeId: emp.id });
                          setEmployeeSearch(emp.fullName);
                          setShowEmployeeList(false);
                        }}
                      >
                        {emp.fullName}
                      </Button>
                    ))
                  }
                </div>
              )}
            </div>

            <div>
              <Label>Advance Type *</Label>
              <Select 
                value={formData.type}
                onValueChange={(value) => setFormData({...formData, type: value})}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH_ADVANCE">Cash Advance</SelectItem>
                  <SelectItem value="SSS_LOAN">SSS Loan</SelectItem>
                  <SelectItem value="PAGIBIG_LOAN">Pag-IBIG Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Total Amount / Balance *</Label>
              <Input 
                type="number"
                step="0.01"
                required
                value={formData.totalAmount}
                onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Deductible Amount per Payroll *</Label>
              <Input 
                type="number"
                step="0.01"
                required
                value={formData.deductionAmount}
                onChange={(e) => setFormData({...formData, deductionAmount: e.target.value})}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date Incurred *</Label>
                <Input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Reference No.</Label>
                <Input 
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Save Advance
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SOA / History Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Statement of Account</DialogTitle>
            <p className="text-sm text-gray-500">{selectedAdvance ? `${getTypeName(selectedAdvance.type)} - ${selectedAdvance.employee.fullName}` : ''}</p>
          </DialogHeader>
          
          {selectedAdvance && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date Incurred:</span>
                  <span className="font-medium text-gray-900">
                    {selectedAdvance.date ? format(new Date(selectedAdvance.date), 'MMMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reference No:</span>
                  <span className="font-medium text-gray-900">{selectedAdvance.reference || 'None'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase">Original Amount</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(selectedAdvance.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase">Current Balance</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(selectedAdvance.remainingBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase">Deduction / Pay</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(selectedAdvance.deductionAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase">Status</p>
                  <Badge variant={selectedAdvance.status === 'ACTIVE' ? 'secondary' : 'default'}>
                    {selectedAdvance.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Payment History
                </h3>
                <div className="border rounded-lg overflow-hidden text-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Payroll Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAdvance.payments && selectedAdvance.payments.length > 0 ? (
                        selectedAdvance.payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{format(new Date(p.paymentDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              {p.payroll ? (
                                `${format(new Date(p.payroll.periodStart), 'MMM dd')} - ${format(new Date(p.payroll.periodEnd), 'MMM dd')}`
                              ) : (
                                <span className="text-gray-400 italic">Manual / Other</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">-{formatCurrency(p.amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.balanceAfter)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 italic">No payments recorded yet.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Print Statement
            </Button>
            <Button onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete this advance record? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Advance</DialogTitle>
          </DialogHeader>
          
          {selectedAdvance && (
            <form onSubmit={handleUpdate} className="space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Employee: <span className="font-medium text-gray-900">{selectedAdvance.employee.fullName}</span></p>
                <p className="text-sm text-gray-600">Current Balance: <span className="font-medium text-red-600">{formatCurrency(selectedAdvance.remainingBalance)}</span></p>
              </div>

              <div>
                <Label>Total Amount / Balance *</Label>
                <Input 
                  type="number"
                  step="0.01"
                  required
                  value={editFormData.totalAmount}
                  onChange={(e) => setEditFormData({...editFormData, totalAmount: e.target.value})}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Deductible Amount per Payroll *</Label>
                <Input 
                  type="number"
                  step="0.01"
                  required
                  value={editFormData.deductionAmount}
                  onChange={(e) => setEditFormData({...editFormData, deductionAmount: e.target.value})}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date Incurred *</Label>
                  <Input 
                    type="date"
                    required
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Reference No.</Label>
                  <Input 
                    type="text"
                    value={editFormData.reference}
                    onChange={(e) => setEditFormData({...editFormData, reference: e.target.value})}
                    placeholder="Optional"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Update
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



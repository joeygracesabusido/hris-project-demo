'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, CheckCircle, Clock, Search, Info, FileText } from 'lucide-react';
import { format } from 'date-fns/format';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useLeaves, useCreateLeave, useReviewLeave } from '@/hooks/use-leaves';
import { useEmployees } from '@/hooks/use-employees';
import { getClientCookies } from '@/lib/client-cookies';
import type { LeaveRequest, LeaveStatus, EmployeeWithUser } from '@/types';

export default function LeavesPage() {
  const { data: leaves = [], isLoading } = useLeaves();
  const { data: employees = [] } = useEmployees();
  const createLeave = useCreateLeave();
  const reviewLeave = useReviewLeave();
  const [showModal, setShowModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: 'VACATION',
    startDate: '',
    endDate: '',
    reason: '',
    daysCount: '1',
  });

  const [approvalData, setApprovalData] = useState({
    status: 'APPROVED' as LeaveStatus,
    adminNotes: '',
  });

  const [leaveBalance, setLeaveBalance] = useState({ vacation: 0, sick: 0 });

  const fetchLeaveBalance = async () => {
    try {
      const res = await fetch('/api/leave-credits/balance', { credentials: 'include' });
      const data = await res.json();
      if (data.vacation !== undefined) {
        setLeaveBalance({ vacation: data.vacation, sick: data.sick });
      }
    } catch (err) {
      console.error('Failed to fetch leave balance:', err);
    }
  };

  useEffect(() => {
    const cookies = getClientCookies();
    if (!cookies.isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    setUserRole(cookies.userRole);
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchLeaveBalance();
    }
  }, [showModal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createLeave.mutateAsync(formData);
      toast({ title: 'Success', description: 'Leave request submitted successfully!', variant: 'success' });
      setShowModal(false);
      setFormData({
        employeeId: formData.employeeId,
        leaveType: 'VACATION',
        startDate: '',
        endDate: '',
        reason: '',
        daysCount: '1',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;

    try {
      await reviewLeave.mutateAsync({
        id: selectedLeave.id,
        ...approvalData
      });
      toast({ title: 'Success', description: `Leave request ${approvalData.status.toLowerCase()} successfully!` });
      setShowApproveModal(false);
      setSelectedLeave(null);
      setApprovalData({ status: 'APPROVED', adminNotes: '' });
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'An unknown error occurred' });
    }
  };

  const isAdmin = userRole === 'ADMIN';

  const filteredLeaves = leaves.filter(leave => {
    const searchStr = searchTerm.toLowerCase();
    return (
      leave.employee?.fullName.toLowerCase().includes(searchStr) ||
      leave.employee?.employeeId.toLowerCase().includes(searchStr) ||
      leave.leaveType.toLowerCase().includes(searchStr) ||
      leave.status.toLowerCase().includes(searchStr)
    );
  });

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-500">Track and manage employee leaves</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5" />
          File Leave
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Requests</p>
              <p className="text-2xl font-bold">{filteredLeaves.filter(l => l.status === 'PENDING').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex items-center gap-4">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved Leaves</p>
              <p className="text-2xl font-bold">{filteredLeaves.filter(l => l.status === 'APPROVED').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex items-center gap-4">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Days Taken</p>
              <p className="text-2xl font-bold">
                {filteredLeaves.filter(l => l.status === 'APPROVED').reduce((acc, curr) => acc + curr.daysCount, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50">
          <CardTitle>Recent Leave Requests</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <Input
                type="text"
                placeholder="Search leaves..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-medium">No leave requests found</p>
            <p className="text-sm mt-1">{searchTerm ? 'Try adjusting your search' : 'Start by filing a leave request.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{leave.employee?.fullName}</p>
                      <p className="text-xs text-gray-500">{leave.employee?.employeeId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {leave.leaveType.toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-900">
                    {leave.daysCount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      leave.status === 'APPROVED' ? 'success' :
                      leave.status === 'REJECTED' ? 'destructive' :
                      leave.status === 'PENDING' ? 'warning' :
                      'secondary'
                    }>
                      {leave.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      onClick={() => {
                        setSelectedLeave(leave);
                        setShowApproveModal(true);
                      }}
                    >
                      <Info className="w-4 h-4" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* File Leave Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File Leave Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Available Balance</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Vacation</p>
                  <p className="text-lg font-bold text-green-600">{leaveBalance.vacation.toFixed(2)} days</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sick</p>
                  <p className="text-lg font-bold text-orange-600">{leaveBalance.sick.toFixed(2)} days</p>
                </div>
              </div>
            </div>

            {(isAdmin) && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee *</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search employee name..."
                    autoComplete="off"
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setShowEmployeeList(true);
                    }}
                    onFocus={() => setShowEmployeeList(true)}
                    className="pl-10"
                  />
                </div>
                
                {showEmployeeList && (
                  <div className="absolute z-[100] left-0 right-0 mt-1 bg-white border rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                    {employees
                      .filter(emp => emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase()))
                      .map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, employeeId: emp.id });
                            setEmployeeSearch(emp.fullName);
                            setShowEmployeeList(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 border-b last:border-0"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                            {emp.fullName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{emp.fullName}</p>
                            <p className="text-xs text-gray-500">{emp.employeeId}</p>
                          </div>
                        </button>
                      ))
                    }
                    {employees.filter(emp => emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">No employees found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
              <Select value={formData.leaveType} onValueChange={(value) => setFormData({ ...formData, leaveType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VACATION">Vacation Leave</SelectItem>
                  <SelectItem value="SICK">Sick Leave</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                  <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                  <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <Input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days Count *</label>
              <Input type="number" step="0.5" name="daysCount" value={formData.daysCount} onChange={handleChange} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <Textarea name="reason" value={formData.reason} onChange={handleChange} required rows={3} placeholder="State your reason for leave..." />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createLeave.isPending}>
                {createLeave.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review/Details Modal */}
      <Dialog open={showApproveModal} onOpenChange={(open) => { setShowApproveModal(open); if (!open) setSelectedLeave(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave Details</DialogTitle>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500 uppercase font-semibold">Employee</p>
                  <p className="text-lg font-bold">{selectedLeave.employee?.fullName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 uppercase font-semibold">Status</p>
                  <Badge variant={
                    selectedLeave.status === 'APPROVED' ? 'success' :
                    selectedLeave.status === 'REJECTED' ? 'destructive' :
                    selectedLeave.status === 'PENDING' ? 'warning' :
                    'secondary'
                  }>
                    {selectedLeave.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-semibold capitalize">{selectedLeave.leaveType.toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-semibold">{selectedLeave.daysCount} Day(s)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dates</p>
                  <p className="font-semibold">{format(new Date(selectedLeave.startDate), 'MMM dd')} - {format(new Date(selectedLeave.endDate), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Filed On</p>
                  <p className="font-semibold">{format(new Date(selectedLeave.createdAt), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex gap-3">
                <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-600 uppercase font-bold">Reason</p>
                  <p className="text-sm text-blue-900">{selectedLeave.reason}</p>
                </div>
              </div>

              {selectedLeave.adminNotes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase font-bold">Approver Notes</p>
                  <p className="text-sm text-gray-900">{selectedLeave.adminNotes}</p>
                </div>
              )}

              {selectedLeave.status === 'PENDING' && isAdmin && (
                <form onSubmit={handleReview} className="pt-4 border-t space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notes</label>
                    <Textarea 
                      value={approvalData.adminNotes}
                      onChange={(e) => setApprovalData({...approvalData, adminNotes: e.target.value})}
                      rows={2}
                      placeholder="Optional notes for approval/rejection..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      variant="outline"
                      onClick={() => setApprovalData({...approvalData, status: 'REJECTED'})}
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      disabled={reviewLeave.isPending}
                    >
                      Reject
                    </Button>
                    <Button 
                      type="submit" 
                      onClick={() => setApprovalData({...approvalData, status: 'APPROVED'})}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={reviewLeave.isPending}
                    >
                      {reviewLeave.isPending ? 'Processing...' : 'Approve'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

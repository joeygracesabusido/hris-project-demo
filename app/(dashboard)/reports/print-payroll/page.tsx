/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Printer, Calendar, CheckSquare, Square } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface PayrollRecord {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  otPay: number;
  holidayPay: number;
  status: string;
  daysWorked: number;
  employee: {
    id: string;
    fullName: string;
    employeeId: string;
    department: string;
    position: string;
    tin: string;
    sssNo: string;
    philhealthNo: string;
    pagibigNo: string;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Employee {
  id: string;
  fullName: string;
  employeeId: string;
  department: string;
  position: string;
}

export default function PrintPayrollPage() {
  const { toast } = useToast();
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accountants, setAccountants] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [selectedAccountant, setSelectedAccountant] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [mounted, setMounted] = useState(false);
  const [filterApplied, setFilterApplied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    if (typeof document === 'undefined') return;
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const storedName = decodeURIComponent(cookies.userName || '');
    
    if (storedName) {
      setCurrentUser({
        id: cookies.userId || '',
        name: storedName,
        email: cookies.userEmail || '',
        role: cookies.userRole || '',
      });
    } else if (cookies.userId) {
      fetch(`/api/current-user?userId=${cookies.userId}`)
        .then(res => res.json())
        .then(userData => {
          setCurrentUser({
            id: userData.id || '',
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role || '',
          });
        })
        .catch(err => console.error('Error fetching user:', err));
    }

    fetchEmployees(setAccountants, setManagers);
    fetchPayrollRecords();
  }, []);

  const fetchEmployees = async (accountantSetter: (employees: Employee[]) => void, managerSetter: (employees: Employee[]) => void) => {
    try {
      const res = await fetch('/api/employees', { credentials: 'include' });
      if (res.ok) {
        const data: Employee[] = await res.json();
        accountantSetter(data);
        managerSetter(data);
      }
    } catch (error) {
      console.error('Error fetching employees: ', error);
    }
  };

  const fetchPayrollRecords = async () => {
    try {
      const res = await fetch('/api/payroll', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPayrollRecords(data);
      }
    } catch (error) {
      console.error('Error fetching payroll records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    const start = periodStart ? new Date(periodStart) : null;
    const end = periodEnd ? new Date(periodEnd) : null;

    if (!start && !end) {
      setFilteredRecords(payrollRecords);
      setFilterApplied(true);
      return;
    }

    const filtered = payrollRecords.filter((record) => {
      const recordStart = new Date(record.periodStart);
      const recordEnd = new Date(record.periodEnd);

      if (start && end) {
        return recordStart <= end && recordEnd >= start;
      }

      if (start) {
        return recordEnd >= start;
      }

      if (end) {
        return recordStart <= end;
      }

      return true;
    });

    setFilteredRecords(filtered);
    setFilterApplied(true);
    setSelectedIds(new Set()); // Reset selection on new filter
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const toggleRecordSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const formatCurrency = (amount: number | string) => {
    let num: number;
    if (typeof amount === 'string') {
      num = parseFloat(amount.replace(/[+,]/g, '')) || 0;
    } else if (amount === null || amount === undefined || isNaN(amount)) {
      num = 0;
    } else {
      num = Number(amount);
    }
    
    if (isNaN(num)) {
      return '0.00';
    }
    
    const absNum = Math.abs(num);
    const formatted = absNum.toFixed(2);
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handlePrintPDF = () => {
    const recordsToPrint = filteredRecords.filter(r => selectedIds.has(r.id));
    
    if (recordsToPrint.length === 0) {
      toast({
        title: 'No records selected',
        description: 'Please select at least one record to print',
        variant: 'destructive',
      });
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'legal',
    });

    doc.deletePage(1);
    doc.addPage('legal', 'landscape');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 12;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('HRIS PHILIPPINES', pageWidth / 2, yPos, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('PAYROLL REGISTER', pageWidth / 2, yPos + 8, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Pay Period: ${periodStart ? new Date(periodStart).toLocaleDateString() : 'All'} - ${periodEnd ? new Date(periodEnd).toLocaleDateString() : 'All'}`,
      pageWidth / 2,
      yPos + 15,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 20, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    yPos = 32;

    doc.setFillColor(0, 51, 102);
    doc.rect(8, yPos, pageWidth - 16, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    const headers = ['No.', 'Employee Name', 'Department', 'Position', 'Rate/Day', 'No. of Days', 'Basic Salary', 'OT Pay', 'Holiday Pay', 'Gross Pay', 'Deductions', 'Net Pay'];
    const colWidths = [8, 35, 25, 28, 22, 16, 28, 22, 22, 26, 22, 30];
    let xPos = 10;

    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos + 5.5);
      xPos += colWidths[i];
    });

    doc.setTextColor(0, 0, 0);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    recordsToPrint.forEach((record, index) => {
      if (yPos > pageHeight - 55) {
        doc.addPage('legal', 'landscape');
        yPos = 12;

        doc.setFillColor(0, 51, 102);
        doc.rect(8, yPos, pageWidth - 16, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        xPos = 10;
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos + 5.5);
          xPos += colWidths[i];
        });

        doc.setTextColor(0, 0, 0);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      xPos = 10;

      if (index % 2 === 0) {
        doc.setFillColor(240, 245, 250);
        doc.rect(8, yPos, pageWidth - 16, 6, 'F');
      }

      doc.text(String(index + 1), xPos, yPos + 4.2);
      xPos += colWidths[0];

      const empName = record.employee.fullName.length > 22 
        ? record.employee.fullName.substring(0, 22) + '...' 
        : record.employee.fullName;
      doc.text(empName, xPos, yPos + 4.2);
      xPos += colWidths[1];

      const dept = record.employee.department.length > 16 
        ? record.employee.department.substring(0, 16) + '...' 
        : record.employee.department;
      doc.text(dept, xPos, yPos + 4.2);
      xPos += colWidths[2];

      const pos = record.employee.position.length > 17 
        ? record.employee.position.substring(0, 17) + '...' 
        : record.employee.position;
      doc.text(pos, xPos, yPos + 4.2);
      xPos += colWidths[3];

      const ratePerDay = record.daysWorked > 0 
        ? record.basicSalary / record.daysWorked 
        : record.basicSalary / 26;
      doc.text(formatCurrency(ratePerDay), xPos, yPos + 4.2);
      xPos += colWidths[4];

      doc.text(String(record.daysWorked || 0), xPos, yPos + 4.2);
      xPos += colWidths[5];

      doc.text(formatCurrency(record.basicSalary), xPos, yPos + 4.2);
      xPos += colWidths[6];

      doc.text(formatCurrency(record.otPay || 0), xPos, yPos + 4.2);
      xPos += colWidths[6];

      doc.text(formatCurrency(record.holidayPay || 0), xPos, yPos + 4.2);
      xPos += colWidths[7];

      doc.text(formatCurrency(record.grossPay), xPos, yPos + 4.2);
      xPos += colWidths[8];

      doc.setTextColor(180, 0, 0);
      doc.text(`(${formatCurrency(record.totalDeductions)})`, xPos, yPos + 4.2);
      doc.setTextColor(0, 0, 0);
      xPos += colWidths[9];

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 100, 0);
      doc.text(formatCurrency(record.netPay), xPos, yPos + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      yPos += 6;
    });

    yPos += 2;
    doc.setFillColor(220, 230, 241);
    doc.rect(8, yPos, pageWidth - 16, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    const totalBasic = recordsToPrint.reduce((sum, r) => sum + r.basicSalary, 0);
    const totalOtPay = recordsToPrint.reduce((sum, r) => sum + (r.otPay || 0), 0);
    const totalHolidayPay = recordsToPrint.reduce((sum, r) => sum + (r.holidayPay || 0), 0);
    const totalGross = recordsToPrint.reduce((sum, r) => sum + r.grossPay, 0);
    const totalDeductions = recordsToPrint.reduce((sum, r) => sum + r.totalDeductions, 0);
    const totalNet = recordsToPrint.reduce((sum, r) => sum + r.netPay, 0);

xPos = 10 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    doc.text('TOTAL:', xPos, yPos + 4.5);
    xPos += colWidths[4];
    xPos += colWidths[5];
    doc.text(formatCurrency(totalBasic), xPos, yPos + 4.5);
    xPos += colWidths[6];
    doc.text(formatCurrency(totalOtPay), xPos, yPos + 4.5);
    xPos += colWidths[7];
    doc.text(formatCurrency(totalHolidayPay), xPos, yPos + 4.5);
    xPos += colWidths[8];
    doc.text(formatCurrency(totalGross), xPos, yPos + 4.5);
    xPos += colWidths[9];
    doc.text(`(${formatCurrency(totalDeductions)})`, xPos, yPos + 4.5);
    xPos += colWidths[10];
    doc.text(formatCurrency(totalNet), xPos, yPos + 4.5);

    yPos = pageHeight - 80;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('CERTIFICATION', 10, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    yPos += 6;
    doc.setFontSize(8);
    doc.text('We hereby certify that the above payroll is correct and in accordance with the records.', 10, yPos);

    yPos += 8;

    const boxWidth = (pageWidth - 25) / 3;
    const boxHeight = 25;

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.2);
    doc.setFillColor(252, 252, 252);
    doc.rect(10, yPos, boxWidth, boxHeight, 'FD');
    doc.rect(10 + boxWidth + 5, yPos, boxWidth, boxHeight, 'FD');
    doc.rect(10 + (boxWidth + 5) * 2, yPos, boxWidth, boxHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Prepared By:', 12, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(currentUser?.name || '________________', 12, yPos + 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('HR/Admin', 12, yPos + 18);
    doc.setTextColor(0, 0, 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Checked By:', 12 + boxWidth + 5, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(selectedAccountant || '________________', 12 + boxWidth + 5, yPos + 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Accountant', 12 + boxWidth + 5, yPos + 18);
    doc.setTextColor(0, 0, 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Approved By:', 12 + (boxWidth + 5) * 2, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(selectedManager || '________________', 12 + (boxWidth + 5) * 2, yPos + 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Manager', 12 + (boxWidth + 5) * 2, yPos + 18);
    doc.setTextColor(0, 0, 0);

    yPos += boxHeight + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Date: ________________    ', 12, yPos);
    doc.text('Date: ________________    ', 12 + boxWidth + 5, yPos);
    doc.text('Date: ________________    ', 12 + (boxWidth + 5) * 2, yPos);

    const footerY = pageHeight - 6;
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('HRIS Philippines - Payroll Register', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Page 1 of ${(doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()}`, pageWidth - 12, footerY, { align: 'right' });

    const fileName = `payroll_register_${periodStart || 'all'}_${periodEnd || 'all'}.pdf`;
    doc.save(fileName);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Print Payroll</h1>
        <p className="text-gray-500">Generate and print payroll reports with signature blocks</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading payroll records...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Filter by Cut-off Period</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Period Start</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period End</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleFilter}>Filter</Button>
                </div>
              </div>
              {filterApplied && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing {filteredRecords.length} payroll record(s) 
                  {selectedIds.size > 0 && ` | ${selectedIds.size} selected for printing`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signature Block</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prepared By</Label>
                  <Input
                    type="text"
                    value={currentUser?.name || ''}
                    onChange={(e) => setCurrentUser(prev => prev ? { ...prev, name: e.target.value } : { id: '', name: e.target.value, email: '', role: '' })}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Checked By (Accountant)</Label>
                  <Select value={selectedAccountant} onValueChange={setSelectedAccountant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Accountant" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountants.map((acc) => (
                        <SelectItem key={acc.id} value={acc.fullName}>
                          {acc.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Approved By (Manager)</Label>
                  <Select value={selectedManager} onValueChange={setSelectedManager}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.fullName}>
                          {mgr.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Payroll Records</h2>
                {filteredRecords.length > 0 && (
                  <Button variant="link" size="sm" onClick={toggleSelectAll}>
                    {selectedIds.size === filteredRecords.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
              <Button
                onClick={handlePrintPDF}
                disabled={selectedIds.size === 0}
              >
                <Printer className="w-4 h-4 mr-2" />
                {selectedIds.size > 0 
                  ? `Print Selected (${selectedIds.size})` 
                  : 'Print to PDF'}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleSelectAll}>
                        {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">OT Pay</TableHead>
                    <TableHead className="text-right">Holiday Pay</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow 
                      key={record.id} 
                      className={`cursor-pointer ${selectedIds.has(record.id) ? 'bg-blue-50/50' : ''}`}
                      onClick={() => toggleRecordSelection(record.id)}
                    >
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {selectedIds.has(record.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{record.employee.fullName}</div>
                        <div className="text-sm text-muted-foreground">{record.employee.position}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(record.periodStart).toLocaleDateString()} -{' '}
                        {new Date(record.periodEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(record.basicSalary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.otPay || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.holidayPay || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.grossPay)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(record.totalDeductions)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(record.netPay)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={
                          record.status === 'PROCESSED' ? 'success' :
                          record.status === 'APPROVED' ? 'default' : 'secondary'
                        }>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {filterApplied 
                          ? "No payroll records found for the selected period" 
                          : "Please select a period and click 'Filter' to display payroll data"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// this is sample

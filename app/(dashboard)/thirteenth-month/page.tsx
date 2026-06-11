'use client';

import { useState, useEffect } from 'react';
import { Search, Calculator, FileText, Download, Filter, Users, Building2, Calendar, Wallet } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmployees } from '@/hooks/use-employees';
import { useDepartments } from '@/hooks/use-departments';
import { useSubDepartments } from '@/hooks/use-sub-departments';
import { getClientCookies } from '@/lib/client-cookies';
import type { Employee } from '@/hooks/use-employees';

const PAY_TYPES = [
  { value: 'ALL', label: 'All Employees' },
  { value: 'MONTHLY', label: 'Monthly Salary' },
  { value: 'DAILY', label: 'Daily Rate' },
];

const EMPLOYEE_STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PROBATIONARY', label: 'Probationary' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'TERMINATED', label: 'Terminated' },
];

const PAYROLL_FREQUENCIES = [
  { value: 'ALL', label: 'All Frequencies' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'SEMIMONTHLY', label: 'Semi-monthly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

export default function ThirteenthMonthPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: subDepartments = [] } = useSubDepartments();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayType, setSelectedPayType] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedSubDepartment, setSelectedSubDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState('ALL');
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const cookies = getClientCookies();
    if (!cookies.isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    setUserRole(cookies.userRole);
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayType = selectedPayType === 'ALL' || emp.payType === selectedPayType;
    const matchesDepartment = selectedDepartment === 'ALL' || (emp.subDepartment as { departmentId?: string })?.departmentId === selectedDepartment;
    const matchesSubDepartment = selectedSubDepartment === 'ALL' || emp.subDepartmentId === selectedSubDepartment;
    const matchesStatus = selectedStatus === 'ALL' || emp.employeeStatus === selectedStatus;
    const matchesFrequency = selectedFrequency === 'ALL' || emp.payrollFrequency === selectedFrequency;
    const matchesActive = !showOnlyActive || emp.isActive;

    return matchesSearch && matchesPayType && matchesDepartment && matchesSubDepartment &&
           matchesStatus && matchesFrequency && matchesActive;
  });

  const TAX_EXEMPT_THRESHOLD = 90000;

  interface ThirteenthMonthPayResult {
    grossPay: number
    taxableAmount: number
    nonTaxableAmount: number
    monthsWorked: number
    monthlySalary: number
  }

  const calculateThirteenthMonthPay = (employee: Employee): ThirteenthMonthPayResult => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const hireDate = new Date(employee.hireDate);
    const hireYear = hireDate.getFullYear();
    const hireMonth = hireDate.getMonth();

    let monthsWorked = 0;

    if (hireYear === currentYear) {
      monthsWorked = (currentDate.getMonth() - hireMonth) + 1;
    } else if (hireYear < currentYear) {
      monthsWorked = 12;
    }

    monthsWorked = Math.max(0, Math.min(12, monthsWorked));

    let monthlySalary = 0;
    if (employee.payType === 'MONTHLY') {
      monthlySalary = employee.basicSalary || 0;
    } else if (employee.payType === 'DAILY') {
      monthlySalary = (employee.dailyRate || 0) * 26;
    }

    const totalBasicSalary = monthlySalary * monthsWorked;
    const grossPay = totalBasicSalary / 12;

    const taxableAmount = Math.max(0, grossPay - TAX_EXEMPT_THRESHOLD);
    const nonTaxableAmount = Math.min(grossPay, TAX_EXEMPT_THRESHOLD);

    return { grossPay, taxableAmount, nonTaxableAmount, monthsWorked, monthlySalary };
  };

  const getTotalThirteenthMonthPay = () => {
    return filteredEmployees.reduce((total, emp) => {
      return total + calculateThirteenthMonthPay(emp).grossPay;
    }, 0);
  };

  const getTotalTaxable = () => {
    return filteredEmployees.reduce((total, emp) => {
      return total + calculateThirteenthMonthPay(emp).taxableAmount;
    }, 0);
  };

  const getTotalNonTaxable = () => {
    return filteredEmployees.reduce((total, emp) => {
      return total + calculateThirteenthMonthPay(emp).nonTaxableAmount;
    }, 0);
  };

  const getEmployeeCount = () => filteredEmployees.length;

  const exportToCSV = () => {
    const headers = [
      'Employee ID', 'Name', 'Department', 'Position', 'Pay Type',
      'Monthly Salary', 'Months Worked', 'Gross 13th Month Pay',
      'Non-Taxable (≤₱90K)', 'Taxable Amount', 'Status'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => {
        const result = calculateThirteenthMonthPay(emp);
        return [
          emp.employeeId,
          `"${emp.fullName}"`,
          emp.subDepartment?.name || '-',
          emp.position,
          emp.payType,
          `₱${result.monthlySalary.toLocaleString()}`,
          result.monthsWorked,
          `₱${result.grossPay.toLocaleString()}`,
          `₱${result.nonTaxableAmount.toLocaleString()}`,
          `₱${result.taxableAmount.toLocaleString()}`,
          emp.employeeStatus
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `13th-month-pay-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">13th Month Pay Calculator</h1>
          <p className="text-gray-500">DOLE-compliant calculation per Presidential Decree No. 851</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">DOLE-Compliant Calculation (PD 851)</p>
          <p>13th Month Pay = Total Basic Salary Earned During the Year ÷ 12 months.</p>
          <p className="mt-1">
            <strong>Inclusions:</strong> Fixed monthly salary, basic wage for daily workers (×26 days).
            <strong> Exclusions:</strong> Overtime, holiday pay, night differential, allowances, bonuses.
          </p>
          <p className="mt-1">
            <strong>Tax:</strong> First ₱90,000 of 13th month pay + bonuses is tax-exempt per TRAIN Law.
            Any excess is subject to withholding tax.
          </p>
          <p className="mt-1 text-blue-600">
            <strong>Deadline:</strong> On or before December 24 each year.
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Coverage:</strong> All rank-and-file employees who worked at least 1 month.
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filter Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Pay Type</Label>
              <Select value={selectedPayType} onValueChange={setSelectedPayType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pay type" />
                </SelectTrigger>
                <SelectContent>
                  {PAY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Sub-Department</Label>
              <Select value={selectedSubDepartment} onValueChange={setSelectedSubDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sub-Departments</SelectItem>
                  {subDepartments.map(sd => (
                    <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Payroll Frequency</Label>
              <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {PAYROLL_FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Active Only</Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="active-only"
                  checked={showOnlyActive}
                  onCheckedChange={(checked) => setShowOnlyActive(checked as boolean)}
                />
                <Label htmlFor="active-only" className="text-sm font-normal">Show only active employees</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Clear Filters</Label>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setSelectedPayType('ALL');
                setSelectedDepartment('ALL');
                setSelectedSubDepartment('ALL');
                setSelectedStatus('ALL');
                setSelectedFrequency('ALL');
                setShowOnlyActive(true);
              }} className="w-full h-10">
                Clear All Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{getEmployeeCount()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total 13th Month Pay</p>
                <p className="text-2xl font-bold text-green-600">₱{getTotalThirteenthMonthPay().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Non-Taxable (≤₱90K)</p>
                <p className="text-2xl font-bold text-blue-600">₱{getTotalNonTaxable().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average per Employee</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₱{getEmployeeCount() > 0 ? (getTotalThirteenthMonthPay() / getEmployeeCount()).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Year</p>
                <p className="text-2xl font-bold text-orange-600">{new Date().getFullYear()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" /> 13th Month Pay Calculation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Loading employee data...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No employees found matching the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">Employee</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">Department</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">Pay Type</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">Monthly Salary</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">Months Worked</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">13th Month Pay</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">Non-Taxable</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">Taxable</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const result = calculateThirteenthMonthPay(employee);

                    return (
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
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600">
                              {employee.subDepartment?.name || '-'}
                            </span>
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
                              ₱{result.monthlySalary.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-medium">
                              {employee.payType === 'DAILY' ? '26 days/month' : 'per month'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-600">{result.monthsWorked} months</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-green-600">₱{result.grossPay.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600">₱{result.nonTaxableAmount.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900">
                            {result.taxableAmount > 0
                              ? `₱${result.taxableAmount.toLocaleString()}`
                              : <span className="text-gray-400">-</span>}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={
                              employee.employeeStatus === 'REGULAR' ? 'success' :
                              employee.employeeStatus === 'PROBATIONARY' ? 'warning' :
                              employee.employeeStatus === 'ACTIVE' ? 'success' :
                              employee.employeeStatus === 'INACTIVE' ? 'secondary' :
                              'outline'
                            }>
                              {employee.employeeStatus || 'PROBATIONARY'}
                            </Badge>
                            <Badge variant={employee.isActive ? 'success' : 'secondary'} className="text-[10px]">
                              {employee.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Search, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGovInfo } from '@/hooks/use-gov-info';
import { useDepartments } from '@/hooks/use-departments';
import { getClientCookies } from '@/lib/client-cookies';
import { ADMIN_ROLES } from '@/lib/auth-shared';

export default function GovernmentInfoPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const cookies = getClientCookies();
    if (!cookies.isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    setUserRole(cookies.userRole || '');
  }, []);

  const isAdminOrHRorManager = (ADMIN_ROLES as readonly string[]).includes(userRole);

  const { data: govInfoData, isLoading: loadingGovInfo, error: govInfoError } = useGovInfo(
    departmentFilter === 'all' ? undefined : departmentFilter
  );

  if (govInfoError) {
    return <p className="text-destructive">Failed to load government info</p>;
  }
  const { data: departments, isLoading: loadingDepts } = useDepartments();

  const filteredData = govInfoData?.filter((emp) =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadingGovInfo || loadingDepts) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Loading government info...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-8 w-8" /> Government Info
        </h1>
        <p className="text-muted-foreground mt-1">
          Employee government IDs and bank details
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Filters */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {isAdminOrHRorManager && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                {isAdminOrHRorManager && (
                  <>
                    <TableHead>SSS No.</TableHead>
                    <TableHead>PhilHealth No.</TableHead>
                    <TableHead>Pag-IBIG No.</TableHead>
                    <TableHead>TIN</TableHead>
                    <TableHead>Bank Name</TableHead>
                    <TableHead>Bank Account No.</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData?.map((emp) => (
                <TableRow key={emp.employeeId}>
                  <TableCell className="font-mono">{emp.employeeId}</TableCell>
                  <TableCell>{emp.fullName}</TableCell>
                  <TableCell>{emp.subDepartment?.department?.name || '—'}</TableCell>
                  {isAdminOrHRorManager && (
                    <>
                      <TableCell>{emp.sssNo || '—'}</TableCell>
                      <TableCell>{emp.philhealthNo || '—'}</TableCell>
                      <TableCell>{emp.pagibigNo || '—'}</TableCell>
                      <TableCell>{emp.tin || '—'}</TableCell>
                      <TableCell>{emp.bankName || '—'}</TableCell>
                      <TableCell>{emp.bankAccountNo || '—'}</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

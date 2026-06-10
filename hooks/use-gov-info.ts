import { useQuery } from '@tanstack/react-query';

export interface GovInfoEmployee {
  employeeId: string;
  fullName: string;
  sssNo: string;
  philhealthNo: string;
  pagibigNo: string;
  tin: string;
  bankName: string | null;
  bankAccountNo: string | null;
  subDepartment?: {
    name: string;
    department: { name: string };
  };
}

async function fetchGovInfo(departmentId?: string): Promise<GovInfoEmployee[]> {
  const url = departmentId
    ? `/api/gov-info?departmentId=${departmentId}`
    : '/api/gov-info';
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(data.error || 'Failed to fetch government info');
  return data;
}

export function useGovInfo(departmentId?: string) {
  return useQuery({
    queryKey: ['gov-info', departmentId],
    queryFn: () => fetchGovInfo(departmentId),
  });
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, DollarSign, Clock, FileText, LogOut, Menu, UserCheck, CalendarDays, Timer, Wallet, Settings, Calendar, Award, ChevronDown, Printer, Building2, Building, FolderKanban, List, ShieldCheck, Calculator } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  iconColor?: string;
  adminOnly?: boolean;
  subItems?: NavItem[];
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-sky-500' },
  {
    href: '/master-list',
    label: 'Master List',
    icon: List,
    iconColor: 'text-blue-500',
    subItems: [
      { href: '/employees', label: 'Employees', icon: Users, iconColor: 'text-blue-400', adminOnly: true },
      { href: '/gov-info', label: 'Government Info', icon: ShieldCheck, iconColor: 'text-blue-400' },
      {
        label: 'Approvers',
        href: '/approver',
        icon: ShieldCheck,
        adminOnly: true,
      },
    ],
  },
  {
    href: '/hris',
    label: 'HRIS',
    icon: Users,
    iconColor: 'text-emerald-500',
    subItems: [
      { href: '/users', label: 'Users', icon: UserCheck, iconColor: 'text-emerald-400', adminOnly: true },
      { href: '/schedules', label: 'Shift Schedule', icon: CalendarDays, iconColor: 'text-emerald-400' },
      { href: '/leave-credits', label: 'Leave Credits', icon: Award, iconColor: 'text-emerald-400' },
      { href: '/leaves', label: 'Leaves', icon: CalendarDays, iconColor: 'text-emerald-400' },
      { href: '/overtime', label: 'Overtime', icon: Timer, iconColor: 'text-emerald-400' },
      { href: '/time-logs', label: 'Time Logs', icon: Clock, iconColor: 'text-emerald-400' },
      { href: '/holidays', label: 'Holidays', icon: Calendar, iconColor: 'text-emerald-400', adminOnly: true },
      { href: '/departments', label: 'Departments', icon: Building2, iconColor: 'text-emerald-400' },
      { href: '/sub-departments', label: 'Sub-Departments', icon: Building, iconColor: 'text-emerald-400' },
      { href: '/projects', label: 'Projects', icon: FolderKanban, iconColor: 'text-emerald-400' },
    ],
  },
  {
    href: '/payroll',
    label: 'Payroll',
    icon: DollarSign,
    iconColor: 'text-violet-500',
    subItems: [
      { href: '/payroll', label: 'Payroll', icon: DollarSign, iconColor: 'text-violet-400' },
      { href: '/payroll/advances', label: 'Advances', icon: Wallet, iconColor: 'text-violet-400' },
      { href: '/payroll/advances-summary', label: 'Advances Summary', icon: DollarSign, iconColor: 'text-violet-400' },
      { href: '/thirteenth-month', label: '13th Month Pay', icon: Calculator, iconColor: 'text-violet-400' },
    ],
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: FileText,
    iconColor: 'text-orange-500',
    adminOnly: true,
    subItems: [
      { href: '/reports/print-payroll', label: 'Print Payroll', icon: Printer, iconColor: 'text-orange-400' },
    ],
  },
  { href: '/settings', label: 'Settings', icon: Settings, iconColor: 'text-slate-500', adminOnly: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [masterListOpen, setMasterListOpen] = useState(false);
  const [hrisOpen, setHrisOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    setMounted(true);
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    if (cookies.isLoggedIn !== 'true') {
      window.location.href = '/login';
    }
    setUserRole(cookies.userRole || '');
  }, []);

  const filteredNavItems = navItems.filter((item) => {
    if (item.subItems) {
      if (item.adminOnly && userRole !== 'ADMIN' && userRole !== 'HR') {
        return false;
      }
      return true;
    }
    if (userRole === 'EMPLOYEE') {
      return !['/users', '/reports', '/settings'].includes(item.href);
    }
    if (item.adminOnly && userRole !== 'ADMIN' && userRole !== 'HR') {
      return false;
    }
    return true;
  });

  if (!mounted) return null;

  const renderNavContent = () => filteredNavItems.map((item) => {
    const Icon = item.icon;

    if (item.subItems) {
      const isMasterListActive = pathname.startsWith('/employees') ||
        pathname.startsWith('/departments') ||
        pathname.startsWith('/sub-departments') ||
        pathname.startsWith('/projects') ||
        pathname.startsWith('/gov-info') ||
        pathname.startsWith('/approver');
      const isHrisActive = pathname.startsWith('/users') || pathname.startsWith('/schedules') || pathname.startsWith('/leave-credits') || pathname.startsWith('/leaves') || pathname.startsWith('/overtime') || pathname.startsWith('/time-logs') || pathname.startsWith('/holidays') || pathname.startsWith('/departments') || pathname.startsWith('/sub-departments') || pathname.startsWith('/projects');
      const isPayrollActive = pathname.startsWith('/payroll');
      const isReportsActive = pathname.startsWith('/reports');
      
      let isActive = false;
      let open: boolean = false;
      let setOpen: (val: boolean) => void = () => {};
      
      if (item.href === '/master-list') {
        isActive = isMasterListActive;
        open = masterListOpen;
        setOpen = setMasterListOpen;
      } else if (item.href === '/hris') {
        isActive = isHrisActive;
        open = hrisOpen;
        setOpen = setHrisOpen;
      } else if (item.href === '/payroll') {
        isActive = isPayrollActive;
        open = payrollOpen;
        setOpen = setPayrollOpen;
      } else if (item.href === '/reports') {
        isActive = isReportsActive;
        open = reportsOpen;
        setOpen = setReportsOpen;
      }

      return (
        <div key={item.href}>
          <Button
            variant="ghost"
            onClick={() => setOpen(!open)}
            className={`w-full justify-between mb-1 hover:bg-white/10 hover:text-white transition-colors ${isActive ? 'bg-white/10 text-white font-medium' : 'text-slate-400'}`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.iconColor}`} />
              <span>{item.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} text-slate-500`} />
          </Button>
          {open && (item.subItems as NavItem[]).filter((subItem) => {
            if (subItem.adminOnly && userRole !== 'ADMIN' && userRole !== 'HR') {
              return false;
            }
            return true;
          }).map((subItem) => {
            const SubIcon = subItem.icon;
            const isSubActive = pathname === subItem.href;
            return (
              <Button
                key={subItem.href}
                variant="ghost"
                asChild
                className={`w-full justify-start pl-10 mb-1 hover:bg-white/10 hover:text-white transition-colors ${isSubActive ? 'bg-white/10 text-white font-medium' : 'text-slate-400'}`}
              >
                <Link href={subItem.href} onClick={() => setSidebarOpen(false)}>
                  <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-white' : subItem.iconColor}`} />
                  <span>{subItem.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      );
    }

    const isActive = pathname === item.href;
    return (
      <Button
        key={item.href}
        variant="ghost"
        asChild
        className={`w-full justify-start mb-1 hover:bg-white/10 hover:text-white transition-colors ${isActive ? 'bg-white/10 text-white font-medium' : 'text-slate-400'}`}
      >
        <Link href={item.href} onClick={() => setSidebarOpen(false)}>
          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.iconColor}`} />
          <span>{item.label}</span>
        </Link>
      </Button>
    );
  });

  const handleLogout = () => {
    document.cookie = 'isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = 'userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = 'userName=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-slate-950 text-foreground">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card shadow-soft dark:shadow-soft-dark border-b px-4 py-3 flex items-center justify-between text-card-foreground">
          <span className="font-bold text-lg">HRIS Philippines</span>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
        </div>

        {/* Mobile Sheet sidebar */}
        <SheetContent side="left" className="w-64 p-0 flex flex-col bg-slate-950 text-slate-400 border-r-slate-900">
          <div className="p-6">
            <h1 className="text-xl font-bold text-white">HRIS</h1>
            <p className="text-sm text-slate-500">Philippines</p>
          </div>

          <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar">
            {renderNavContent()}
          </nav>

          <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-900">
            <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-3 flex-1 justify-start hover:bg-white/10 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </Button>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-slate-950 text-slate-400 border-r border-slate-900 hidden lg:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">HRIS</h1>
          <p className="text-sm text-slate-500">Philippines</p>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar">
          {renderNavContent()}
        </nav>

        <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-900">
          <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-3 flex-1 justify-start hover:bg-white/10 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 p-6 pt-20 lg:pt-6">
        {children}
      </main>
    </div>
  );
}

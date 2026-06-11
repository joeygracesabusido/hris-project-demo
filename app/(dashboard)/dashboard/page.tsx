'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Users, Clock, TrendingUp, UserMinus, CheckCircle,
  AlertCircle, DollarSign, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Building2, Calendar,
  Activity, UserCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { getClientCookies } from '@/lib/client-cookies';
import { cn } from '@/lib/utils';

const ATTENDANCE_COLORS = {
  present: '#10B981',
  onLeave: '#F59E0B',
  absent: '#EF4444',
};

const DEPT_BAR_COLORS = ['#2563EB', '#0D9488', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#E11D48'];

interface MiniStatCardProps {
  label: string
  value: string
  icon: React.ElementType
  trend?: { value: string; isUp: boolean }
  color: string
  subtitle?: string
}

function MiniStatCard({ label, value, icon: Icon, trend, color, subtitle }: MiniStatCardProps) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend.isUp ? 'text-emerald-600' : 'text-red-500'
              )}>
                {trend.isUp
                  ? <ArrowUpRight className="w-3 h-3" />
                  : <ArrowDownRight className="w-3 h-3" />
                }
                {trend.value}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            'p-2.5 rounded-xl',
            color === 'blue' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
            color === 'green' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
            color === 'amber' && 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
            color === 'purple' && 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className={cn(
          'absolute bottom-0 left-0 right-0 h-0.5',
          color === 'blue' && 'bg-blue-500',
          color === 'green' && 'bg-emerald-500',
          color === 'amber' && 'bg-amber-500',
          color === 'purple' && 'bg-purple-500',
        )} />
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-gray-600 dark:text-gray-400">
          {entry.name}: <span className="font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const cookies = getClientCookies();
    setUserRole(cookies.userRole);
  }, []);

  const absentBarData = useMemo(() => {
    if (!stats?.absentPerDepartment) return [];
    return stats.absentPerDepartment.map((d, i) => ({
      name: d.name,
      Absent: d.absent,
      Present: d.total - d.absent,
      total: d.total,
      fill: DEPT_BAR_COLORS[i % DEPT_BAR_COLORS.length],
    }));
  }, [stats]);

  const attendancePieData = useMemo(() => {
    if (!stats) return [];
    const unaccounted = Math.max(0, (stats.totalEmployees || 0) - (stats.presentToday || 0) - (stats.onLeaveToday || 0));
    return [
      { name: 'Present', value: stats.presentToday || 0, color: ATTENDANCE_COLORS.present },
      { name: 'On Leave', value: stats.onLeaveToday || 0, color: ATTENDANCE_COLORS.onLeave },
      { name: 'Unaccounted', value: unaccounted, color: ATTENDANCE_COLORS.absent },
    ].filter(d => d.value > 0);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ======== EMPLOYEE VIEW ========
  if (userRole === 'EMPLOYEE' && stats?.personalStats) {
    const ps = stats.personalStats;
    const deptName = ps.subDepartment || ps.department || 'Unassigned';
    const statusLabel = ps.isPresent ? 'Present Today'
      : ps.isOnLeave ? 'On Leave'
      : 'Not Yet Clocked In';
    const statusColor = ps.isPresent ? 'emerald'
      : ps.isOnLeave ? 'amber'
      : 'red';
    const StatusIcon = ps.isPresent ? CheckCircle
      : ps.isOnLeave ? DollarSign
      : AlertCircle;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {ps.employeeName}!</p>
        </div>

        <Card className="overflow-hidden border-0 shadow-sm">
          <div className={cn(
            'p-6',
            statusColor === 'emerald' && 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
            statusColor === 'amber' && 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
            statusColor === 'red' && 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30',
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-3.5 rounded-2xl shadow-sm',
                  statusColor === 'emerald' && 'bg-emerald-500',
                  statusColor === 'amber' && 'bg-amber-500',
                  statusColor === 'red' && 'bg-red-500',
                )}>
                  <StatusIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{statusLabel}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{deptName}</p>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Status</p>
                <p className="font-semibold">{statusLabel}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Department</p>
                <p className="font-semibold">{deptName}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{ps.isPresent ? 'Clocked In' : ps.isOnLeave ? 'Leave Status' : 'Action Needed'}</p>
                <p className="font-semibold">{ps.isPresent ? 'Yes' : ps.isOnLeave ? 'Approved' : 'Clock in now'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ======== ADMIN VIEW ========
  const absentCount = (stats?.totalEmployees || 0) - (stats?.presentToday || 0);
  const presentRate = stats?.totalEmployees ? Math.round(((stats.presentToday || 0) / stats.totalEmployees) * 100) : 0;
  const unaccounted = Math.max(0, (stats?.totalEmployees || 0) - (stats?.presentToday || 0) - (stats?.onLeaveToday || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Attendance overview for {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStatCard
          label="Total Employees"
          value={stats?.totalEmployees.toString() || '0'}
          icon={Users}
          subtitle="Active workforce"
          color="blue"
        />
        <MiniStatCard
          label="Present Today"
          value={stats?.presentToday.toString() || '0'}
          icon={Clock}
          trend={{ value: `${presentRate}% attendance rate`, isUp: presentRate > 75 }}
          subtitle={`${unaccounted} unaccounted`}
          color="green"
        />
        <MiniStatCard
          label="On Leave"
          value={stats?.onLeaveToday.toString() || '0'}
          icon={UserMinus}
          subtitle="Approved leaves today"
          color="amber"
        />
        <MiniStatCard
          label="Absent / Unaccounted"
          value={absentCount.toString()}
          icon={TrendingUp}
          trend={{ value: `${absentCount > 0 ? Math.round((absentCount / (stats?.totalEmployees || 1)) * 100) + '% absent rate' : 'Perfect attendance'}`, isUp: absentCount === 0 }}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Absenteeism by Department
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {absentBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={absentBarData} barGap={4} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={absentBarData.length > 4 ? -20 : 0}
                    textAnchor={absentBarData.length > 4 ? 'end' : 'middle'}
                    height={absentBarData.length > 4 ? 60 : 30}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Absent" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {absentBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No department data available.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Attendance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {attendancePieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <RePieChart>
                    <Pie
                      data={attendancePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {attendancePieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-xs text-muted-foreground">{value}</span>
                      )}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-3 w-full mt-2">
                  {attendancePieData.map(entry => (
                    <div key={entry.name} className="text-center">
                      <p className="text-lg font-bold" style={{ color: entry.color }}>{entry.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{entry.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No attendance data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Department Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Department</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Total</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Present</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Absent</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats?.absentPerDepartment.map((dept, i) => {
                  const rate = dept.total > 0 ? Math.round(((dept.total - dept.absent) / dept.total) * 100) : 0;
                  return (
                    <tr key={dept.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: DEPT_BAR_COLORS[i % DEPT_BAR_COLORS.length] }}
                          />
                          <span className="font-medium">{dept.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{dept.total}</td>
                      <td className="text-right py-3 px-2 text-emerald-600 font-medium">{dept.total - dept.absent}</td>
                      <td className="text-right py-3 px-2 text-red-500 font-medium">{dept.absent}</td>
                      <td className="text-right py-3 px-2">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          rate >= 90 && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
                          rate >= 70 && rate < 90 && 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
                          rate < 70 && 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
                        )}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!stats?.absentPerDepartment || stats.absentPerDepartment.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No department data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

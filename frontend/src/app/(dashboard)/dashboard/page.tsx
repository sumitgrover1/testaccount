'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, CalendarCheck, PackageSearch } from 'lucide-react';
import * as dashboardApi from '@/lib/api/dashboard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/format';

export default function DashboardPage() {
  const leads = useQuery({ queryKey: ['dashboard', 'leads'], queryFn: () => dashboardApi.getLeadsSummary({}) });
  const revenue = useQuery({ queryKey: ['dashboard', 'revenue'], queryFn: () => dashboardApi.getRevenueSummary({}) });
  const appointments = useQuery({
    queryKey: ['dashboard', 'appointments'],
    queryFn: () => dashboardApi.getAppointmentStats({}),
  });
  const inventory = useQuery({ queryKey: ['dashboard', 'inventory'], queryFn: () => dashboardApi.getInventoryOverview() });
  const topTreatments = useQuery({
    queryKey: ['dashboard', 'top-treatments'],
    queryFn: () => dashboardApi.getTopTreatments({ limit: 8 }),
  });
  const counselors = useQuery({
    queryKey: ['dashboard', 'counselors'],
    queryFn: () => dashboardApi.getCounselorPerformance({}),
  });
  const campaigns = useQuery({
    queryKey: ['dashboard', 'campaigns'],
    queryFn: () => dashboardApi.getCampaignPerformance({}),
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Clinic performance at a glance" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Leads today"
          value={leads.data?.dailyLeads ?? '—'}
          icon={Users}
          hint={`${leads.data?.conversionRatePercent ?? 0}% overall conversion`}
        />
        <StatCard
          label="Total revenue"
          value={revenue.data ? formatCurrency(revenue.data.totalRevenue) : '—'}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="Appointments"
          value={appointments.data?.total ?? '—'}
          icon={CalendarCheck}
          hint={`${appointments.data?.noShowRatePercent ?? 0}% no-show rate`}
          accent="amber"
        />
        <StatCard
          label="Inventory value"
          value={inventory.data ? formatCurrency(inventory.data.totalValueAtCost) : '—'}
          icon={PackageSearch}
          hint={`${inventory.data?.lowStockAlerts.length ?? 0} low-stock alerts`}
          accent="rose"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top treatments by revenue" />
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTreatments.data ?? []} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Low stock alerts" />
          <CardBody className="p-0">
            <Table
              columns={[
                { header: 'Product', accessor: (r) => r.name },
                { header: 'In stock', accessor: (r) => r.totalStock },
                { header: 'Minimum', accessor: (r) => r.minimumStock },
              ]}
              rows={inventory.data?.lowStockAlerts ?? []}
              keyField={(r) => r.id}
              isLoading={inventory.isLoading}
              emptyMessage="No low-stock products"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Counselor performance" />
          <CardBody className="p-0">
            <Table
              columns={[
                { header: 'Counselor', accessor: (r) => r.name },
                { header: 'Leads', accessor: (r) => r.totalLeads },
                { header: 'Converted', accessor: (r) => r.convertedLeads },
                { header: 'Conversion', accessor: (r) => `${r.conversionRatePercent}%` },
              ]}
              rows={counselors.data ?? []}
              keyField={(r) => r.counselorId}
              isLoading={counselors.isLoading}
              emptyMessage="No counselor data yet"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Campaign performance" />
          <CardBody className="p-0">
            <Table
              columns={[
                { header: 'Campaign', accessor: (r) => r.name },
                { header: 'Leads', accessor: (r) => r.totalLeads },
                { header: 'Converted', accessor: (r) => r.convertedLeads },
                { header: 'Spend', accessor: (r) => formatCurrency(r.spend) },
                {
                  header: 'ROI',
                  accessor: (r) => (r.roiPercent === null ? '—' : <Badge status={r.roiPercent >= 0 ? 'ACTIVE' : 'CANCELLED'} label={`${r.roiPercent}%`} />),
                },
              ]}
              rows={campaigns.data ?? []}
              keyField={(r) => r.campaignId}
              isLoading={campaigns.isLoading}
              emptyMessage="No active campaigns"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

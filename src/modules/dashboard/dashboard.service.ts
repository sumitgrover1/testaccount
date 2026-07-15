import { AppointmentStatus, InvoiceItemType, LeadStatus, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { listLowStockProducts } from '../inventory/product.service';
import type { DateRangeQuery, TopTreatmentsQuery } from './dashboard.validation';

function dateFilter(query: DateRangeQuery) {
  if (!query.from && !query.to) return undefined;
  return {
    ...(query.from ? { gte: query.from } : {}),
    ...(query.to ? { lte: query.to } : {}),
  };
}

export async function getLeadsSummary(query: DateRangeQuery) {
  const createdAt = dateFilter(query);
  const where = createdAt ? { createdAt } : {};

  const [total, converted, bySourceRaw] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
    prisma.lead.groupBy({ by: ['source'], where, _count: { _all: true } }),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dailyLeads = await prisma.lead.count({ where: { createdAt: { gte: todayStart } } });

  return {
    dailyLeads,
    totalLeads: total,
    convertedLeads: converted,
    conversionRatePercent: total > 0 ? Math.round((converted / total) * 10000) / 100 : 0,
    bySource: bySourceRaw.map((row) => ({ source: row.source, count: row._count._all })),
  };
}

export async function getRevenueSummary(query: DateRangeQuery) {
  const paidAt = dateFilter(query);
  const payments = await prisma.payment.findMany({
    where: paidAt ? { paidAt } : {},
    select: { amount: true },
  });
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const invoiceItemWhere = paidAt ? { invoice: { createdAt: paidAt } } : {};

  const [treatmentItems, packageItems] = await Promise.all([
    prisma.invoiceItem.findMany({
      where: { itemType: InvoiceItemType.TREATMENT, ...invoiceItemWhere },
      select: { lineTotal: true, treatmentId: true, treatment: { select: { name: true } } },
    }),
    prisma.invoiceItem.findMany({
      where: { itemType: InvoiceItemType.PACKAGE, ...invoiceItemWhere },
      select: { lineTotal: true, packageId: true, package: { select: { name: true } } },
    }),
  ]);

  const treatmentRevenue = treatmentItems.reduce((sum, i) => sum + Number(i.lineTotal), 0);
  const packageRevenue = packageItems.reduce((sum, i) => sum + Number(i.lineTotal), 0);

  // Doctor revenue is attributed via the enrollment a treatment line item
  // belongs to (an invoice item created directly, with no enrollmentId, has
  // no doctor to attribute — e.g. a standalone product sale).
  const enrollmentItems = await prisma.invoiceItem.findMany({
    where: { enrollmentId: { not: null }, ...invoiceItemWhere },
    select: {
      lineTotal: true,
      enrollment: {
        select: { assignedDoctor: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  const revenueByDoctor = new Map<string, { doctorId: string; name: string; revenue: number }>();
  for (const item of enrollmentItems) {
    const doctor = item.enrollment?.assignedDoctor;
    if (!doctor) continue;
    const entry = revenueByDoctor.get(doctor.id) ?? {
      doctorId: doctor.id,
      name: `${doctor.firstName} ${doctor.lastName}`,
      revenue: 0,
    };
    entry.revenue += Number(item.lineTotal);
    revenueByDoctor.set(doctor.id, entry);
  }

  return {
    totalRevenue,
    treatmentRevenue,
    packageRevenue,
    revenueByDoctor: Array.from(revenueByDoctor.values()).sort((a, b) => b.revenue - a.revenue),
  };
}

export async function getAppointmentStats(query: DateRangeQuery) {
  const scheduledDate = dateFilter(query);
  const where = scheduledDate ? { scheduledDate } : {};

  const grouped = await prisma.appointment.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  const noShow = grouped.find((row) => row.status === AppointmentStatus.NO_SHOW)?._count._all ?? 0;

  return {
    total,
    byStatus: grouped.map((row) => ({ status: row.status, count: row._count._all })),
    noShowCount: noShow,
    noShowRatePercent: total > 0 ? Math.round((noShow / total) * 10000) / 100 : 0,
  };
}

export async function getInventoryValue() {
  const batches = await prisma.productBatch.findMany({
    select: { currentStock: true, purchasePrice: true },
  });
  const totalValue = batches.reduce(
    (sum, b) => sum + Number(b.currentStock) * Number(b.purchasePrice),
    0,
  );
  return { totalValueAtCost: Math.round(totalValue * 100) / 100 };
}

export async function getLowStockAlerts() {
  const products = await listLowStockProducts();
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    totalStock: p.totalStock,
    minimumStock: Number(p.minimumStock),
  }));
}

export async function getTopTreatments(query: TopTreatmentsQuery) {
  const createdAt = dateFilter(query);
  const items = await prisma.invoiceItem.findMany({
    where: {
      itemType: InvoiceItemType.TREATMENT,
      ...(createdAt ? { invoice: { createdAt } } : {}),
    },
    select: { lineTotal: true, treatmentId: true, treatment: { select: { name: true } } },
  });

  const byTreatment = new Map<
    string,
    { treatmentId: string; name: string; revenue: number; count: number }
  >();
  for (const item of items) {
    if (!item.treatmentId || !item.treatment) continue;
    const entry = byTreatment.get(item.treatmentId) ?? {
      treatmentId: item.treatmentId,
      name: item.treatment.name,
      revenue: 0,
      count: 0,
    };
    entry.revenue += Number(item.lineTotal);
    entry.count += 1;
    byTreatment.set(item.treatmentId, entry);
  }

  return Array.from(byTreatment.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, query.limit);
}

export async function getCounselorPerformance(query: DateRangeQuery) {
  const createdAt = dateFilter(query);
  const counselors = await prisma.user.findMany({
    where: { role: Role.COUNSELOR, isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });

  return Promise.all(
    counselors.map(async (counselor) => {
      const where = { assignedCounselorId: counselor.id, ...(createdAt ? { createdAt } : {}) };
      const [totalLeads, convertedLeads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
      ]);
      return {
        counselorId: counselor.id,
        name: `${counselor.firstName} ${counselor.lastName}`,
        totalLeads,
        convertedLeads,
        conversionRatePercent:
          totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 10000) / 100 : 0,
      };
    }),
  );
}

export async function getCampaignPerformance(query: DateRangeQuery) {
  const createdAt = dateFilter(query);
  const campaigns = await prisma.campaign.findMany({ where: { isActive: true } });

  return Promise.all(
    campaigns.map(async (campaign) => {
      const where = { campaignId: campaign.id, ...(createdAt ? { createdAt } : {}) };
      const [totalLeads, convertedLeads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
      ]);

      const spend = Number(campaign.totalSpend ?? 0);
      // Revenue attributed to a campaign: sum of invoices for patients whose
      // originating lead came from it — the same attribution chain
      // lead.service.ts's convertLead preserves at conversion time.
      const convertedPatients = await prisma.lead.findMany({
        where: { ...where, status: LeadStatus.CONVERTED, convertedPatientId: { not: null } },
        select: { convertedPatientId: true },
      });
      const patientIds = convertedPatients.map((l) => l.convertedPatientId as string);
      const invoices = patientIds.length
        ? await prisma.invoice.findMany({
            where: { patientId: { in: patientIds } },
            select: { totalAmount: true },
          })
        : [];
      const revenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      const roiPercent = spend > 0 ? Math.round(((revenue - spend) / spend) * 10000) / 100 : null;

      return {
        campaignId: campaign.id,
        name: campaign.name,
        totalLeads,
        convertedLeads,
        conversionRatePercent:
          totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 10000) / 100 : 0,
        spend,
        revenue,
        roiPercent,
      };
    }),
  );
}

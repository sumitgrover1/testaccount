import { prisma } from '../../config/database';

function startOfDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getOverview() {
  const last30 = startOfDaysAgo(30);

  const [
    leadsByType,
    leadsByStatus,
    leadsLast30,
    loanPipeline,
    insurancePipeline,
    topModels,
    topCities,
  ] = await Promise.all([
    prisma.lead.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lead.count({ where: { createdAt: { gte: last30 } } }),
    prisma.loanApplication.aggregate({
      where: { createdAt: { gte: last30 } },
      _count: { _all: true },
      _sum: { loanAmount: true },
    }),
    prisma.insuranceApplication.aggregate({
      where: { createdAt: { gte: last30 } },
      _count: { _all: true },
      _sum: { totalPremium: true },
    }),
    prisma.lead.groupBy({
      by: ['modelId'],
      where: { modelId: { not: null }, createdAt: { gte: last30 } },
      _count: { _all: true },
      orderBy: { _count: { modelId: 'desc' } },
      take: 5,
    }),
    prisma.lead.groupBy({
      by: ['cityId'],
      where: { cityId: { not: null }, createdAt: { gte: last30 } },
      _count: { _all: true },
      orderBy: { _count: { cityId: 'desc' } },
      take: 5,
    }),
  ]);

  // groupBy returns ids only; resolve the names in one round trip each so the
  // dashboard can render labels without N+1 queries.
  const [models, cities] = await Promise.all([
    prisma.vehicleModel.findMany({
      where: { id: { in: topModels.map((m) => m.modelId).filter((id): id is string => !!id) } },
      select: { id: true, name: true, brand: { select: { name: true } } },
    }),
    prisma.city.findMany({
      where: { id: { in: topCities.map((c) => c.cityId).filter((id): id is string => !!id) } },
      select: { id: true, name: true, state: true },
    }),
  ]);

  const converted = leadsByStatus.find((s) => s.status === 'CONVERTED')?._count._all ?? 0;
  const totalLeads = leadsByStatus.reduce((sum, s) => sum + s._count._all, 0);

  return {
    totals: {
      leads: totalLeads,
      leadsLast30Days: leadsLast30,
      conversionRatePercent: totalLeads > 0 ? Number(((converted / totalLeads) * 100).toFixed(1)) : 0,
      loanApplicationsLast30Days: loanPipeline._count._all,
      loanValueLast30Days: loanPipeline._sum.loanAmount ?? 0n,
      insuranceApplicationsLast30Days: insurancePipeline._count._all,
      insurancePremiumLast30Days: insurancePipeline._sum.totalPremium ?? 0n,
    },
    leadsByType: leadsByType.map((row) => ({ type: row.type, count: row._count._all })),
    leadsByStatus: leadsByStatus.map((row) => ({ status: row.status, count: row._count._all })),
    topModels: topModels.map((row) => {
      const model = models.find((m) => m.id === row.modelId);
      return {
        modelId: row.modelId,
        name: model ? `${model.brand.name} ${model.name}` : 'Unknown',
        leads: row._count._all,
      };
    }),
    topCities: topCities.map((row) => {
      const city = cities.find((c) => c.id === row.cityId);
      return {
        cityId: row.cityId,
        name: city ? `${city.name}, ${city.state}` : 'Unknown',
        leads: row._count._all,
      };
    }),
  };
}

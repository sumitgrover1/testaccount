import { LeadStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  CreateCampaignInput,
  ListCampaignsQuery,
  UpdateCampaignInput,
} from './campaign.validation';

export async function createCampaign(input: CreateCampaignInput, actorId: string) {
  const campaign = await prisma.campaign.create({ data: input });
  await recordAudit({
    userId: actorId,
    action: 'CAMPAIGN_CREATED',
    resource: 'Campaign',
    resourceId: campaign.id,
  });
  return campaign;
}

export async function getCampaignById(id: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw new NotFoundError('Campaign not found');
  return campaign;
}

export async function listCampaigns(query: ListCampaignsQuery) {
  const where = {
    ...(query.source ? { source: query.source } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search ? { name: { contains: query.search } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.campaign.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export async function updateCampaign(id: string, input: UpdateCampaignInput, actorId: string) {
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Campaign not found');

  const updated = await prisma.campaign.update({ where: { id }, data: input });
  await recordAudit({
    userId: actorId,
    action: 'CAMPAIGN_UPDATED',
    resource: 'Campaign',
    resourceId: id,
    metadata: { changes: input },
  });
  return updated;
}

/// Lead volume, conversion rate, and cost-efficiency for one campaign — the
/// per-campaign drill-down behind the dashboard's campaign performance widget.
export async function getCampaignPerformance(id: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw new NotFoundError('Campaign not found');

  const [totalLeads, convertedLeads] = await Promise.all([
    prisma.lead.count({ where: { campaignId: id } }),
    prisma.lead.count({ where: { campaignId: id, status: LeadStatus.CONVERTED } }),
  ]);

  const totalSpend = Number(campaign.totalSpend ?? 0);
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const costPerConversion = convertedLeads > 0 ? totalSpend / convertedLeads : null;

  return {
    campaignId: id,
    totalLeads,
    convertedLeads,
    conversionRate: Math.round(conversionRate * 100) / 100,
    totalSpend,
    costPerConversion,
  };
}

import type { FuelType, ModelStatus, Prisma, Transmission, VehicleType } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/AppError';

const MODEL_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  vehicleType: true,
  status: true,
  bodyType: true,
  priceMin: true,
  priceMax: true,
  mileageKmpl: true,
  engineCc: true,
  powerBhp: true,
  seatingCapacity: true,
  batteryKwh: true,
  rangeKm: true,
  ptoHp: true,
  gvwKg: true,
  heroImageUrl: true,
  rating: true,
  reviewCount: true,
  launchDate: true,
  isPopular: true,
  brand: { select: { id: true, slug: true, name: true, logoUrl: true } },
} satisfies Prisma.VehicleModelSelect;

export async function listBrands(input: { vehicleType?: VehicleType; popular?: boolean }) {
  return prisma.brand.findMany({
    where: {
      ...(input.vehicleType ? { vehicleType: input.vehicleType } : {}),
      ...(input.popular !== undefined ? { isPopular: input.popular } : {}),
    },
    orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      vehicleType: true,
      logoUrl: true,
      isPopular: true,
      _count: { select: { models: true } },
    },
  });
}

export interface ListModelsInput {
  vehicleType?: VehicleType;
  brand?: string;
  q?: string;
  status?: ModelStatus;
  bodyType?: string;
  fuelTypes?: FuelType[];
  transmissions?: Transmission[];
  minPrice?: number;
  maxPrice?: number;
  minSeating?: number;
  sort: 'popular' | 'price-asc' | 'price-desc' | 'newest' | 'mileage' | 'name';
  page: number;
  limit: number;
}

function buildModelWhere(input: ListModelsInput): Prisma.VehicleModelWhereInput {
  // Fuel and transmission live on variants, so those filters are expressed as
  // "has at least one variant matching", which is also how a buyer reads them:
  // a model is a diesel option if any of its variants is diesel.
  const variantFilter: Prisma.VariantWhereInput = {
    ...(input.fuelTypes?.length ? { fuelType: { in: input.fuelTypes } } : {}),
    ...(input.transmissions?.length ? { transmission: { in: input.transmissions } } : {}),
  };

  return {
    ...(input.vehicleType ? { vehicleType: input.vehicleType } : {}),
    ...(input.brand ? { brand: { slug: input.brand } } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.bodyType ? { bodyType: { equals: input.bodyType, mode: 'insensitive' } } : {}),
    ...(input.minSeating ? { seatingCapacity: { gte: input.minSeating } } : {}),
    ...(input.minPrice !== undefined ? { priceMax: { gte: BigInt(input.minPrice) } } : {}),
    ...(input.maxPrice !== undefined ? { priceMin: { lte: BigInt(input.maxPrice) } } : {}),
    ...(input.q
      ? {
          OR: [
            { name: { contains: input.q, mode: 'insensitive' } },
            { brand: { name: { contains: input.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(Object.keys(variantFilter).length ? { variants: { some: variantFilter } } : {}),
  };
}

function buildModelOrder(sort: ListModelsInput['sort']): Prisma.VehicleModelOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ priceMin: 'asc' }];
    case 'price-desc':
      return [{ priceMin: 'desc' }];
    case 'newest':
      return [{ launchDate: 'desc' }];
    case 'mileage':
      return [{ mileageKmpl: 'desc' }];
    case 'name':
      return [{ name: 'asc' }];
    default:
      return [{ isPopular: 'desc' }, { viewCount: 'desc' }, { rating: 'desc' }];
  }
}

export async function listModels(input: ListModelsInput) {
  const where = buildModelWhere(input);
  const [total, items] = await Promise.all([
    prisma.vehicleModel.count({ where }),
    prisma.vehicleModel.findMany({
      where,
      orderBy: buildModelOrder(input.sort),
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: MODEL_CARD_SELECT,
    }),
  ]);

  return {
    items,
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit)),
    },
  };
}

export async function getModelDetail(brandSlug: string, modelSlug: string) {
  const model = await prisma.vehicleModel.findFirst({
    where: { slug: modelSlug, brand: { slug: brandSlug } },
    include: {
      brand: { select: { id: true, slug: true, name: true, logoUrl: true, vehicleType: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      highlights: { orderBy: { sortOrder: 'asc' } },
      variants: {
        where: { isDiscontinued: false },
        orderBy: { exShowroomPrice: 'asc' },
        include: { specs: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });
  if (!model) throw new NotFoundError('Model not found');

  // Popularity ranking is driven by real traffic; a failed counter update must
  // never fail the page render, so it is fire-and-forget.
  void prisma.vehicleModel
    .update({ where: { id: model.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  return {
    ...model,
    variants: model.variants.map((variant) => ({
      ...variant,
      specs: groupSpecs(variant.specs),
    })),
  };
}

function groupSpecs(specs: { group: string; label: string; value: string }[]) {
  const groups = new Map<string, { label: string; value: string }[]>();
  for (const spec of specs) {
    const bucket = groups.get(spec.group) ?? [];
    bucket.push({ label: spec.label, value: spec.value });
    groups.set(spec.group, bucket);
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }));
}

export async function getSimilarModels(modelId: string, limit = 4) {
  const model = await prisma.vehicleModel.findUnique({
    where: { id: modelId },
    select: { vehicleType: true, priceMin: true, priceMax: true, bodyType: true },
  });
  if (!model) throw new NotFoundError('Model not found');

  // Same vehicle type, within a +/-35% price band — the band a shopper actually
  // cross-shops in, rather than "anything from the same brand".
  const lower = (model.priceMin * 65n) / 100n;
  const upper = (model.priceMax * 135n) / 100n;

  return prisma.vehicleModel.findMany({
    where: {
      id: { not: modelId },
      vehicleType: model.vehicleType,
      priceMin: { lte: upper },
      priceMax: { gte: lower },
    },
    orderBy: [{ isPopular: 'desc' }, { rating: 'desc' }],
    take: limit,
    select: MODEL_CARD_SELECT,
  });
}

export async function compareVariants(variantIds: string[]) {
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    include: {
      specs: { orderBy: { sortOrder: 'asc' } },
      model: {
        select: {
          id: true,
          slug: true,
          name: true,
          vehicleType: true,
          heroImageUrl: true,
          rating: true,
          brand: { select: { slug: true, name: true, logoUrl: true } },
        },
      },
    },
  });
  if (variants.length !== variantIds.length) {
    throw new NotFoundError('One or more variants could not be found');
  }

  // Build the union of spec rows across the compared variants so the table has
  // one row per label, with a dash where a variant does not offer it.
  const rows = new Map<string, { group: string; label: string; values: Record<string, string> }>();
  for (const variant of variants) {
    for (const spec of variant.specs) {
      const key = `${spec.group}::${spec.label}`;
      const row = rows.get(key) ?? { group: spec.group, label: spec.label, values: {} };
      row.values[variant.id] = spec.value;
      rows.set(key, row);
    }
  }

  const specRows = [...rows.values()].map((row) => ({
    ...row,
    values: Object.fromEntries(variants.map((v) => [v.id, row.values[v.id] ?? '—'])),
  }));

  return {
    variants: variants.map(({ specs: _specs, ...variant }) => variant),
    specRows,
  };
}

export async function search(q: string, vehicleType: VehicleType | undefined, limit: number) {
  const [models, brands] = await Promise.all([
    prisma.vehicleModel.findMany({
      where: {
        ...(vehicleType ? { vehicleType } : {}),
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { brand: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      orderBy: [{ isPopular: 'desc' }, { viewCount: 'desc' }],
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        vehicleType: true,
        priceMin: true,
        priceMax: true,
        heroImageUrl: true,
        brand: { select: { slug: true, name: true } },
      },
    }),
    prisma.brand.findMany({
      where: {
        ...(vehicleType ? { vehicleType } : {}),
        name: { contains: q, mode: 'insensitive' },
      },
      take: 5,
      select: { id: true, slug: true, name: true, vehicleType: true, logoUrl: true },
    }),
  ]);

  return { models, brands };
}

// Facets for the listing sidebar. Counts come from the same table the listing
// reads, so a filter never offers an option that yields zero results.
export async function getFilters(vehicleType: VehicleType) {
  const [brands, bodyTypes, fuelTypes, priceRange] = await Promise.all([
    prisma.brand.findMany({
      where: { vehicleType, models: { some: {} } },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true, _count: { select: { models: true } } },
    }),
    prisma.vehicleModel.groupBy({
      by: ['bodyType'],
      where: { vehicleType, bodyType: { not: null } },
      _count: { _all: true },
    }),
    prisma.variant.groupBy({
      by: ['fuelType'],
      where: { model: { vehicleType } },
      _count: { _all: true },
    }),
    prisma.vehicleModel.aggregate({
      where: { vehicleType },
      _min: { priceMin: true },
      _max: { priceMax: true },
    }),
  ]);

  return {
    brands: brands.map((b) => ({ slug: b.slug, name: b.name, count: b._count.models })),
    bodyTypes: bodyTypes
      .filter((b) => b.bodyType)
      .map((b) => ({ value: b.bodyType as string, count: b._count._all })),
    fuelTypes: fuelTypes.map((f) => ({ value: f.fuelType, count: f._count._all })),
    priceRange: {
      min: priceRange._min.priceMin ?? 0n,
      max: priceRange._max.priceMax ?? 0n,
    },
  };
}

export async function getHomeFeed() {
  const [popularCars, popularBikes, upcoming, tractors, buses] = await Promise.all([
    prisma.vehicleModel.findMany({
      where: { vehicleType: 'CAR', status: 'NEW' },
      orderBy: [{ isPopular: 'desc' }, { viewCount: 'desc' }],
      take: 8,
      select: MODEL_CARD_SELECT,
    }),
    prisma.vehicleModel.findMany({
      where: { vehicleType: 'BIKE', status: 'NEW' },
      orderBy: [{ isPopular: 'desc' }, { viewCount: 'desc' }],
      take: 8,
      select: MODEL_CARD_SELECT,
    }),
    prisma.vehicleModel.findMany({
      where: { status: 'UPCOMING' },
      orderBy: { launchDate: 'asc' },
      take: 6,
      select: MODEL_CARD_SELECT,
    }),
    prisma.vehicleModel.findMany({
      where: { vehicleType: 'TRACTOR' },
      orderBy: [{ isPopular: 'desc' }],
      take: 6,
      select: MODEL_CARD_SELECT,
    }),
    prisma.vehicleModel.findMany({
      where: { vehicleType: 'BUS' },
      orderBy: [{ isPopular: 'desc' }],
      take: 6,
      select: MODEL_CARD_SELECT,
    }),
  ]);

  return { popularCars, popularBikes, upcoming, tractors, buses };
}

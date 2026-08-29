import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

interface ListCitiesInput {
  q?: string;
  state?: string;
  popular?: boolean;
  limit: number;
}

export async function listCities(input: ListCitiesInput) {
  const where: Prisma.CityWhereInput = {
    ...(input.q ? { name: { contains: input.q, mode: 'insensitive' } } : {}),
    ...(input.state ? { state: { equals: input.state, mode: 'insensitive' } } : {}),
    ...(input.popular !== undefined ? { isPopular: input.popular } : {}),
  };

  return prisma.city.findMany({
    where,
    orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
    take: input.limit,
    select: { id: true, slug: true, name: true, state: true, stateCode: true, isPopular: true },
  });
}

export async function getCityBySlug(slug: string) {
  return prisma.city.findUniqueOrThrow({
    where: { slug },
    select: { id: true, slug: true, name: true, state: true, stateCode: true, isPopular: true },
  });
}

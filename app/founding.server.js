import prisma from './db.server';

export const FOUNDING_MEMBER_LIMIT = 20;

const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

function normalizeShop(shop) {
  return String(shop || '').trim().toLowerCase();
}

export function isFoundingAdmin(shop) {
  const normalized = normalizeShop(shop);
  const configured = String(process.env.FOUNDING_ADMIN_SHOPS || '')
    .split(',')
    .map((value) => normalizeShop(value))
    .filter(Boolean);

  return Boolean(normalized) && configured.includes(normalized);
}

export async function getFoundingAccess(shop) {
  const normalized = normalizeShop(shop);

  if (!normalized) {
    return null;
  }

  return prisma.foundingAccess.findUnique({
    where: { shop: normalized },
  });
}

export async function isFoundingMember(shop) {
  const access = await getFoundingAccess(shop);
  return access?.status === STATUS.APPROVED;
}

export async function getFoundingStats() {
  const [approved, pending] = await Promise.all([
    prisma.foundingAccess.count({
      where: { status: STATUS.APPROVED },
    }),
    prisma.foundingAccess.count({
      where: { status: STATUS.PENDING },
    }),
  ]);

  return {
    limit: FOUNDING_MEMBER_LIMIT,
    approved,
    pending,
    remaining: Math.max(0, FOUNDING_MEMBER_LIMIT - approved),
    full: approved >= FOUNDING_MEMBER_LIMIT,
  };
}

export async function requestFoundingAccess(shop) {
  const normalized = normalizeShop(shop);

  if (!normalized) {
    throw new Error('Shop domain is required.');
  }

  const current = await getFoundingAccess(normalized);

  if (current?.status === STATUS.APPROVED || current?.status === STATUS.PENDING) {
    return current;
  }

  const stats = await getFoundingStats();

  if (stats.full) {
    throw new Error('All 20 founding member spots have been filled.');
  }

  return prisma.foundingAccess.upsert({
    where: { shop: normalized },
    create: {
      shop: normalized,
      status: STATUS.PENDING,
    },
    update: {
      status: STATUS.PENDING,
      requestedAt: new Date(),
      rejectedAt: null,
    },
  });
}

export async function approveFoundingAccess(shop) {
  const normalized = normalizeShop(shop);

  if (!normalized) {
    throw new Error('Shop domain is required.');
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.foundingAccess.findUnique({
      where: { shop: normalized },
    });

    if (current?.status === STATUS.APPROVED) {
      return current;
    }

    const approved = await tx.foundingAccess.findMany({
      where: { status: STATUS.APPROVED },
      select: { position: true },
    });

    if (approved.length >= FOUNDING_MEMBER_LIMIT) {
      throw new Error('All 20 founding member spots have already been approved.');
    }

    const used = new Set(
      approved
        .map((entry) => entry.position)
        .filter((position) => Number.isInteger(position)),
    );

    let position = null;

    for (let candidate = 1; candidate <= FOUNDING_MEMBER_LIMIT; candidate += 1) {
      if (!used.has(candidate)) {
        position = candidate;
        break;
      }
    }

    if (!position) {
      throw new Error('No founding member positions are available.');
    }

    return tx.foundingAccess.upsert({
      where: { shop: normalized },
      create: {
        shop: normalized,
        status: STATUS.APPROVED,
        position,
        approvedAt: new Date(),
      },
      update: {
        status: STATUS.APPROVED,
        position,
        approvedAt: new Date(),
        rejectedAt: null,
      },
    });
  });
}

export async function rejectFoundingAccess(shop) {
  const normalized = normalizeShop(shop);

  if (!normalized) {
    throw new Error('Shop domain is required.');
  }

  const current = await getFoundingAccess(normalized);

  if (current?.status === STATUS.APPROVED) {
    throw new Error('Approved founding memberships are permanent and cannot be rejected.');
  }

  return prisma.foundingAccess.upsert({
    where: { shop: normalized },
    create: {
      shop: normalized,
      status: STATUS.REJECTED,
      rejectedAt: new Date(),
    },
    update: {
      status: STATUS.REJECTED,
      position: null,
      rejectedAt: new Date(),
    },
  });
}

export async function listFoundingAccess() {
  return prisma.foundingAccess.findMany({
    orderBy: [
      { status: 'asc' },
      { requestedAt: 'asc' },
    ],
  });
}

// Prisma maps Postgres BIGINT to JavaScript BigInt, which JSON.stringify cannot
// serialise. Money in this codebase is stored in whole rupees as BIGINT, so
// every response would otherwise throw. Convert on the way out instead of
// patching BigInt.prototype globally, which would silently change behaviour for
// any other library in the process.
export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val: unknown) => (typeof val === 'bigint' ? Number(val) : val)),
  ) as T;
}

export function toRupees(value: bigint | number): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

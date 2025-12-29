/**
 * Check if a value is a Prisma Decimal (duck typing)
 * Decimal.js objects have: s (sign), e (exponent), d (digits array)
 */
function isPrismaDecimal(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    's' in value &&
    'e' in value &&
    'd' in value &&
    typeof (value as any).toNumber === 'function'
  );
}

/**
 * Recursively converts Prisma Decimal fields to JavaScript numbers.
 * This is needed because Prisma returns Decimal objects for numeric fields,
 * which don't serialize correctly to JSON.
 */
export function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (isPrismaDecimal(obj)) {
    return (obj as any).toNumber() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal) as unknown as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDecimal(value);
    }
    return result as T;
  }

  return obj;
}

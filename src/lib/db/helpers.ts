import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

export function newId(): string {
  return uuidv4();
}

export function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

export function toFirestoreDate(value: unknown): Date | Timestamp {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === "string" || typeof value === "number") {
    return Timestamp.fromDate(new Date(value));
  }
  return Timestamp.now();
}

export function docToRecord(id: string, data: DocumentData): Record<string, unknown> {
  const result: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate();
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) delete result[key];
  }
  return result;
}

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function matchesWhere(
  record: Record<string, unknown>,
  where: Record<string, unknown> | undefined
): boolean {
  if (!where) return true;

  for (const [key, value] of Object.entries(where)) {
    if (key === "NOT") {
      const notClause = value as Record<string, unknown>;
      if (matchesWhere(record, notClause)) return false;
      continue;
    }
    if (key === "OR") continue;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const op = value as Record<string, unknown>;
      if ("in" in op) {
        const list = op.in as unknown[];
        if (!list.includes(record[key])) return false;
        continue;
      }
      if ("not" in op) {
        if (record[key] === op.not) return false;
        continue;
      }
      if ("contains" in op) {
        const arr = record[key];
        if (!Array.isArray(arr) || !arr.includes(op.contains)) return false;
        continue;
      }
    }
    if (record[key] !== value) return false;
  }
  return true;
}

export function applySelect(
  record: Record<string, unknown>,
  select?: Record<string, boolean | Record<string, unknown>>
): Record<string, unknown> {
  if (!select) return record;
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true && key in record) {
      result[key] = record[key];
    }
  }
  if (select.id === true || "id" in record) result.id = record.id;
  return result;
}

export function applyOrderBy<T extends Record<string, unknown>>(
  records: T[],
  orderBy?:
    | Record<string, "asc" | "desc" | Record<string, "asc" | "desc">>
    | Array<Record<string, "asc" | "desc" | Record<string, "asc" | "desc">>>
): T[] {
  if (!orderBy) return records;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...records].sort((a, b) => {
    for (const order of orders) {
      const [field, dirOrNested] = Object.entries(order)[0] ?? [];
      if (!field) continue;

      let av: unknown;
      let bv: unknown;
      let dir: "asc" | "desc" = "asc";

      if (typeof dirOrNested === "object" && dirOrNested !== null) {
        const nestedField = Object.keys(dirOrNested)[0]!;
        dir = dirOrNested[nestedField as keyof typeof dirOrNested] as "asc" | "desc";
        av = (a[field] as Record<string, unknown> | undefined)?.[nestedField];
        bv = (b[field] as Record<string, unknown> | undefined)?.[nestedField];
      } else {
        dir = dirOrNested as "asc" | "desc";
        av = a[field];
        bv = b[field];
      }

      if (av === bv) continue;
      const cmp =
        av instanceof Date && bv instanceof Date
          ? av.getTime() - bv.getTime()
          : String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

export class DbError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "DbError";
    this.code = code;
  }
}

export function prismaDeleteError(error: unknown): DbError {
  if (error instanceof DbError) return error;
  return new DbError(
    error instanceof Error ? error.message : "Delete failed",
    "P2003"
  );
}

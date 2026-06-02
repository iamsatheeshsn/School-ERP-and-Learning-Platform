import {
  FieldValue,
  type DocumentData,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { MODEL_DEFS, type ModelDef } from "./schema";
import {
  applyOrderBy,
  applySelect,
  dateKey,
  docToRecord,
  matchesWhere,
  newId,
  stripUndefined,
  toDate,
  toFirestoreDate,
  DbError,
} from "./helpers";

type WhereInput = Record<string, unknown>;
type IncludeInput = Record<string, boolean | Record<string, unknown>>;
type OrderByInput =
  | Record<string, "asc" | "desc" | Record<string, "asc" | "desc">>
  | Array<Record<string, "asc" | "desc" | Record<string, "asc" | "desc">>>;

type FindArgs = {
  where?: WhereInput;
  include?: IncludeInput;
  select?: Record<string, boolean | Record<string, unknown>>;
  orderBy?: OrderByInput;
  take?: number;
  skip?: number;
};

type CreateArgs = {
  data: Record<string, unknown>;
  include?: IncludeInput;
};

type UpdateArgs = {
  where: WhereInput;
  data: Record<string, unknown>;
  include?: IncludeInput;
};

type UpsertArgs = {
  where: WhereInput;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
  include?: IncludeInput;
};

export class FirestoreModel {
  constructor(
    public readonly modelName: string,
    private readonly def: ModelDef,
    private readonly dbResolver: (name: string) => FirestoreModel
  ) {}

  private firestore(): Firestore {
    return getAdminFirestore();
  }

  private col() {
    return this.firestore().collection(this.def.collection);
  }

  private normalizeWriteData(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    const now = FieldValue.serverTimestamp();

    if (this.modelName === "attendance" && result.date && !result.dateKey) {
      result.dateKey = dateKey(toDate(result.date));
      result.date = toFirestoreDate(result.date);
    } else if (result.date) {
      result.date = toFirestoreDate(result.date);
    }

    for (const key of [
      "startDate",
      "endDate",
      "dueDate",
      "admissionDate",
      "submittedAt",
      "paidAt",
      "publishedAt",
      "readAt",
    ]) {
      if (result[key] !== undefined && result[key] !== null) {
        result[key] = toFirestoreDate(result[key]);
      }
    }

    if (!result.createdAt) result.createdAt = now;
    result.updatedAt = now;
    return stripUndefined(result);
  }

  private resolveWhere(where: WhereInput): { id?: string; filters: WhereInput } {
    if (where.id) return { id: String(where.id), filters: {} };

    for (const [compoundName, fields] of Object.entries(this.def.compoundUniques ?? {})) {
      const compound = where[compoundName] as Record<string, unknown> | undefined;
      if (compound) {
        const filters: WhereInput = {};
        for (const field of fields) {
          if (field === "dateKey" && compound.date) {
            filters.dateKey = dateKey(toDate(compound.date));
          } else {
            filters[field] = compound[field];
          }
        }
        return { filters };
      }
    }

    if (where.email) {
      return { filters: { email: String(where.email).toLowerCase() } };
    }
    if (where.userId) return { filters: { userId: where.userId } };

    return { filters: where };
  }

  private async findByWhere(where: WhereInput): Promise<Record<string, unknown> | null> {
    const resolved = this.resolveWhere(where);
    if (resolved.id) {
      const snap = await this.col().doc(resolved.id).get();
      if (!snap.exists) return null;
      return docToRecord(snap.id, snap.data()!);
    }

    const records = await this.fetchAll(resolved.filters);
    return records[0] ?? null;
  }

  private async fetchAll(where?: WhereInput): Promise<Record<string, unknown>[]> {
    if (!where || Object.keys(where).length === 0) {
      const snap = await this.col().get();
      return snap.docs.map((d) => docToRecord(d.id, d.data()));
    }

    const resolved = this.resolveWhere(where).filters;

    for (const [key, value] of Object.entries(where)) {
      if (key === "NOT" || key === "OR") continue;
      if (typeof value === "object" && value !== null && "in" in (value as object)) {
        const list = (value as { in: unknown[] }).in;
        if (list.length === 0) return [];
        const chunks: unknown[][] = [];
        for (let i = 0; i < list.length; i += 10) {
          chunks.push(list.slice(i, i + 10));
        }
        const results: Record<string, unknown>[] = [];
        for (const chunk of chunks) {
          const snap = await this.col().where(key, "in", chunk).get();
          results.push(...snap.docs.map((d) => docToRecord(d.id, d.data())));
        }
        return results.filter((r) => matchesWhere(r, where));
      }
    }

    let q: Query = this.col();

    for (const [key, value] of Object.entries(resolved)) {
      if (key === "NOT" || key === "OR") continue;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const op = value as Record<string, unknown>;
        if ("in" in op) {
          q = q.where(key, "in", op.in as unknown[]);
          continue;
        }
      }
      q = q.where(key, "==", value);
    }

    const snap = await q.get();
    let records = snap.docs.map((d) => docToRecord(d.id, d.data()));

    records = records.filter((r) => matchesWhere(r, where));

    return records;
  }

  private async resolveIncludes(
    record: Record<string, unknown>,
    include?: IncludeInput
  ): Promise<Record<string, unknown>> {
    if (!include) return record;
    const result = { ...record };

    for (const [key, val] of Object.entries(include)) {
      if (key === "_count") {
        const counts = val as Record<string, { select?: Record<string, boolean> }>;
        result._count = {};
        for (const countKey of Object.keys(counts)) {
          const countDef = this.def.countRelations?.[countKey];
          if (!countDef) continue;
          const related = this.dbResolver(countDef.model);
          const n = await related.count({
            where: { [countDef.foreignKey]: record.id },
          });
          (result._count as Record<string, number>)[countKey] = n;
        }
        continue;
      }

      const rel = this.def.relations?.[key];
      if (!rel) continue;
      const relatedModel = this.dbResolver(rel.model);
      const localValue = rel.localKey ? record[rel.localKey] : record.id;

      if (rel.localKey && !localValue) {
        result[key] = null;
        continue;
      }

      if (val === true) {
        if (rel.localKey) {
          const related = await relatedModel.findUnique({
            where: { id: localValue as string },
          });
          result[key] = related;
        } else if (rel.many) {
          result[key] = await relatedModel.findMany({
            where: { [rel.foreignKey]: record.id },
          });
        } else {
          result[key] = await relatedModel.findFirst({
            where: { [rel.foreignKey]: record.id },
          });
        }
      } else if (typeof val === "object") {
        const opts = val as Record<string, unknown>;
        if (rel.localKey) {
          let related = await relatedModel.findUnique({
            where: { id: localValue as string },
            ...(opts.select ? { select: opts.select as Record<string, boolean> } : {}),
            ...(opts.include ? { include: opts.include as IncludeInput } : {}),
          });
          if (related && opts.select) {
            related = applySelect(related, opts.select as Record<string, boolean>);
          }
          result[key] = related;
        } else if (rel.many) {
          result[key] = await relatedModel.findMany({
            where: { [rel.foreignKey]: record.id },
            orderBy: opts.orderBy as OrderByInput,
            take: opts.take as number,
            select: opts.select as Record<string, boolean>,
            include: opts.include as IncludeInput,
          });
        } else {
          result[key] = await relatedModel.findFirst({
            where: { [rel.foreignKey]: record.id },
            orderBy: opts.orderBy as OrderByInput,
            select: opts.select as Record<string, boolean>,
            include: opts.include as IncludeInput,
          });
        }
      }
    }

    return result;
  }

  async findUnique(args: FindArgs & { where: WhereInput }): Promise<any> {
    const record = await this.findByWhere(args.where);
    if (!record) return null;
    const { topSelect, relationSelects } = this.parseSelectOrInclude(args.select);
    let result = topSelect ? applySelect(record, topSelect) : record;
    result = await this.resolveIncludes(result, args.include ?? relationSelects);
    return result;
  }

  private parseSelectOrInclude(
    select?: Record<string, boolean | Record<string, unknown>>
  ): {
    topSelect?: Record<string, boolean>;
    relationSelects?: IncludeInput;
  } {
    if (!select) return {};
    const topSelect: Record<string, boolean> = {};
    const relationSelects: IncludeInput = {};
    for (const [key, val] of Object.entries(select)) {
      if (typeof val === "object" && val !== null) {
        relationSelects[key] = val as Record<string, unknown>;
      } else if (val === true) {
        topSelect[key] = true;
      }
    }
    return { topSelect, relationSelects };
  }

  async findFirst(args: FindArgs = {}): Promise<any> {
    let records = await this.fetchAll(args.where);
    records = applyOrderBy(records, args.orderBy);
    if (args.skip) records = records.slice(args.skip);
    if (args.take) records = records.slice(0, args.take);
    const record = records[0];
    if (!record) return null;
    let result = args.select ? applySelect(record, args.select) : record;
    result = await this.resolveIncludes(result, args.include);
    return result;
  }

  async findMany(args: FindArgs = {}): Promise<any[]> {
    let records = await this.fetchAll(args.where);

    const results: Record<string, unknown>[] = [];
    for (const record of records) {
      let result = args.select ? applySelect(record, args.select) : record;
      result = await this.resolveIncludes(result, args.include);
      results.push(result);
    }

    let sorted = applyOrderBy(results, args.orderBy);
    if (args.skip) sorted = sorted.slice(args.skip);
    if (args.take) sorted = sorted.slice(0, args.take);
    return sorted;
  }

  async count(args: { where?: WhereInput } = {}): Promise<number> {
    const records = await this.fetchAll(args.where);
    return records.length;
  }

  async create(args: CreateArgs): Promise<any> {
    const { nestedCreates, flatData } = this.extractNestedCreates(args.data);
    const id = (flatData.id as string) || newId();
    const writeData = this.normalizeWriteData({ ...flatData, id });
    await this.col().doc(id).set(writeData);

    for (const nested of nestedCreates) {
      await nested(id);
    }

    const created = await this.findUnique({
      where: { id },
      include: args.include,
    });
    return created!;
  }

  private extractNestedCreates(data: Record<string, unknown>): {
    flatData: Record<string, unknown>;
    nestedCreates: Array<(userId: string) => Promise<void>>;
  } {
    const flatData = { ...data };
    const nestedCreates: Array<(ownerId: string) => Promise<void>> = [];

    for (const [key, value] of Object.entries(data)) {
      const rel = this.def.relations?.[key];
      if (
        rel &&
        typeof value === "object" &&
        value !== null &&
        "create" in (value as Record<string, unknown>)
      ) {
        delete flatData[key];
        const createPayload = (value as { create: Record<string, unknown> }).create;
        nestedCreates.push(async (ownerId: string) => {
          const relatedModel = this.dbResolver(rel.model);
          const linkField = rel.localKey ?? rel.foreignKey;
          await relatedModel.create({
            data: { ...createPayload, [linkField]: ownerId },
          });
        });
      }
    }

    return { flatData, nestedCreates };
  }

  async createMany(args: {
    data: Record<string, unknown>[];
    skipDuplicates?: boolean;
  }): Promise<{ count: number }> {
    const batch = this.firestore().batch();
    let count = 0;
    for (const item of args.data) {
      if (args.skipDuplicates && item.homeworkId && item.studentId) {
        const existing = await this.findFirst({
          where: {
            homeworkId_studentId: {
              homeworkId: item.homeworkId,
              studentId: item.studentId,
            },
          },
        });
        if (existing) continue;
      }
      const id = (item.id as string) || newId();
      batch.set(this.col().doc(id), this.normalizeWriteData({ ...item, id }));
      count++;
    }
    if (count > 0) await batch.commit();
    return { count };
  }

  async update(args: UpdateArgs): Promise<any> {
    const existing = await this.findByWhere(args.where);
    if (!existing) throw new DbError("Record not found");
    const writeData = this.normalizeWriteData({ ...args.data, updatedAt: FieldValue.serverTimestamp() });
    delete writeData.createdAt;
    await this.col().doc(existing.id as string).update(writeData);
    return (await this.findUnique({
      where: { id: existing.id as string },
      include: args.include,
    }))!;
  }

  async updateMany(args: { where?: WhereInput; data: Record<string, unknown> }): Promise<{ count: number }> {
    const records = await this.fetchAll(args.where);
    const batch = this.firestore().batch();
    for (const record of records) {
      batch.update(
        this.col().doc(record.id as string),
        stripUndefined({
          ...args.data,
          updatedAt: FieldValue.serverTimestamp(),
        }) as DocumentData
      );
    }
    await batch.commit();
    return { count: records.length };
  }

  async upsert(args: UpsertArgs): Promise<any> {
    const existing = await this.findByWhere(args.where);
    if (existing) {
      return this.update({
        where: { id: existing.id as string },
        data: args.update,
        include: args.include,
      });
    }
    return this.create({
      data: { ...args.create, ...this.flattenWhere(args.where) },
      include: args.include,
    });
  }

  private flattenWhere(where: WhereInput): Record<string, unknown> {
    for (const [compoundName, fields] of Object.entries(this.def.compoundUniques ?? {})) {
      const compound = where[compoundName] as Record<string, unknown> | undefined;
      if (compound) {
        const result: Record<string, unknown> = { ...compound };
        if (compound.date) result.dateKey = dateKey(toDate(compound.date));
        return result;
      }
    }
    return where;
  }

  async delete(args: { where: WhereInput }): Promise<any> {
    const existing = await this.findByWhere(args.where);
    if (!existing) throw new DbError("Record not found");

    if (this.modelName === "user") {
      await this.cascadeDeleteUser(existing.id as string);
    } else if (this.def.cascadeDelete) {
      for (const relName of this.def.cascadeDelete) {
        const rel = this.def.relations?.[relName];
        if (!rel) continue;
        const related = this.dbResolver(rel.model);
        const items = await related.findMany({ where: { [rel.foreignKey]: existing.id } });
        for (const item of items) {
          await related.delete({ where: { id: item.id as string } });
        }
      }
    }

    await this.col().doc(existing.id as string).delete();
    return existing;
  }

  private async cascadeDeleteUser(userId: string): Promise<void> {
    const profiles = ["studentProfile", "teacherProfile", "parentProfile"] as const;
    for (const name of profiles) {
      const model = this.dbResolver(name);
      const profile = await model.findFirst({ where: { userId } });
      if (profile) await model.delete({ where: { id: profile.id as string } });
    }
    try {
      const { getAdminAuth } = await import("@/lib/firebase/admin");
      await getAdminAuth().deleteUser(userId);
    } catch {
      // Auth user may not exist during seed cleanup
    }
  }

  async deleteMany(args: { where?: WhereInput } = {}): Promise<{ count: number }> {
    const records = await this.fetchAll(args.where);
    const batch = this.firestore().batch();
    for (const record of records) {
      batch.delete(this.col().doc(record.id as string));
    }
    if (records.length > 0) await batch.commit();
    return { count: records.length };
  }

  async groupBy(args: {
    by: string[];
    where?: WhereInput;
    _count?: Record<string, boolean>;
  }): Promise<any[]> {
    const records = await this.fetchAll(args.where);
    const groups = new Map<string, Record<string, unknown>>();

    for (const record of records) {
      const key = args.by.map((f) => String(record[f])).join("|");
      if (!groups.has(key)) {
        const group: Record<string, unknown> = {};
        for (const field of args.by) group[field] = record[field];
        group._count = { _all: 0 };
        groups.set(key, group);
      }
      const g = groups.get(key)!;
      (g._count as { _all: number })._all++;
    }

    return Array.from(groups.values());
  }
}

export function createDbModels(): Record<string, FirestoreModel> {
  const models: Record<string, FirestoreModel> = {};
  const resolver = (name: string) => models[name]!;

  for (const name of Object.keys(MODEL_DEFS)) {
    models[name] = new FirestoreModel(name, MODEL_DEFS[name]!, resolver);
  }
  return models;
}

export async function deleteAllCollections(): Promise<void> {
  const firestore = getAdminFirestore();
  for (const def of Object.values(MODEL_DEFS)) {
    const snap = await firestore.collection(def.collection).get();
    if (snap.empty) continue;
    const batch = firestore.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

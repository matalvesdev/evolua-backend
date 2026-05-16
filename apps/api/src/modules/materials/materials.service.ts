import type { TherapeuticMaterial as PrismaMaterial, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateMaterialInput,
  UpdateMaterialInput,
  ListMaterialsQuery,
  MaterialFormat,
  AgeGroup,
} from '@evolua/contracts';

export interface PaginatedMaterials {
  data: PrismaMaterial[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

function notFound(): Error & { statusCode: number } {
  const err = new Error('Material not found') as Error & { statusCode: number };
  err.statusCode = 404;
  return err;
}

/**
 * Persiste `format`, `ageGroup`, `objectives`, `materialsNeeded`, `durationMinutes`
 * e `isAiGenerated` em `tags[]` para evitar migration nesta fase.
 * Os campos primários (`area`, `type`, `content`, `fileUrl`, `isPublic`) usam colunas do schema.
 */
const META_PREFIXES = {
  format: 'fmt:',
  age: 'age:',
  duration: 'dur:',
  ai: 'ai-generated',
  objective: 'obj:',
  material: 'mat:',
} as const;

function packTags(input: {
  format: MaterialFormat;
  ageGroup?: AgeGroup | null;
  durationMinutes?: number | null;
  isAiGenerated?: boolean;
  objectives: string[];
  materialsNeeded: string[];
  tags: string[];
}): string[] {
  const meta: string[] = [`${META_PREFIXES.format}${input.format}`];
  if (input.ageGroup) meta.push(`${META_PREFIXES.age}${input.ageGroup}`);
  if (input.durationMinutes && input.durationMinutes > 0) {
    meta.push(`${META_PREFIXES.duration}${input.durationMinutes}`);
  }
  if (input.isAiGenerated) meta.push(META_PREFIXES.ai);
  for (const o of input.objectives) meta.push(`${META_PREFIXES.objective}${o}`);
  for (const m of input.materialsNeeded) meta.push(`${META_PREFIXES.material}${m}`);
  // tags livres do usuário ficam sem prefixo
  for (const t of input.tags) meta.push(t);
  return meta;
}

export class MaterialsService {
  async list(
    clinicId: string,
    therapistId: string,
    query: ListMaterialsQuery,
  ): Promise<PaginatedMaterials> {
    const where: Prisma.TherapeuticMaterialWhereInput = {
      clinicId,
      therapistId,
      deletedAt: null,
      ...(query.area ? { area: query.area } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.format ? { tags: { has: `${META_PREFIXES.format}${query.format}` } } : {}),
      ...(query.ageGroup ? { tags: { has: `${META_PREFIXES.age}${query.ageGroup}` } } : {}),
      ...(query.aiOnly ? { tags: { has: META_PREFIXES.ai } } : {}),
    };

    const total = await prisma.therapeuticMaterial.count({ where });
    const data = await prisma.therapeuticMaterial.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async findOne(clinicId: string, therapistId: string, id: string) {
    return prisma.therapeuticMaterial.findFirst({
      where: { id, clinicId, therapistId, deletedAt: null },
    });
  }

  async create(
    clinicId: string,
    therapistId: string,
    input: CreateMaterialInput,
  ): Promise<PrismaMaterial> {
    return prisma.therapeuticMaterial.create({
      data: {
        clinicId,
        therapistId,
        title: input.title,
        description: input.description ?? null,
        area: input.area,
        type: input.format, // coluna `type` reaproveitada como formato
        content: input.content,
        fileUrl: input.fileUrl ?? null,
        isPublic: input.isPublic ?? false,
        tags: packTags({
          format: input.format,
          ageGroup: input.ageGroup ?? null,
          durationMinutes: input.durationMinutes ?? null,
          isAiGenerated: input.isAiGenerated ?? false,
          objectives: input.objectives ?? [],
          materialsNeeded: input.materialsNeeded ?? [],
          tags: input.tags ?? [],
        }),
      },
    });
  }

  async update(
    clinicId: string,
    therapistId: string,
    id: string,
    input: UpdateMaterialInput,
  ): Promise<PrismaMaterial> {
    const existing = await this.findOne(clinicId, therapistId, id);
    if (!existing) throw notFound();

    const data: Prisma.TherapeuticMaterialUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.area !== undefined) data.area = input.area;
    if (input.format !== undefined) data.type = input.format;
    if (input.content !== undefined) data.content = input.content;
    if (input.fileUrl !== undefined) data.fileUrl = input.fileUrl;
    if (input.isPublic !== undefined) data.isPublic = input.isPublic;

    // Regenera tags se qualquer campo "meta" foi tocado
    const touchesMeta =
      input.format !== undefined ||
      input.ageGroup !== undefined ||
      input.durationMinutes !== undefined ||
      input.objectives !== undefined ||
      input.materialsNeeded !== undefined ||
      input.tags !== undefined;
    if (touchesMeta) {
      // recupera valores atuais a partir das tags existentes
      const current = parseMeta(existing.tags);
      data.tags = packTags({
        format: (input.format ?? current.format ?? 'atividade') as MaterialFormat,
        ageGroup: (input.ageGroup === undefined ? current.ageGroup : input.ageGroup) ?? null,
        durationMinutes:
          input.durationMinutes === undefined ? current.durationMinutes : input.durationMinutes,
        isAiGenerated: current.isAiGenerated,
        objectives: input.objectives ?? current.objectives,
        materialsNeeded: input.materialsNeeded ?? current.materialsNeeded,
        tags: input.tags ?? current.userTags,
      });
    }

    return prisma.therapeuticMaterial.update({ where: { id }, data });
  }

  async remove(clinicId: string, therapistId: string, id: string): Promise<boolean> {
    const existing = await this.findOne(clinicId, therapistId, id);
    if (!existing) return false;
    await prisma.therapeuticMaterial.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}

// ── helpers de parsing das tags ─────────────────────────────────────────────

export interface ParsedMeta {
  format: MaterialFormat | null;
  ageGroup: AgeGroup | null;
  durationMinutes: number | null;
  isAiGenerated: boolean;
  objectives: string[];
  materialsNeeded: string[];
  userTags: string[];
}

const VALID_FORMATS: MaterialFormat[] = [
  'atividade',
  'brincadeira',
  'jogo',
  'historia',
  'exercicio',
  'roteiro',
];
const VALID_AGES: AgeGroup[] = ['bebe', 'infantil', 'escolar', 'adolescente', 'adulto'];

export function parseMeta(tags: string[]): ParsedMeta {
  const out: ParsedMeta = {
    format: null,
    ageGroup: null,
    durationMinutes: null,
    isAiGenerated: false,
    objectives: [],
    materialsNeeded: [],
    userTags: [],
  };
  for (const t of tags) {
    if (t.startsWith(META_PREFIXES.format)) {
      const v = t.slice(META_PREFIXES.format.length) as MaterialFormat;
      if (VALID_FORMATS.includes(v)) out.format = v;
    } else if (t.startsWith(META_PREFIXES.age)) {
      const v = t.slice(META_PREFIXES.age.length) as AgeGroup;
      if (VALID_AGES.includes(v)) out.ageGroup = v;
    } else if (t.startsWith(META_PREFIXES.duration)) {
      const n = Number(t.slice(META_PREFIXES.duration.length));
      if (Number.isFinite(n) && n > 0) out.durationMinutes = n;
    } else if (t === META_PREFIXES.ai) {
      out.isAiGenerated = true;
    } else if (t.startsWith(META_PREFIXES.objective)) {
      out.objectives.push(t.slice(META_PREFIXES.objective.length));
    } else if (t.startsWith(META_PREFIXES.material)) {
      out.materialsNeeded.push(t.slice(META_PREFIXES.material.length));
    } else {
      out.userTags.push(t);
    }
  }
  return out;
}

export const materialsService = new MaterialsService();

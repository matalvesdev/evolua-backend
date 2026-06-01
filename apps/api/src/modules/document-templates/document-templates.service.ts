import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateDocumentTemplateInput,
  UpdateDocumentTemplateInput,
  ListDocumentTemplatesQuery,
  DocumentTemplate,
} from '@evolua/contracts';

export class DocumentTemplatesService {
  async list(clinicId: string, q: ListDocumentTemplatesQuery) {
    const where: Prisma.DocumentTemplateWhereInput = {
      deletedAt: null,
      OR: [
        { clinicId },
        { isSystem: true },
      ],
      ...(q.type && { type: q.type }),
      ...(q.clinicId && { clinicId: q.clinicId }),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.documentTemplate.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.documentTemplate.count({ where }),
    ]);
    return {
      data: rows.map(toDTO),
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  }

  async findById(clinicId: string, id: string): Promise<DocumentTemplate | null> {
    const row = await prisma.documentTemplate.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ clinicId }, { isSystem: true }],
      },
    });
    return row ? toDTO(row) : null;
  }

  async create(
    clinicId: string,
    input: CreateDocumentTemplateInput,
  ): Promise<DocumentTemplate> {
    const row = await prisma.documentTemplate.create({
      data: {
        clinicId,
        title: input.title,
        type: input.type,
        subtype: input.subtype ?? null,
        content: input.content,
        isSystem: false,
      },
    });
    return toDTO(row);
  }

  async update(
    clinicId: string,
    id: string,
    input: UpdateDocumentTemplateInput,
  ): Promise<DocumentTemplate | null> {
    const exists = await prisma.documentTemplate.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.documentTemplate.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.subtype !== undefined && { subtype: input.subtype }),
        ...(input.content !== undefined && { content: input.content }),
      },
    });
    return toDTO(row);
  }

  async remove(clinicId: string, id: string): Promise<DocumentTemplate | null> {
    const exists = await prisma.documentTemplate.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.documentTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return toDTO(row);
  }
}

export const documentTemplatesService = new DocumentTemplatesService();

function toDTO(r: {
  id: string;
  clinicId: string | null;
  title: string;
  type: string;
  subtype: string | null;
  content: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DocumentTemplate {
  return {
    id: r.id,
    clinicId: r.clinicId,
    title: r.title,
    type: r.type,
    subtype: r.subtype,
    content: r.content,
    isSystem: r.isSystem,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

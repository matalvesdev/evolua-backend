import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const DOCUMENT_TYPES = ['referral', 'prescription', 'document'];

export interface DocumentDTO {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  title: string;
  content: string;
  status: 'draft' | 'final';
  createdAt: string;
  updatedAt: string;
}

export interface ListDocumentsQuery {
  page: number;
  pageSize: number;
  patientId?: string;
}

function toDTO(r: {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  title: string;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): DocumentDTO {
  return {
    id: r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    type: r.type,
    title: r.title,
    content: r.content,
    status: ['approved', 'sent', 'signed'].includes(r.status) ? 'final' : 'draft',
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export class DocumentsService {
  async list(clinicId: string, q: ListDocumentsQuery) {
    const where: Prisma.ReportWhereInput = {
      clinicId,
      type: { in: DOCUMENT_TYPES },
      deletedAt: null,
      ...(q.patientId && { patientId: q.patientId }),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
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

  async create(
    clinicId: string,
    therapistId: string,
    input: {
      patientId: string;
      patientName: string;
      type: string;
      title: string;
      content?: string;
      therapistName?: string;
      therapistCrfa?: string;
    },
  ): Promise<DocumentDTO> {
    const row = await prisma.report.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: input.patientName,
        therapistId,
        therapistName: input.therapistName ?? '',
        therapistCrfa: input.therapistCrfa ?? '',
        type: input.type,
        title: input.title,
        content: input.content ?? '',
      },
    });
    return toDTO(row);
  }

  async update(
    clinicId: string,
    id: string,
    input: Partial<{
      patientId: string;
      patientName: string;
      type: string;
      title: string;
      content: string;
    }>,
  ): Promise<DocumentDTO | null> {
    const exists = await prisma.report.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.report.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.patientId !== undefined && { patientId: input.patientId }),
        ...(input.patientName !== undefined && { patientName: input.patientName }),
      },
    });
    return toDTO(row);
  }

  async remove(clinicId: string, id: string): Promise<DocumentDTO | null> {
    const exists = await prisma.report.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.report.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return toDTO(row);
  }
}

export const documentsService = new DocumentsService();

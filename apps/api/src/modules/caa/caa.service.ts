import type { CaaBoard as PrismaCaaBoard, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateCaaBoardInput,
  UpdateCaaBoardInput,
  ListCaaBoardsQuery,
} from '@evolua/contracts';

export interface PaginatedCaaBoards {
  data: PrismaCaaBoard[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

function notFoundError(): Error & { statusCode: number } {
  const err = new Error('CAA board not found') as Error & { statusCode: number };
  err.statusCode = 404;
  return err;
}

async function ensurePatientInClinic(clinicId: string, patientId: string): Promise<void> {
  const p = await prisma.patient.findFirst({
    where: { id: patientId, clinicId, deletedAt: null },
    select: { id: true },
  });
  if (!p) {
    const err = new Error('Patient not found in this clinic') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
}

export class CaaService {
  async list(
    clinicId: string,
    therapistId: string,
    query: ListCaaBoardsQuery,
  ): Promise<PaginatedCaaBoards> {
    const where: Prisma.CaaBoardWhereInput = {
      clinicId,
      therapistId,
      deletedAt: null,
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.category ? { category: query.category } : {}),
    };

    const total = await prisma.caaBoard.count({ where });
    const data = await prisma.caaBoard.findMany({
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

  async findOne(
    clinicId: string,
    therapistId: string,
    id: string,
  ): Promise<PrismaCaaBoard | null> {
    return prisma.caaBoard.findFirst({
      where: { id, clinicId, therapistId, deletedAt: null },
    });
  }

  async create(
    clinicId: string,
    therapistId: string,
    input: CreateCaaBoardInput,
  ): Promise<PrismaCaaBoard> {
    if (input.patientId) {
      await ensurePatientInClinic(clinicId, input.patientId);
    }

    return prisma.caaBoard.create({
      data: {
        clinicId,
        therapistId,
        patientId: input.patientId ?? null,
        title: input.title,
        description: input.description ?? null,
        rows: input.rows,
        cols: input.cols,
        cells: input.cells as unknown as Prisma.InputJsonValue,
        category: input.category,
        therapeuticObjective: input.therapeuticObjective ?? null,
      },
    });
  }

  async update(
    clinicId: string,
    therapistId: string,
    id: string,
    input: UpdateCaaBoardInput,
  ): Promise<PrismaCaaBoard> {
    const existing = await this.findOne(clinicId, therapistId, id);
    if (!existing) throw notFoundError();

    if (input.patientId) {
      await ensurePatientInClinic(clinicId, input.patientId);
    }

    const data: Prisma.CaaBoardUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.rows !== undefined) data.rows = input.rows;
    if (input.cols !== undefined) data.cols = input.cols;
    if (input.cells !== undefined) data.cells = input.cells as unknown as Prisma.InputJsonValue;
    if (input.category !== undefined) data.category = input.category;
    if (input.therapeuticObjective !== undefined) {
      data.therapeuticObjective = input.therapeuticObjective;
    }
    if (input.patientId !== undefined) {
      data.patient = input.patientId
        ? { connect: { id: input.patientId } }
        : { disconnect: true };
    }

    return prisma.caaBoard.update({ where: { id }, data });
  }

  async remove(clinicId: string, therapistId: string, id: string): Promise<boolean> {
    const existing = await this.findOne(clinicId, therapistId, id);
    if (!existing) return false;
    await prisma.caaBoard.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}

export const caaService = new CaaService();

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreatePatientInput,
  UpdatePatientInput,
  ListPatientsQuery,
  Patient,
} from '@evolua/contracts';
import { patientToDTO } from './patients.mapper.js';

export class PatientsService {
  /**
   * Lista pacientes da clínica do usuário autenticado.
   * Filtros: status, therapistId, busca textual (name/email/phone).
   */
  async list(clinicId: string, query: ListPatientsQuery) {
    const { page, pageSize, status, therapistId, search } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PatientWhereInput = {
      clinicId,
      deletedAt: null,
      ...(status && { status }),
      ...(therapistId && { therapistId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      data: rows.map(patientToDTO),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findById(clinicId: string, id: string): Promise<Patient | null> {
    const row = await prisma.patient.findFirst({
      where: { id, clinicId, deletedAt: null },
    });
    return row ? patientToDTO(row) : null;
  }

  async create(clinicId: string, input: CreatePatientInput): Promise<Patient> {
    const row = await prisma.patient.create({
      data: {
        clinicId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        cpf: input.cpf ?? null,
        status: input.status,
        therapistId: input.therapistId ?? null,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone ?? null,
        guardianRelationship: input.guardianRelationship ?? null,
        address: (input.address ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        medicalHistory: (input.medicalHistory ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
    return patientToDTO(row);
  }

  async update(
    clinicId: string,
    id: string,
    input: UpdatePatientInput,
  ): Promise<Patient | null> {
    // garante que patient pertence à clínica antes de atualizar
    const existing = await prisma.patient.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return null;

    const row = await prisma.patient.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.birthDate !== undefined && {
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
        }),
        ...(input.cpf !== undefined && { cpf: input.cpf }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.therapistId !== undefined && { therapistId: input.therapistId }),
        ...(input.guardianName !== undefined && { guardianName: input.guardianName }),
        ...(input.guardianPhone !== undefined && { guardianPhone: input.guardianPhone }),
        ...(input.guardianRelationship !== undefined && {
          guardianRelationship: input.guardianRelationship,
        }),
        ...(input.address !== undefined && {
          address: (input.address ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        }),
        ...(input.medicalHistory !== undefined && {
          medicalHistory: (input.medicalHistory ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        }),
      },
    });
    return patientToDTO(row);
  }

  /** Soft delete (preserva histórico clínico). */
  async remove(clinicId: string, id: string): Promise<Patient | null> {
    const existing = await prisma.patient.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return null;

    const row = await prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return patientToDTO(row);
  }
}

export const patientsService = new PatientsService();

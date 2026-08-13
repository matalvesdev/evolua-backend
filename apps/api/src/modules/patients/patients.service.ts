import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreatePatientInput,
  UpdatePatientInput,
  ListPatientsQuery,
  Patient,
  CreateMedicalRecordInput,
  UpdateMedicalRecordInput,
  ListMedicalRecordsQuery,
} from '@evolua/contracts';
import { ClinicalAreaSchema, MedicalRecordScalesSchema } from '@evolua/contracts';
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

  async listRecords(clinicId: string, q: ListMedicalRecordsQuery) {
    const where: Prisma.MedicalRecordWhereInput = {
      clinicId,
      ...(q.patientId && { patientId: q.patientId }),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.medicalRecord.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          patient: {
            select: {
              name: true,
              birthDate: true,
              appointments: {
                where: { deletedAt: null, status: 'completed' },
                orderBy: { dateTime: 'desc' },
                take: 1,
                select: { dateTime: true },
              },
              _count: { select: { appointments: { where: { deletedAt: null, status: 'completed' } } } },
            },
          },
        },
      }),
      prisma.medicalRecord.count({ where }),
    ]);
    return {
      data: rows.map((row) => ({
        id: row.id,
        clinicId: row.clinicId,
        patientId: row.patientId,
        patientName: row.patient.name,
        birthDate: row.patient.birthDate?.toISOString().slice(0, 10) ?? null,
        clinicalArea: ClinicalAreaSchema.parse(row.clinicalArea),
        diagnosis: row.diagnosis,
        anamnesis: row.anamnesis,
        scales: MedicalRecordScalesSchema.parse(row.scales),
        objectives: row.objectives,
        latestEvolution: row.latestEvolution,
        sessionCount: row.patient._count.appointments,
        lastSessionAt: row.patient.appointments[0]?.dateTime.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  }

  async createRecord(clinicId: string, therapistId: string, input: CreateMedicalRecordInput) {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) return null;
    return prisma.medicalRecord.upsert({
      where: { patientId: input.patientId },
      create: { clinicId, patientId: input.patientId, createdBy: therapistId, clinicalArea: input.clinicalArea, diagnosis: input.diagnosis },
      update: { clinicalArea: input.clinicalArea, diagnosis: input.diagnosis },
    });
  }

  async updateRecord(clinicId: string, id: string, input: UpdateMedicalRecordInput) {
    const exists = await prisma.medicalRecord.findFirst({
      where: { id, clinicId },
      select: { id: true },
    });
    if (!exists) return null;
    return prisma.medicalRecord.update({
      where: { id },
      data: {
        ...(input.clinicalArea !== undefined && { clinicalArea: input.clinicalArea }),
        ...(input.diagnosis !== undefined && { diagnosis: input.diagnosis }),
        ...(input.anamnesis !== undefined && { anamnesis: input.anamnesis }),
        ...(input.scales !== undefined && { scales: input.scales }),
        ...(input.objectives !== undefined && { objectives: input.objectives }),
        ...(input.latestEvolution !== undefined && { latestEvolution: input.latestEvolution }),
      },
    });
  }

  async getTimeline(clinicId: string, patientId: string) {
    const appointmentsPromise = prisma.appointment.findMany({
      where: { clinicId, patientId, deletedAt: null },
      orderBy: { dateTime: 'asc' },
      select: { id: true, dateTime: true, status: true, type: true },
    });

    const reportsPromise = prisma.report.findMany({
      where: { clinicId, patientId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true, type: true, title: true, status: true, approvedAt: true },
    });

    const goalsPromise = prisma.patientGoal.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, status: true, completedAt: true, createdAt: true },
    });

    const [appointments, reports, goals] = await Promise.all([
      appointmentsPromise, reportsPromise, goalsPromise,
    ]);

    const events: Array<{
      id: string; date: string; type: string; title: string; description?: string;
      score?: number; area?: string; tag?: string;
    }> = [];

    for (const a of appointments) {
      events.push({
        id: a.id,
        date: a.dateTime.toISOString(),
        type: 'appointment',
        title: `Consulta ${a.type}`,
        description: `Status: ${a.status}`,
        tag: a.status,
      });
    }

    for (const r of reports) {
      events.push({
        id: r.id,
        date: (r.approvedAt ?? r.createdAt).toISOString(),
        type: 'report',
        title: r.title,
        description: `Tipo: ${r.type} — Status: ${r.status}`,
        tag: r.status,
      });
    }

    for (const g of goals) {
      const isAchieved = g.status === 'achieved' || g.status === 'completed';
      events.push({
        id: g.id,
        date: (g.completedAt ?? g.createdAt).toISOString(),
        type: 'goal',
        title: g.title,
        description: isAchieved ? 'Meta alcançada' : `Status: ${g.status}`,
        score: isAchieved ? 100 : 0,
        tag: g.status,
      });
    }

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return events;
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

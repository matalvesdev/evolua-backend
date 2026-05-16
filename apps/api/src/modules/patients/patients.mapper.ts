import type { Patient as PrismaPatient } from '@prisma/client';
import type { Patient } from '@evolua/contracts';

/**
 * Converte registro Prisma → DTO de wire (datas em ISO string).
 * Fastify serializa Date como ISO em JSON.stringify por padrão, mas
 * mantemos contrato explícito para tipagem cruzada com Python/Go.
 */
export function patientToDTO(p: PrismaPatient): Patient {
  return {
    id: p.id,
    clinicId: p.clinicId,
    therapistId: p.therapistId,
    name: p.name,
    email: p.email,
    phone: p.phone,
    birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : null,
    cpf: p.cpf,
    status: p.status,
    guardianName: p.guardianName,
    guardianPhone: p.guardianPhone,
    guardianRelationship: p.guardianRelationship,
    address: p.address as Patient['address'],
    medicalHistory: p.medicalHistory as Patient['medicalHistory'],
    startDate: p.startDate?.toISOString() ?? null,
    dischargeDate: p.dischargeDate?.toISOString() ?? null,
    dischargeReason: p.dischargeReason,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

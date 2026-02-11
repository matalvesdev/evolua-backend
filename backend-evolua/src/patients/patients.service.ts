import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto, UpdatePatientDto, SearchPatientsDto, ChangeStatusDto } from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Patient, Prisma } from '@prisma/client';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreatePatientDto): Promise<Patient> {
    return this.prisma.patient.create({
      data: {
        clinicId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        cpf: dto.cpf,
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
        guardianRelationship: dto.guardianRelationship,
        therapistId: dto.therapistId,
        address: dto.address as Prisma.InputJsonValue,
        medicalHistory: dto.medicalHistory as Prisma.InputJsonValue,
        startDate: new Date(),
      },
    });
  }

  async findAll(clinicId: string, query: SearchPatientsDto): Promise<PaginatedResponseDto<Patient>> {
    const where: Prisma.PatientWhereInput = { clinicId };

    if (query.status) where.status = query.status;
    if (query.therapistId) where.therapistId = query.therapistId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { cpf: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }

    const [patients, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { therapist: { select: { id: true, fullName: true } } },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return new PaginatedResponseDto(patients, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOne(id: string, clinicId: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, clinicId },
      include: {
        therapist: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }

  async update(id: string, clinicId: string, dto: UpdatePatientDto): Promise<Patient> {
    await this.findOne(id, clinicId);

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        ...(dto.cpf !== undefined && { cpf: dto.cpf }),
        ...(dto.status && { status: dto.status }),
        ...(dto.guardianName !== undefined && { guardianName: dto.guardianName }),
        ...(dto.guardianPhone !== undefined && { guardianPhone: dto.guardianPhone }),
        ...(dto.guardianRelationship !== undefined && { guardianRelationship: dto.guardianRelationship }),
        ...(dto.therapistId !== undefined && { therapistId: dto.therapistId }),
        ...(dto.address && { address: dto.address as Prisma.InputJsonValue }),
        ...(dto.medicalHistory && { medicalHistory: dto.medicalHistory as Prisma.InputJsonValue }),
      },
    });
  }

  async changeStatus(id: string, clinicId: string, userId: string, dto: ChangeStatusDto): Promise<Patient> {
    await this.findOne(id, clinicId);

    return this.prisma.patient.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'discharged' && { dischargeDate: new Date(), dischargeReason: dto.reason }),
      },
    });
  }

  async remove(id: string, clinicId: string): Promise<void> {
    await this.findOne(id, clinicId);
    await this.prisma.patient.delete({ where: { id } });
  }
}

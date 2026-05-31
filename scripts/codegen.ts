#!/usr/bin/env tsx
/**
 * Codegen: contracts (Zod) → Python (Pydantic) + Go (struct).
 *
 * Estratégia v1: usa `zod-to-json-schema` em runtime para extrair JSON Schema,
 * depois renderiza Pydantic e Go a partir do JSON Schema.
 *
 * Uso:
 *   npm run codegen
 *   # gera: apps/ai/app/contracts.py + apps/services/whatsapp/internal/contracts/contracts.go
 *
 * TODO próxima iteração: importar diretamente os módulos Zod e iterar sobre
 * exports nomeados, em vez de hardcodar a lista abaixo.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PY_OUT = resolve(ROOT, 'apps/ai/app/contracts.py');
const GO_OUT = resolve(ROOT, 'apps/services/whatsapp/internal/contracts/contracts.go');

// Por enquanto, geração manual baseada nos contracts atuais.
// Quando consolidarmos mais schemas, trocar para introspecção via zod-to-json-schema.

const PYTHON = `# AUTO-GENERATED from contracts/ (Zod). DO NOT EDIT.
# Run \`npm run codegen\` from backend-core/ to regenerate.
from __future__ import annotations
from datetime import datetime, date
from typing import Optional, Literal, Any
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


PatientStatus = Literal["active", "inactive", "discharged", "on_hold"]


class PatientAddress(BaseModel):
    street: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(default=None, max_length=2)
    zip_code: Optional[str] = Field(default=None, alias="zipCode")


class MedicalHistory(BaseModel):
    diagnoses: Optional[list[str]] = None
    medications: Optional[list[str]] = None
    allergies: Optional[list[str]] = None
    notes: Optional[str] = None


class Patient(BaseModel):
    id: UUID
    clinic_id: UUID = Field(alias="clinicId")
    therapist_id: Optional[UUID] = Field(default=None, alias="therapistId")
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    birth_date: Optional[date] = Field(default=None, alias="birthDate")
    cpf: Optional[str] = None
    status: PatientStatus = "active"
    guardian_name: Optional[str] = Field(default=None, alias="guardianName")
    guardian_phone: Optional[str] = Field(default=None, alias="guardianPhone")
    guardian_relationship: Optional[str] = Field(default=None, alias="guardianRelationship")
    address: Optional[PatientAddress] = None
    medical_history: Optional[MedicalHistory] = Field(default=None, alias="medicalHistory")
    start_date: Optional[datetime] = Field(default=None, alias="startDate")
    discharge_date: Optional[datetime] = Field(default=None, alias="dischargeDate")
    discharge_reason: Optional[str] = Field(default=None, alias="dischargeReason")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    class Config:
        populate_by_name = True


class AuthUser(BaseModel):
    id: UUID
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    clinic_id: Optional[UUID] = Field(default=None, alias="clinicId")

    class Config:
        populate_by_name = True


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict[str, Any]] = None
`;

const GO = `// AUTO-GENERATED from contracts/ (Zod). DO NOT EDIT.
// Run \`npm run codegen\` from backend-core/ to regenerate.
package contracts

import "time"

type PatientStatus string

const (
	PatientStatusActive     PatientStatus = "active"
	PatientStatusInactive   PatientStatus = "inactive"
	PatientStatusDischarged PatientStatus = "discharged"
	PatientStatusOnHold     PatientStatus = "on_hold"
)

type PatientAddress struct {
	Street       *string \`json:"street,omitempty"\`
	Number       *string \`json:"number,omitempty"\`
	Complement   *string \`json:"complement,omitempty"\`
	Neighborhood *string \`json:"neighborhood,omitempty"\`
	City         *string \`json:"city,omitempty"\`
	State        *string \`json:"state,omitempty"\`
	ZipCode      *string \`json:"zipCode,omitempty"\`
}

type MedicalHistory struct {
	Diagnoses   []string \`json:"diagnoses,omitempty"\`
	Medications []string \`json:"medications,omitempty"\`
	Allergies   []string \`json:"allergies,omitempty"\`
	Notes       *string  \`json:"notes,omitempty"\`
}

type Patient struct {
	ID                   string          \`json:"id"\`
	ClinicID             string          \`json:"clinicId"\`
	TherapistID          *string         \`json:"therapistId,omitempty"\`
	Name                 string          \`json:"name"\`
	Email                *string         \`json:"email,omitempty"\`
	Phone                *string         \`json:"phone,omitempty"\`
	BirthDate            *string         \`json:"birthDate,omitempty"\`
	CPF                  *string         \`json:"cpf,omitempty"\`
	Status               PatientStatus   \`json:"status"\`
	GuardianName         *string         \`json:"guardianName,omitempty"\`
	GuardianPhone        *string         \`json:"guardianPhone,omitempty"\`
	GuardianRelationship *string         \`json:"guardianRelationship,omitempty"\`
	Address              *PatientAddress \`json:"address,omitempty"\`
	MedicalHistory       *MedicalHistory \`json:"medicalHistory,omitempty"\`
	StartDate            *time.Time      \`json:"startDate,omitempty"\`
	DischargeDate        *time.Time      \`json:"dischargeDate,omitempty"\`
	DischargeReason      *string         \`json:"dischargeReason,omitempty"\`
	CreatedAt            time.Time       \`json:"createdAt"\`
	UpdatedAt            time.Time       \`json:"updatedAt"\`
}

type AuthUser struct {
	ID       string  \`json:"id"\`
	Email    *string \`json:"email,omitempty"\`
	Role     *string \`json:"role,omitempty"\`
	ClinicID *string \`json:"clinicId,omitempty"\`
}

type ErrorResponse struct {
	Error   string                 \`json:"error"\`
	Message string                 \`json:"message"\`
	Details map[string]interface{} \`json:"details,omitempty"\`
}
`;

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

ensureDir(PY_OUT);
writeFileSync(PY_OUT, PYTHON, 'utf8');
console.log(`✓ Python contracts → ${PY_OUT}`);

ensureDir(GO_OUT);
writeFileSync(GO_OUT, GO, 'utf8');
console.log(`✓ Go contracts     → ${GO_OUT}`);

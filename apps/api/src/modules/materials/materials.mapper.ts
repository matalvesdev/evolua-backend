import type { TherapeuticMaterial as PrismaMaterial } from '@prisma/client';
import type { Material, TherapyArea, MaterialFormat } from '@evolua/contracts';
import { parseMeta } from './materials.service.js';

const VALID_AREAS: TherapyArea[] = [
  'linguagem',
  'fala',
  'fluencia',
  'voz',
  'degluticao',
  'fonologia',
  'mof',
  'tea',
  'caa',
];
const VALID_FORMATS: MaterialFormat[] = [
  'atividade',
  'brincadeira',
  'jogo',
  'historia',
  'exercicio',
  'roteiro',
];

export const materialsMapper = {
  toDto(m: PrismaMaterial): Material {
    const meta = parseMeta(m.tags);
    const area = (VALID_AREAS.includes(m.area as TherapyArea) ? m.area : 'linguagem') as TherapyArea;
    const formatFromMeta = meta.format ?? (m.type as MaterialFormat);
    const format = (VALID_FORMATS.includes(formatFromMeta) ? formatFromMeta : 'atividade') as MaterialFormat;
    return {
      id: m.id,
      clinicId: m.clinicId,
      therapistId: m.therapistId,
      title: m.title,
      description: m.description,
      area,
      format,
      ageGroup: meta.ageGroup,
      content: m.content ?? '',
      objectives: meta.objectives,
      materialsNeeded: meta.materialsNeeded,
      durationMinutes: meta.durationMinutes,
      tags: meta.userTags,
      fileUrl: m.fileUrl,
      isPublic: m.isPublic,
      isAiGenerated: meta.isAiGenerated,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  },
};

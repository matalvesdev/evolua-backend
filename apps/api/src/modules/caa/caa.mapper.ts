import type { CaaBoard as PrismaCaaBoard } from '@prisma/client';
import { CaaCellSchema, type CaaBoard, type CaaCell } from '@evolua/contracts';
import { z } from 'zod';

const CellsArraySchema = z.array(CaaCellSchema);

export const caaMapper = {
  toDto(b: PrismaCaaBoard): CaaBoard {
    let cells: CaaCell[] = [];
    const parsed = CellsArraySchema.safeParse(b.cells);
    if (parsed.success) {
      cells = parsed.data;
    }

    return {
      id: b.id,
      clinicId: b.clinicId,
      therapistId: b.therapistId,
      patientId: b.patientId,
      title: b.title,
      description: b.description,
      rows: b.rows,
      cols: b.cols,
      cells,
      category: b.category,
      therapeuticObjective: b.therapeuticObjective,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  },
};

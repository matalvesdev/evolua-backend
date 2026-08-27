import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  appointment: { findMany: vi.fn(), groupBy: vi.fn() },
  patient: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
const { DashboardService } = await import('./dashboard.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.appointment.findMany.mockResolvedValue([]);
  prismaMock.patient.findMany.mockResolvedValue([]);
  prismaMock.$queryRaw.mockResolvedValue([]);
  prismaMock.appointment.groupBy.mockResolvedValue([]);
});

describe('DashboardService analytics', () => {
  it('agrupa receita diária pela expressão selecionada sem repetir o parâmetro de timezone', async () => {
    const result = await new DashboardService().getAnalytics(
      '00000000-0000-0000-0000-000000000000',
      '30d',
    );

    const [queryParts] = prismaMock.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    const sql = queryParts.join(' ');
    expect(sql).toContain('GROUP BY 1');
    expect(sql.match(/AT TIME ZONE/g)).toHaveLength(1);
    expect(result.revenue.labels).toHaveLength(30);
  });

  it('honra o período anual solicitado pela interface', async () => {
    const result = await new DashboardService().getAnalytics(
      '00000000-0000-0000-0000-000000000000',
      '12m',
    );

    expect(result.revenue.labels).toHaveLength(365);
  });

  it('usa agrupamento posicional também na receita mensal', async () => {
    await new DashboardService().getRevenueByMonth(
      '00000000-0000-0000-0000-000000000000',
      6,
    );

    const [queryParts] = prismaMock.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    const sql = queryParts.join(' ');
    expect(sql).toContain('GROUP BY 1');
    expect(sql.match(/AT TIME ZONE/g)).toHaveLength(1);
  });
});

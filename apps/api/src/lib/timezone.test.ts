import { describe, expect, it } from 'vitest';
import { clinicDayKey, clinicDayRange, clinicDayRangeEndingToday } from './timezone.js';

describe('clinic timezone helpers', () => {
  it('calcula os limites UTC do dia em São Paulo, sem usar o timezone do host', () => {
    const instant = new Date('2026-08-17T02:00:00.000Z');
    const range = clinicDayRange(instant);

    expect(range.start.toISOString()).toBe('2026-08-16T03:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-08-17T03:00:00.000Z');
    expect(clinicDayKey(instant)).toBe('2026-08-16');
  });

  it('inclui o dia local atual nas janelas de analytics', () => {
    const window = clinicDayRangeEndingToday(3, new Date('2026-08-17T15:00:00.000Z'));

    expect(window.keys).toEqual(['2026-08-15', '2026-08-16', '2026-08-17']);
    expect(window.start.toISOString()).toBe('2026-08-15T03:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-08-18T03:00:00.000Z');
  });
});

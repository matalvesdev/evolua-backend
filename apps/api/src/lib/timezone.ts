/**
 * O banco armazena instantes UTC. Até existir timezone configurável por
 * clínica, os workflows Brasil-first usam este fallback explícito; nunca o
 * timezone do host Render/local para decidir "hoje".
 */
export const DEFAULT_CLINIC_TIME_ZONE = 'America/Sao_Paulo';

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): number => {
    const raw = parts.find((part) => part.type === type)?.value;
    if (!raw) throw new Error(`Missing ${type} in timezone conversion`);
    return Number(raw);
  };
  return {
    year: value('year'), month: value('month'), day: value('day'),
    hour: value('hour'), minute: value('minute'), second: value('second'),
  };
}

function offsetAt(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  ) - date.getTime();
}

function zonedDateTimeToUtc(parts: ZonedDateParts, timeZone: string): Date {
  const guess = new Date(Date.UTC(
    parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second,
  ));
  // Recalculate once so the conversion remains valid around DST transitions
  // for tenants that later configure a timezone with DST.
  const firstPass = new Date(guess.getTime() - offsetAt(guess, timeZone));
  return new Date(guess.getTime() - offsetAt(firstPass, timeZone));
}

function addCalendarDays(parts: ZonedDateParts, days: number): ZonedDateParts {
  const calendar = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: calendar.getUTCFullYear(),
    month: calendar.getUTCMonth() + 1,
    day: calendar.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  };
}

export function startOfClinicDay(date = new Date(), timeZone = DEFAULT_CLINIC_TIME_ZONE): Date {
  const local = zonedParts(date, timeZone);
  return zonedDateTimeToUtc({ ...local, hour: 0, minute: 0, second: 0 }, timeZone);
}

export function clinicDayRange(date = new Date(), timeZone = DEFAULT_CLINIC_TIME_ZONE): {
  start: Date;
  end: Date;
} {
  const local = zonedParts(date, timeZone);
  const start = zonedDateTimeToUtc({ ...local, hour: 0, minute: 0, second: 0 }, timeZone);
  const end = zonedDateTimeToUtc(addCalendarDays(local, 1), timeZone);
  return { start, end };
}

export function clinicDayKey(date: Date, timeZone = DEFAULT_CLINIC_TIME_ZONE): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

export function clinicDayRangeEndingToday(
  days: number,
  date = new Date(),
  timeZone = DEFAULT_CLINIC_TIME_ZONE,
): { start: Date; end: Date; keys: string[] } {
  const local = zonedParts(date, timeZone);
  const first = addCalendarDays(local, -(days - 1));
  const start = zonedDateTimeToUtc(first, timeZone);
  const end = zonedDateTimeToUtc(addCalendarDays(local, 1), timeZone);
  const keys = Array.from({ length: days }, (_, index) => {
    const day = addCalendarDays(first, index);
    return `${day.year.toString().padStart(4, '0')}-${day.month.toString().padStart(2, '0')}-${day.day.toString().padStart(2, '0')}`;
  });
  return { start, end, keys };
}

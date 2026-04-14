import type { HomestaySeasonalPricing } from '../types/homestay.types';

const parseDateOnly = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value.slice(0, 10));
  if (!match) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isWithinRange = (date: Date, start: Date, end: Date) => {
  return date >= start && date <= end;
};

const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) => {
  return startA <= endB && endA >= startB;
};

const sortByStartDate = (items: HomestaySeasonalPricing[]) => {
  return [...items].sort((left, right) => {
    const leftStart = parseDateOnly(left.startDate)?.getTime() ?? 0;
    const rightStart = parseDateOnly(right.startDate)?.getTime() ?? 0;
    return leftStart - rightStart;
  });
};

export const getActiveSeasonalPricing = (
  seasonalPricings?: HomestaySeasonalPricing[] | null,
  date: string | Date = new Date(),
) => {
  if (!seasonalPricings?.length) return null;

  const targetDate = typeof date === 'string' ? parseDateOnly(date) : new Date(date);
  if (!targetDate || Number.isNaN(targetDate.getTime())) return null;
  targetDate.setHours(0, 0, 0, 0);

  for (const pricing of sortByStartDate(seasonalPricings)) {
    const startDate = parseDateOnly(pricing.startDate);
    const endDate = parseDateOnly(pricing.endDate);
    if (!startDate || !endDate) continue;

    if (isWithinRange(targetDate, startDate, endDate)) {
      return pricing;
    }
  }

  return null;
};

export const getSeasonalPricingForStay = (
  seasonalPricings?: HomestaySeasonalPricing[] | null,
  checkIn?: string,
  checkOut?: string,
) => {
  if (!seasonalPricings?.length) return null;
  if (!checkIn) return getActiveSeasonalPricing(seasonalPricings, new Date());

  const stayStart = parseDateOnly(checkIn);
  const stayEnd = parseDateOnly(checkOut ?? checkIn);
  if (!stayStart || !stayEnd) return null;

  for (const pricing of sortByStartDate(seasonalPricings)) {
    const seasonStart = parseDateOnly(pricing.startDate);
    const seasonEnd = parseDateOnly(pricing.endDate);
    if (!seasonStart || !seasonEnd) continue;

    if (rangesOverlap(stayStart, stayEnd, seasonStart, seasonEnd)) {
      return pricing;
    }
  }

  return null;
};

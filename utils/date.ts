import { Month } from '@/src/types';

export function generateMonthsFromStart(startMonth: Month): Month[] {
  const [startYear, startMonthNum] = startMonth.split('-').map(Number);

  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1; // 1–12

  const result: Month[] = [];

  let year = startYear;
  let month = startMonthNum;

  while (
    year < endYear ||
    (year === endYear && month <= endMonth)
  ) {
    result.push(`${year}-${String(month).padStart(2, '0')}` as Month);

    month++;
    if (month === 13) {
      month = 1;
      year++;
    }
  }

  return result;
}

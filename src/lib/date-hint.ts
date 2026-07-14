const MAX_MONTH = 12;
const MAX_DAY = 31;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildKstDate(year: number, month: number, day: number, hour = 0, minute = 0): Date | null {
  if (month < 1 || month > MAX_MONTH || day < 1 || day > MAX_DAY) {
    return null;
  }

  const date = new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// 연도가 없는 "M월 D일" 표기는 현재 시점에서 ±6개월 범위로 가장 가까운 연도로 해석한다.
function resolveYear(month: number, now: Date) {
  const currentMonth = now.getMonth() + 1;
  if (month < currentMonth - 6) {
    return now.getFullYear() + 1;
  }
  if (month > currentMonth + 6) {
    return now.getFullYear() - 1;
  }
  return now.getFullYear();
}

const FULL_DATE_PATTERN =
  /(20\d{2})[년.\-/]\s*(\d{1,2})[월.\-/]\s*(\d{1,2})일?\.?(?:\s*\([^)]{1,3}\))?(?:[^\d]{0,4}(\d{1,2}):(\d{2}))?/;

const MONTH_DAY_TIME_PATTERN = /(\d{1,2})월\s*(\d{1,2})일(?:\s*\([^)]{1,3}\))?\s*(\d{1,2}):(\d{2})/;

/**
 * 날짜 필드가 비어 있는 행사에서 제목/설명 텍스트로 시작 일시를 추정한다.
 * "2026. 7. 20.(월) 13:30", "2026-06-11", "6월 10일 (수) 19:00" 형태를 지원한다.
 */
export function extractStartDateHint(
  texts: Array<string | null | undefined>,
  now = new Date(),
): Date | null {
  for (const text of texts) {
    if (!text) {
      continue;
    }

    const fullMatch = text.match(FULL_DATE_PATTERN);
    if (fullMatch) {
      const hinted = buildKstDate(
        Number(fullMatch[1]),
        Number(fullMatch[2]),
        Number(fullMatch[3]),
        Number(fullMatch[4] ?? 0),
        Number(fullMatch[5] ?? 0),
      );
      if (hinted) {
        return hinted;
      }
    }

    const monthDayMatch = text.match(MONTH_DAY_TIME_PATTERN);
    if (monthDayMatch) {
      const month = Number(monthDayMatch[1]);
      const hinted = buildKstDate(
        resolveYear(month, now),
        month,
        Number(monthDayMatch[2]),
        Number(monthDayMatch[3]),
        Number(monthDayMatch[4]),
      );
      if (hinted) {
        return hinted;
      }
    }
  }

  return null;
}

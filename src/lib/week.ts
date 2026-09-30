import type { DayKey } from '../types'

const TZ = 'Asia/Taipei'

/** Artale 週：週二 → 隔週一 */
export const ARTALE_DAYS: { key: DayKey; label: string }[] = [
  { key: 'tue', label: '二' },
  { key: 'wed', label: '三' },
  { key: 'thu', label: '四' },
  { key: 'fri', label: '五' },
  { key: 'sat', label: '六' },
  { key: 'sun', label: '日' },
  { key: 'mon', label: '一' },
]

function taipeiParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date)

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? ''

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: get('weekday'),
  }
}

/** 距離本週「週二」的偏移：Tue=0 … Mon=6 */
function offsetFromTuesday(weekday: string): number {
  const map: Record<string, number> = {
    Tue: 0,
    Wed: 1,
    Thu: 2,
    Fri: 3,
    Sat: 4,
    Sun: 5,
    Mon: 6,
  }
  return map[weekday] ?? 0
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

function addDaysUTC(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + delta))
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }
}

/** 目前 Artale 週的起始日（週二）YYYY-MM-DD */
export function currentWeekId(date = new Date()): string {
  const { year, month, day, weekday } = taipeiParts(date)
  const start = addDaysUTC(year, month, day, -offsetFromTuesday(weekday))
  return formatYmd(start.year, start.month, start.day)
}

export function getWeekInfo(weekId = currentWeekId()) {
  const [y, m, d] = weekId.split('-').map(Number)
  const days = ARTALE_DAYS.map((day, i) => {
    const dt = addDaysUTC(y, m, d, i)
    return {
      key: day.key,
      label: day.label,
      dateLabel: `${dt.month}/${dt.day}`,
    }
  })
  const start = days[0]
  const end = days[6]
  return {
    id: weekId,
    startLabel: start?.dateLabel ?? '',
    endLabel: end?.dateLabel ?? '',
    rangeText: `${start?.dateLabel ?? ''}（二）– ${end?.dateLabel ?? ''}（一）`,
    dayLabels: days,
  }
}

export function weekRangeText(weekId = currentWeekId()): string {
  return getWeekInfo(weekId).rangeText
}

/** 預設團名，例如「9/30到10/6-一團」 */
export function defaultPartyName(weekId = currentWeekId()): string {
  const { startLabel, endLabel } = getWeekInfo(weekId)
  return `${startLabel}到${endLabel}-一團`
}

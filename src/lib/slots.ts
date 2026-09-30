import type { DayKey, Member, PartyTime, SlotKey, SlotMinute } from '../types'
import { ARTALE_DAYS } from './week'

export const DAYS = ARTALE_DAYS

/** 08:00–24:00，每小時一格（起始小時）；格內可選 :00 / :30 */
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] as const

export function slotKey(
  day: DayKey,
  hour: number,
  minute: SlotMinute = 0,
): SlotKey {
  return `${day}-${hour}:${String(minute).padStart(2, '0')}`
}

/** 舊資料 "tue-21" → "tue-21:00" */
export function normalizeSlot(slot: string): SlotKey {
  const match = /^([a-z]+)-(\d+)(?::(\d{2}))?$/.exec(slot)
  if (!match) return slot as SlotKey
  const minute: SlotMinute = match[3] === '30' ? 30 : 0
  return slotKey(match[1] as DayKey, Number(match[2]), minute)
}

export function parseSlot(slot: string): {
  day: DayKey
  hour: number
  minute: SlotMinute
} {
  const n = normalizeSlot(slot)
  const match = /^([a-z]+)-(\d+):(\d{2})$/.exec(n)!
  return {
    day: match[1] as DayKey,
    hour: Number(match[2]),
    minute: match[3] === '30' ? 30 : 0,
  }
}

export function formatSlot(slot: string): string {
  const { day, hour, minute } = parseSlot(slot)
  const label = DAYS.find((d) => d.key === day)?.label ?? day
  return `週${label} ${hour}:${String(minute).padStart(2, '0')}`
}

export function partyTime(
  day: DayKey,
  hour: number,
  minute: SlotMinute = 0,
): PartyTime {
  return slotKey(day, hour, minute)
}

export function parsePartyTime(time: PartyTime) {
  return parseSlot(time)
}

export function formatPartyTime(time: PartyTime): string {
  return formatSlot(time)
}

export function allSlots(): SlotKey[] {
  return DAYS.flatMap((d) =>
    HOURS.flatMap((h) => [slotKey(d.key, h, 0), slotKey(d.key, h, 30)]),
  )
}

export function hourCellKeys(day: DayKey, hour: number): [SlotKey, SlotKey] {
  return [slotKey(day, hour, 0), slotKey(day, hour, 30)]
}

/** 該小時格目前選到 :00 / :30 / 未選（同一小時不會同時有兩個） */
export function myMinuteAt(
  availability: string[],
  day: DayKey,
  hour: number,
): SlotMinute | null {
  const set = new Set(availability.map(normalizeSlot))
  const [s00, s30] = hourCellKeys(day, hour)
  if (set.has(s00)) return 0
  if (set.has(s30)) return 30
  return null
}

/** 點擊循環：無 → :00 → :30 → 無 */
export function cycleHourAvailability(
  availability: SlotKey[],
  day: DayKey,
  hour: number,
): SlotKey[] {
  const [s00, s30] = hourCellKeys(day, hour)
  const others = availability
    .map(normalizeSlot)
    .filter((s) => s !== s00 && s !== s30)
  const current = myMinuteAt(availability, day, hour)
  if (current === null) return [...others, s00]
  if (current === 0) return [...others, s30]
  return others
}

export function countBySlot(members: Member[]): Record<SlotKey, number> {
  const counts = Object.fromEntries(allSlots().map((s) => [s, 0])) as Record<
    SlotKey,
    number
  >
  for (const m of members) {
    for (const s of m.availability) {
      const key = normalizeSlot(s)
      if (key in counts) counts[key] += 1
    }
  }
  return counts
}

/** 小時格熱力：該小時 :00 與 :30 人數加總（同一人只會有其中一個） */
export function countByHourCell(
  members: Member[],
  day: DayKey,
  hour: number,
): number {
  const counts = countBySlot(members)
  const [s00, s30] = hourCellKeys(day, hour)
  return (counts[s00] ?? 0) + (counts[s30] ?? 0)
}

export function nicknamesForSlot(members: Member[], slot: string): string[] {
  const key = normalizeSlot(slot)
  return members
    .filter((m) => m.availability.map(normalizeSlot).includes(key))
    .map((m) => m.nickname)
}

export function nicknamesForHourCell(
  members: Member[],
  day: DayKey,
  hour: number,
): { minute: SlotMinute; names: string[] }[] {
  return ([0, 30] as SlotMinute[])
    .map((minute) => ({
      minute,
      names: nicknamesForSlot(members, slotKey(day, hour, minute)),
    }))
    .filter((x) => x.names.length > 0)
}

export function topSlots(
  members: Member[],
  limit = 5,
): { slot: SlotKey; count: number }[] {
  const counts = countBySlot(members)
  return (Object.entries(counts) as [SlotKey, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([slot, count]) => ({ slot, count }))
}

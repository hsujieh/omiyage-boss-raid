import type { DayKey, Member, PartyTime, SlotKey, SlotMinute } from '../types'
import { ARTALE_DAYS } from './week'

export const DAYS = ARTALE_DAYS

/** 08:00–24:00，每小時一格（起始小時） */
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] as const

export function slotKey(day: DayKey, hour: number): SlotKey {
  return `${day}-${hour}` as SlotKey
}

export function parseSlot(slot: SlotKey): { day: DayKey; hour: number } {
  const [day, hour] = slot.split('-')
  return { day: day as DayKey, hour: Number(hour) }
}

export function formatSlot(slot: SlotKey): string {
  const { day, hour } = parseSlot(slot)
  const label = DAYS.find((d) => d.key === day)?.label ?? day
  return `週${label} ${hour}:00`
}

export function partyTime(
  day: DayKey,
  hour: number,
  minute: SlotMinute = 0,
): PartyTime {
  return `${day}-${hour}:${String(minute).padStart(2, '0')}`
}

/** 相容舊資料 "tue-21"（視為 :00）與 "tue-21:30" */
export function parsePartyTime(time: PartyTime): {
  day: DayKey
  hour: number
  minute: SlotMinute
} {
  const match = /^([a-z]+)-(\d+)(?::(\d{2}))?$/.exec(time)
  if (!match) {
    const { day, hour } = parseSlot(time as SlotKey)
    return { day, hour, minute: 0 }
  }
  const minuteRaw = Number(match[3] ?? '0')
  return {
    day: match[1] as DayKey,
    hour: Number(match[2]),
    minute: minuteRaw === 30 ? 30 : 0,
  }
}

export function formatPartyTime(time: PartyTime): string {
  const { day, hour, minute } = parsePartyTime(time)
  const label = DAYS.find((d) => d.key === day)?.label ?? day
  return `週${label} ${hour}:${String(minute).padStart(2, '0')}`
}

export function partyTimeFromSlot(
  slot: SlotKey,
  minute: SlotMinute = 0,
): PartyTime {
  const { day, hour } = parseSlot(slot)
  return partyTime(day, hour, minute)
}

export function allSlots(): SlotKey[] {
  return DAYS.flatMap((d) => HOURS.map((h) => slotKey(d.key, h)))
}

export function countBySlot(members: Member[]): Record<SlotKey, number> {
  const counts = Object.fromEntries(allSlots().map((s) => [s, 0])) as Record<
    SlotKey,
    number
  >
  for (const m of members) {
    for (const s of m.availability) {
      if (s in counts) counts[s] += 1
    }
  }
  return counts
}

export function nicknamesForSlot(members: Member[], slot: SlotKey): string[] {
  return members
    .filter((m) => m.availability.includes(slot))
    .map((m) => m.nickname)
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

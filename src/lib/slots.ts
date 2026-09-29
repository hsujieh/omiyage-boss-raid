import type { DayKey, Member, SlotKey } from '../types'
import { ARTALE_DAYS } from './week'

export const DAYS = ARTALE_DAYS

/** 14:00–24:00，每小時一格（起始小時） */
export const HOURS = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23] as const

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

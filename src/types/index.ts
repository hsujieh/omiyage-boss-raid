export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

/** 時段鍵，例如 "tue-21" */
export type SlotKey = `${DayKey}-${number}`

export interface WeekInfo {
  id: string
  startLabel: string
  endLabel: string
  rangeText: string
  dayLabels: { key: DayKey; label: string; dateLabel: string }[]
}

export interface Member {
  id: string
  nickname: string
  availability: SlotKey[]
  updatedAt: number
}

export interface Party {
  id: string
  name: string
  maxSize: number
  slot: SlotKey | null
  memberIds: string[]
  createdBy: string
  createdAt: number
}

export interface CreatePartyInput {
  name: string
  maxSize: number
  slot?: SlotKey | null
  createdBy: string
}

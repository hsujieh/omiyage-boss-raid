export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

/** 空檔時段鍵，例如 "tue-21:00" / "tue-21:30"；舊資料 "tue-21" 視為 :00 */
export type SlotKey = string

/** 打王時間（與空檔鍵相同格式） */
export type PartyTime = string

export type SlotMinute = 0 | 30

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
  slot: PartyTime | null
  memberIds: string[]
  createdBy: string
  createdAt: number
}

export interface CreatePartyInput {
  name: string
  maxSize: number
  slot?: PartyTime | null
  createdBy: string
}

import { GUILD_ID } from '../lib/guild'
import { currentWeekId, defaultPartyName } from '../lib/week'
import type { CreatePartyInput, Member, Party, PartyTime, SlotKey } from '../types'

const STORAGE_KEY = 'artale-local-db-v4'
const CHANNEL = 'artale-local-sync'

interface PartyBundle extends Party {
  members: Record<string, Member>
}

interface WeekBundle {
  id: string
  parties: Record<string, PartyBundle>
}

interface LocalDb {
  guildId: string
  weeks: Record<string, WeekBundle>
}

function emptyDb(): LocalDb {
  return { guildId: GUILD_ID, weeks: {} }
}

function read(): LocalDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDb()
    return { ...emptyDb(), ...JSON.parse(raw) } as LocalDb
  } catch {
    return emptyDb()
  }
}

function write(db: LocalDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  try {
    const bc = new BroadcastChannel(CHANNEL)
    bc.postMessage('sync')
    bc.close()
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('artale-local-sync'))
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

function ensureWeek(db: LocalDb, weekId: string): WeekBundle {
  if (!db.weeks[weekId]) {
    db.weeks[weekId] = { id: weekId, parties: {} }
  }
  return db.weeks[weekId]
}

function toPublicParty(bundle: PartyBundle): Party {
  const { members: _m, ...party } = bundle
  return party
}

export function ensureCurrentWeek(): string {
  const weekId = currentWeekId()
  const db = read()
  const week = ensureWeek(db, weekId)
  for (const id of Object.keys(db.weeks)) {
    if (id !== weekId) delete db.weeks[id]
  }
  if (Object.keys(week.parties).length === 0) {
    week.parties.default = {
      id: 'default',
      name: defaultPartyName(weekId),
      maxSize: 6,
      slot: null,
      memberIds: [],
      createdBy: 'system',
      createdAt: Date.now(),
      members: {},
    }
  } else if (week.parties.default?.name === '本週打王') {
    week.parties.default.name = defaultPartyName(weekId)
  }
  write(db)
  return weekId
}

export function subscribeParties(
  weekId: string,
  onData: (parties: Party[]) => void,
): () => void {
  const emit = () => {
    const week = read().weeks[weekId]
    const parties = Object.values(week?.parties ?? {})
      .map(toPublicParty)
      .sort((a, b) => a.createdAt - b.createdAt)
    onData(parties)
  }
  emit()
  const onSync = () => emit()
  window.addEventListener('artale-local-sync', onSync)
  window.addEventListener('storage', onSync)
  let bc: BroadcastChannel | null = null
  try {
    bc = new BroadcastChannel(CHANNEL)
    bc.onmessage = () => emit()
  } catch {
    bc = null
  }
  return () => {
    window.removeEventListener('artale-local-sync', onSync)
    window.removeEventListener('storage', onSync)
    bc?.close()
  }
}

export function subscribeParty(
  weekId: string,
  partyId: string,
  onData: (data: { party: Party | null; members: Member[] }) => void,
): () => void {
  const emit = () => {
    const bundle = read().weeks[weekId]?.parties[partyId]
    if (!bundle) {
      onData({ party: null, members: [] })
      return
    }
    onData({
      party: toPublicParty(bundle),
      members: Object.values(bundle.members),
    })
  }
  emit()
  const onSync = () => emit()
  window.addEventListener('artale-local-sync', onSync)
  window.addEventListener('storage', onSync)
  let bc: BroadcastChannel | null = null
  try {
    bc = new BroadcastChannel(CHANNEL)
    bc.onmessage = () => emit()
  } catch {
    bc = null
  }
  return () => {
    window.removeEventListener('artale-local-sync', onSync)
    window.removeEventListener('storage', onSync)
    bc?.close()
  }
}

export function createParty(weekId: string, input: CreatePartyInput): string {
  const db = read()
  const week = ensureWeek(db, weekId)
  const id = makeId()
  week.parties[id] = {
    id,
    name: input.name.trim() || '未命名團',
    maxSize: Math.max(1, Math.floor(input.maxSize)),
    slot: input.slot ?? null,
    memberIds: [input.createdBy],
    createdBy: input.createdBy,
    createdAt: Date.now(),
    members: {},
  }
  write(db)
  return id
}

export function upsertPartyMember(
  weekId: string,
  partyId: string,
  memberId: string,
  nickname: string,
  availability: SlotKey[] = [],
): void {
  const db = read()
  const party = db.weeks[weekId]?.parties[partyId]
  if (!party) throw new Error('找不到此團')
  const prev = party.members[memberId]
  party.members[memberId] = {
    id: memberId,
    nickname: nickname.trim(),
    availability: prev?.availability ?? availability,
    updatedAt: Date.now(),
  }
  write(db)
}

export function setPartyAvailability(
  weekId: string,
  partyId: string,
  memberId: string,
  availability: SlotKey[],
): void {
  const db = read()
  const m = db.weeks[weekId]?.parties[partyId]?.members[memberId]
  if (!m) return
  m.availability = availability
  m.updatedAt = Date.now()
  write(db)
}

export function joinParty(weekId: string, partyId: string, memberId: string): void {
  const db = read()
  const party = db.weeks[weekId]?.parties[partyId]
  if (!party) throw new Error('找不到此團')
  if (party.memberIds.includes(memberId)) return
  if (party.memberIds.length >= party.maxSize) throw new Error('此團已滿')
  party.memberIds = [...party.memberIds, memberId]
  write(db)
}

export function leaveParty(weekId: string, partyId: string, memberId: string): void {
  const db = read()
  const party = db.weeks[weekId]?.parties[partyId]
  if (!party) return
  party.memberIds = party.memberIds.filter((id) => id !== memberId)
  write(db)
}

export function setPartySlot(
  weekId: string,
  partyId: string,
  slot: PartyTime | null,
): void {
  const db = read()
  const party = db.weeks[weekId]?.parties[partyId]
  if (!party) return
  party.slot = slot
  write(db)
}

export function deleteParty(weekId: string, partyId: string): void {
  const db = read()
  if (db.weeks[weekId]?.parties[partyId]) {
    delete db.weeks[weekId].parties[partyId]
    write(db)
  }
}

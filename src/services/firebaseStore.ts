import {
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from '../firebase/config'
import { GUILD_ID } from '../lib/guild'
import { currentWeekId, defaultPartyName } from '../lib/week'
import type { CreatePartyInput, Member, Party, PartyTime, SlotKey } from '../types'

function makeId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

async function weekRef(weekId: string) {
  return doc(await getDb(), 'guilds', GUILD_ID, 'weeks', weekId)
}

async function weeksCol() {
  return collection(await getDb(), 'guilds', GUILD_ID, 'weeks')
}

async function partiesCol(weekId: string) {
  return collection(await getDb(), 'guilds', GUILD_ID, 'weeks', weekId, 'parties')
}

async function partyRef(weekId: string, partyId: string) {
  return doc(await partiesCol(weekId), partyId)
}

async function partyMembersCol(weekId: string, partyId: string) {
  return collection(
    await getDb(),
    'guilds',
    GUILD_ID,
    'weeks',
    weekId,
    'parties',
    partyId,
    'members',
  )
}

async function deleteWeekRecursive(weekId: string): Promise<void> {
  const db = await getDb()
  const pSnap = await getDocs(await partiesCol(weekId))
  for (const p of pSnap.docs) {
    const mSnap = await getDocs(await partyMembersCol(weekId, p.id))
    const batch = writeBatch(db)
    mSnap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(p.ref)
    await batch.commit()
  }
  await deleteDoc(await weekRef(weekId))
}

export async function ensureCurrentWeek(): Promise<string> {
  const weekId = currentWeekId()
  const ref = await weekRef(weekId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, { id: weekId, createdAt: Date.now() })
  }

  const all = await getDocs(await weeksCol())
  await Promise.all(
    all.docs.filter((d) => d.id !== weekId).map((d) => deleteWeekRecursive(d.id)),
  )

  const parties = await getDocs(await partiesCol(weekId))
  if (parties.empty) {
    await setDoc(await partyRef(weekId, 'default'), {
      name: defaultPartyName(weekId),
      maxSize: 6,
      slot: null,
      memberIds: [],
      createdBy: 'system',
      createdAt: Date.now(),
    })
  } else {
    const def = parties.docs.find((d) => d.id === 'default')
    if (def?.data()?.name === '本週打王') {
      await updateDoc(await partyRef(weekId, 'default'), {
        name: defaultPartyName(weekId),
      })
    }
  }

  return weekId
}

export function subscribeParties(
  weekId: string,
  onData: (parties: Party[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  let cancelled = false
  let unsub: Unsubscribe | null = null

  void (async () => {
    try {
      const col = await partiesCol(weekId)
      if (cancelled) return
      unsub = onSnapshot(
        col,
        (snap) => {
          const parties = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Party)
            .sort((a, b) => a.createdAt - b.createdAt)
          onData(parties)
        },
        (err) => onError?.(err),
      )
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)))
    }
  })()

  return () => {
    cancelled = true
    unsub?.()
  }
}

export function subscribeParty(
  weekId: string,
  partyId: string,
  onData: (data: { party: Party | null; members: Member[] }) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  let cancelled = false
  const unsubs: Unsubscribe[] = []

  void (async () => {
    try {
      let party: Party | null = null
      let members: Member[] = []
      let ready = { party: false, members: false }
      const emit = () => {
        if (ready.party && ready.members) onData({ party, members })
      }

      const pRef = await partyRef(weekId, partyId)
      const mCol = await partyMembersCol(weekId, partyId)
      if (cancelled) return

      unsubs.push(
        onSnapshot(
          pRef,
          (snap) => {
            party = snap.exists() ? ({ id: snap.id, ...snap.data() } as Party) : null
            ready.party = true
            emit()
          },
          (err) => onError?.(err),
        ),
      )
      unsubs.push(
        onSnapshot(
          mCol,
          (snap) => {
            members = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member)
            ready.members = true
            emit()
          },
          (err) => onError?.(err),
        ),
      )
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)))
    }
  })()

  return () => {
    cancelled = true
    unsubs.forEach((u) => u())
  }
}

export async function createParty(
  weekId: string,
  input: CreatePartyInput,
): Promise<string> {
  const id = makeId()
  await setDoc(await partyRef(weekId, id), {
    name: input.name.trim() || '未命名團',
    maxSize: Math.max(1, Math.floor(input.maxSize)),
    slot: input.slot ?? null,
    memberIds: [input.createdBy],
    createdBy: input.createdBy,
    createdAt: Date.now(),
  })
  return id
}

export async function upsertPartyMember(
  weekId: string,
  partyId: string,
  memberId: string,
  nickname: string,
  availability: SlotKey[] = [],
): Promise<void> {
  const ref = doc(await partyMembersCol(weekId, partyId), memberId)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    await updateDoc(ref, {
      nickname: nickname.trim(),
      updatedAt: Date.now(),
    })
  } else {
    await setDoc(ref, {
      nickname: nickname.trim(),
      availability,
      updatedAt: Date.now(),
    })
  }
}

export async function setPartyAvailability(
  weekId: string,
  partyId: string,
  memberId: string,
  availability: SlotKey[],
): Promise<void> {
  const ref = doc(await partyMembersCol(weekId, partyId), memberId)
  await updateDoc(ref, {
    availability,
    updatedAt: Date.now(),
  })
}

export async function joinParty(
  weekId: string,
  partyId: string,
  memberId: string,
): Promise<void> {
  await updateDoc(await partyRef(weekId, partyId), {
    memberIds: arrayUnion(memberId),
  })
}

export async function leaveParty(
  weekId: string,
  partyId: string,
  memberId: string,
): Promise<void> {
  await updateDoc(await partyRef(weekId, partyId), {
    memberIds: arrayRemove(memberId),
  })
}

export async function setPartySlot(
  weekId: string,
  partyId: string,
  slot: PartyTime | null,
): Promise<void> {
  await updateDoc(await partyRef(weekId, partyId), { slot })
}

export async function deleteParty(weekId: string, partyId: string): Promise<void> {
  const db = await getDb()
  const mSnap = await getDocs(await partyMembersCol(weekId, partyId))
  const batch = writeBatch(db)
  mSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(await partyRef(weekId, partyId))
  await batch.commit()
}

import { isFirebaseConfigured } from '../firebase/config'
import type { CreatePartyInput, Member, Party, PartyTime, SlotKey } from '../types'
import * as local from './localStore'

type Unsubscribe = () => void

async function fb() {
  return import('./firebaseStore')
}

export async function ensureCurrentWeek(): Promise<string> {
  if (!isFirebaseConfigured) return local.ensureCurrentWeek()
  return (await fb()).ensureCurrentWeek()
}

export function subscribeParties(
  weekId: string,
  onData: (parties: Party[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    return local.subscribeParties(weekId, onData)
  }
  let innerUnsub: Unsubscribe | null = null
  let cancelled = false
  void fb()
    .then((api) => {
      if (cancelled) return
      innerUnsub = api.subscribeParties(weekId, onData, onError)
    })
    .catch((e) => onError?.(e instanceof Error ? e : new Error(String(e))))
  return () => {
    cancelled = true
    innerUnsub?.()
  }
}

export function subscribeParty(
  weekId: string,
  partyId: string,
  onData: (data: { party: Party | null; members: Member[] }) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    return local.subscribeParty(weekId, partyId, onData)
  }
  let innerUnsub: Unsubscribe | null = null
  let cancelled = false
  void fb()
    .then((api) => {
      if (cancelled) return
      innerUnsub = api.subscribeParty(weekId, partyId, onData, onError)
    })
    .catch((e) => onError?.(e instanceof Error ? e : new Error(String(e))))
  return () => {
    cancelled = true
    innerUnsub?.()
  }
}

export async function createParty(
  weekId: string,
  input: CreatePartyInput,
): Promise<string> {
  if (!isFirebaseConfigured) return local.createParty(weekId, input)
  return (await fb()).createParty(weekId, input)
}

export async function upsertPartyMember(
  weekId: string,
  partyId: string,
  memberId: string,
  nickname: string,
  availability: SlotKey[] = [],
): Promise<void> {
  if (!isFirebaseConfigured) {
    return local.upsertPartyMember(weekId, partyId, memberId, nickname, availability)
  }
  return (await fb()).upsertPartyMember(
    weekId,
    partyId,
    memberId,
    nickname,
    availability,
  )
}

export async function setPartyAvailability(
  weekId: string,
  partyId: string,
  memberId: string,
  availability: SlotKey[],
): Promise<void> {
  if (!isFirebaseConfigured) {
    return local.setPartyAvailability(weekId, partyId, memberId, availability)
  }
  return (await fb()).setPartyAvailability(weekId, partyId, memberId, availability)
}

export async function joinParty(
  weekId: string,
  partyId: string,
  memberId: string,
  maxSize: number,
  currentCount: number,
): Promise<void> {
  if (currentCount >= maxSize) throw new Error('此團已滿')
  if (!isFirebaseConfigured) {
    return local.joinParty(weekId, partyId, memberId)
  }
  return (await fb()).joinParty(weekId, partyId, memberId)
}

export async function leaveParty(
  weekId: string,
  partyId: string,
  memberId: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    return local.leaveParty(weekId, partyId, memberId)
  }
  return (await fb()).leaveParty(weekId, partyId, memberId)
}

export async function setPartySlot(
  weekId: string,
  partyId: string,
  slot: PartyTime | null,
): Promise<void> {
  if (!isFirebaseConfigured) {
    return local.setPartySlot(weekId, partyId, slot)
  }
  return (await fb()).setPartySlot(weekId, partyId, slot)
}

export async function deleteParty(
  weekId: string,
  partyId: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    return local.deleteParty(weekId, partyId)
  }
  return (await fb()).deleteParty(weekId, partyId)
}

export { isFirebaseConfigured }

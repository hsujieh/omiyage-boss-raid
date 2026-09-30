import { fetchLineProfile, isLiffConfigured, isLiffUsable } from './line'

const MEMBER_KEY = 'artale-member-id'
const NICK_KEY = 'artale-nickname'

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function getOrCreateMemberId(): string {
  let id = localStorage.getItem(MEMBER_KEY)
  if (!id) {
    id = randomId()
    localStorage.setItem(MEMBER_KEY, id)
  }
  return id
}

export function getSavedNickname(): string | null {
  return localStorage.getItem(NICK_KEY)
}

export function saveNickname(nickname: string): void {
  localStorage.setItem(NICK_KEY, nickname.trim())
}

export function saveMemberId(id: string): void {
  localStorage.setItem(MEMBER_KEY, id)
}

export interface Identity {
  memberId: string
  nickname: string
  fromLine: boolean
  redirecting: boolean
  lineError?: string
}

/**
 * 若有設定 VITE_LIFF_ID 且非本機，優先用 LINE 顯示名稱。
 * localhost 會 400（redirectUri 不符 Endpoint），改走暱稱。
 */
export async function resolveIdentity(): Promise<Identity> {
  if (isLiffUsable) {
    try {
      const profile = await fetchLineProfile()
      if (!profile) {
        return {
          memberId: getOrCreateMemberId(),
          nickname: getSavedNickname() ?? '',
          fromLine: false,
          redirecting: true,
        }
      }
      const memberId = `line:${profile.userId}`
      saveMemberId(memberId)
      saveNickname(profile.displayName)
      return {
        memberId,
        nickname: profile.displayName,
        fromLine: true,
        redirecting: false,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('LINE 登入失敗', e)
      return {
        memberId: getOrCreateMemberId(),
        nickname: getSavedNickname() ?? '',
        fromLine: false,
        redirecting: false,
        lineError: msg,
      }
    }
  }

  return {
    memberId: getOrCreateMemberId(),
    nickname: getSavedNickname() ?? '',
    fromLine: false,
    redirecting: false,
  }
}

export { isLiffConfigured, isLiffUsable }

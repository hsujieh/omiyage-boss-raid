import { fetchLineProfile, isLiffConfigured } from './line'

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
  /** 已從 LINE 取得名稱，可略過手動暱稱 */
  fromLine: boolean
  /** 正在導向 LINE 登入 */
  redirecting: boolean
}

/**
 * 若有設定 VITE_LIFF_ID，優先用 LINE 顯示名稱；
 * 否則沿用本機暱稱／手動輸入。
 */
export async function resolveIdentity(): Promise<Identity> {
  if (isLiffConfigured) {
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
      console.warn('LINE 登入失敗，改為手動暱稱', e)
    }
  }

  return {
    memberId: getOrCreateMemberId(),
    nickname: getSavedNickname() ?? '',
    fromLine: false,
    redirecting: false,
  }
}

export { isLiffConfigured }

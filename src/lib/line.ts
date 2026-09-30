import liff from '@line/liff'

export const isLiffConfigured = Boolean(
  (import.meta.env.VITE_LIFF_ID as string | undefined)?.trim(),
)

/** localhost / 127.0.0.1 無法當 LIFF Endpoint（需 HTTPS 且 redirectUri 須符合設定） */
export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

/** 本機開發時不啟用 LIFF，改用暱稱 */
export const isLiffUsable = isLiffConfigured && !isLocalDevHost()

function appBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = window.location.origin
  const path = base.endsWith('/') ? base : `${base}/`
  return `${origin}${path}`
}

export async function fetchLineProfile(): Promise<{
  userId: string
  displayName: string
} | null> {
  const liffId = (import.meta.env.VITE_LIFF_ID as string | undefined)?.trim()
  if (!liffId || isLocalDevHost()) return null

  await liff.init({ liffId })

  if (!liff.isLoggedIn()) {
    // redirectUri 必須以 LIFF Console 的 Endpoint URL 為前綴
    liff.login({ redirectUri: appBaseUrl() })
    return null
  }

  const profile = await liff.getProfile()
  return {
    userId: profile.userId,
    displayName: profile.displayName,
  }
}

export function getLiffUrl(): string {
  const liffId = (import.meta.env.VITE_LIFF_ID as string | undefined)?.trim()
  return liffId ? `https://liff.line.me/${liffId}` : appBaseUrl()
}

import liff from '@line/liff'

export const isLiffConfigured = Boolean(
  (import.meta.env.VITE_LIFF_ID as string | undefined)?.trim(),
)

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
  if (!liffId) return null

  await liff.init({ liffId })

  if (!liff.isLoggedIn()) {
    // 必須落在 LIFF Endpoint 網域下
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

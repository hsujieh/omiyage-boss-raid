import liff from '@line/liff'

export const isLiffConfigured = Boolean(
  (import.meta.env.VITE_LIFF_ID as string | undefined)?.trim(),
)

export async function fetchLineProfile(): Promise<{
  userId: string
  displayName: string
} | null> {
  const liffId = (import.meta.env.VITE_LIFF_ID as string | undefined)?.trim()
  if (!liffId) return null

  await liff.init({ liffId })

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href.split('#')[0] })
    return null
  }

  const profile = await liff.getProfile()
  return {
    userId: profile.userId,
    displayName: profile.displayName,
  }
}

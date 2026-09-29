/** 單一工會站點；可用 .env 的 VITE_GUILD_ID 覆寫 */
export const GUILD_ID =
  (import.meta.env.VITE_GUILD_ID as string | undefined)?.trim() || 'omiyage'

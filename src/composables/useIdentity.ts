import { onMounted, ref } from 'vue'
import {
  getOrCreateMemberId,
  resolveIdentity,
  saveNickname,
  type Identity,
} from '../lib/identity'

/** 共用身分：優先 LINE 顯示名稱 */
export function useIdentity() {
  const memberId = ref('')
  const nickname = ref('')
  const fromLine = ref(false)
  const entered = ref(false)
  const identityReady = ref(false)
  const identityError = ref('')

  onMounted(async () => {
    try {
      const id: Identity = await resolveIdentity()
      memberId.value = id.memberId
      nickname.value = id.nickname
      fromLine.value = id.fromLine
      if (id.redirecting) {
        // 正在導向 LINE 登入，不顯示暱稱門檻
        return
      }
      entered.value = id.fromLine || Boolean(id.nickname)
      identityReady.value = true
    } catch (e) {
      identityError.value = e instanceof Error ? e.message : '身分初始化失敗'
      memberId.value = getOrCreateMemberId()
      identityReady.value = true
    }
  })

  function enterWithNickname(nick: string) {
    nickname.value = nick
    saveNickname(nick)
    if (!memberId.value) memberId.value = getOrCreateMemberId()
    entered.value = true
  }

  return {
    memberId,
    nickname,
    fromLine,
    entered,
    identityReady,
    identityError,
    enterWithNickname,
  }
}

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NicknameGate from '../components/NicknameGate.vue'
import PartyList from '../components/PartyList.vue'
import CreatePartyForm from '../components/CreatePartyForm.vue'
import { useIdentity } from '../composables/useIdentity'
import { getWeekInfo } from '../lib/week'
import type { Party } from '../types'
import {
  createParty,
  deleteParty,
  ensureCurrentWeek,
  isFirebaseConfigured,
  subscribeParties,
} from '../services/week'

const router = useRouter()
const weekInfo = getWeekInfo()
const weekId = ref(weekInfo.id)
const parties = ref<Party[]>([])
const loading = ref(true)
const error = ref('')
const busy = ref(false)

const {
  memberId,
  nickname,
  fromLine,
  entered,
  identityReady,
  identityError,
  lineError,
  isLiffConfigured,
  enterWithNickname,
  openLineLogin,
} = useIdentity()

let unsub: (() => void) | null = null

onMounted(async () => {
  try {
    weekId.value = await ensureCurrentWeek()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '無法初始化本週'
    loading.value = false
    return
  }

  unsub = subscribeParties(
    weekId.value,
    (list) => {
      parties.value = list
      loading.value = false
    },
    (err) => {
      loading.value = false
      error.value = err.message || '連線失敗'
    },
  )
})

onUnmounted(() => {
  unsub?.()
})

async function onCreate(payload: { name: string; maxSize: number }) {
  busy.value = true
  error.value = ''
  try {
    const id = await createParty(weekId.value, {
      ...payload,
      slot: null,
      createdBy: memberId.value,
    })
    await router.push({ name: 'party', params: { partyId: id } })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '新增失敗'
  } finally {
    busy.value = false
  }
}

async function onRemove(partyId: string) {
  if (!confirm('確定刪除此團？')) return
  busy.value = true
  error.value = ''
  try {
    await deleteParty(weekId.value, partyId)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '刪除失敗'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="page list">
    <header class="header fade-up">
      <div>
        <h1 class="week-title">本週 {{ weekInfo.rangeText }}</h1>
        <p class="muted note">每週二自動開新週，上一週資料會清除</p>
      </div>
      <div class="header-actions">
        <p v-if="entered" class="you">
          你是 <strong>{{ nickname }}</strong>
          <span v-if="fromLine" class="line-tag">LINE</span>
        </p>
      </div>
    </header>

    <div v-if="!isFirebaseConfigured" class="banner">
      本機模式：同一瀏覽器可測試；工會共享請依 README 設定 Firebase。
    </div>
    <div v-if="isLiffConfigured && !identityReady" class="banner">
      正在透過 LINE 取得名稱…
    </div>

    <p v-if="lineError" class="banner warn">LINE 登入失敗：{{ lineError }}</p>
    <p v-if="identityError || error" class="banner warn">
      {{ identityError || error }}
    </p>
    <p v-if="loading" class="muted">載入本週…</p>

    <template v-else>
      <PartyList
        :parties="parties"
        :my-id="memberId"
        :busy="busy || !entered"
        @remove="onRemove"
      />

      <CreatePartyForm v-if="entered" :busy="busy" @create="onCreate" />
    </template>

    <NicknameGate
      :visible="identityReady && !entered && !loading"
      :initial-nickname="nickname"
      :show-line-login="isLiffConfigured"
      :line-error="lineError"
      @submit="enterWithNickname"
      @line-login="openLineLogin"
    />
  </main>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.header > div:first-child {
  min-width: 0;
  flex: 1 1 12rem;
}

.week-title {
  font-family: var(--font-display);
  font-size: clamp(1.15rem, 4.5vw, 1.85rem);
  font-weight: 700;
  margin: 0;
  color: var(--ink);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.note {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
}

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  flex: 0 1 auto;
  max-width: 100%;
}

.you {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-muted);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;
  max-width: 100%;
}

.you strong {
  color: var(--accent-soft);
  overflow-wrap: anywhere;
}

.line-tag {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #06c755;
  border: 1px solid rgba(6, 199, 85, 0.45);
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    align-items: flex-start;
  }

  .you {
    justify-content: flex-start;
  }
}
</style>

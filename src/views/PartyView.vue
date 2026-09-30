<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import NicknameGate from '../components/NicknameGate.vue'
import AvailabilityGrid from '../components/AvailabilityGrid.vue'
import TopSlots from '../components/TopSlots.vue'
import { useIdentity } from '../composables/useIdentity'
import { getWeekInfo } from '../lib/week'
import { cycleHourAvailability } from '../lib/slots'
import type { DayKey, Member, Party, SlotKey } from '../types'
import {
  deleteParty,
  ensureCurrentWeek,
  isFirebaseConfigured,
  joinParty,
  leaveParty,
  setPartyAvailability,
  subscribeParty,
  upsertPartyMember,
} from '../services/week'

const props = defineProps<{ partyId: string }>()
const router = useRouter()
const weekInfo = getWeekInfo()

const weekId = ref(weekInfo.id)
const party = ref<Party | null>(null)
const members = ref<Member[]>([])
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const editing = ref(false)
const draft = ref<SlotKey[]>([])

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

const me = computed(() => members.value.find((m) => m.id === memberId.value))
const myAvailability = computed<SlotKey[]>(() => me.value?.availability ?? [])
const isIn = computed(
  () => party.value?.memberIds.includes(memberId.value) ?? false,
)
const isFull = computed(
  () =>
    !!party.value && party.value.memberIds.length >= party.value.maxSize,
)

/** 有填空檔的人視為有興趣／已報名顯示 */
const rosterNames = computed(() =>
  members.value
    .filter((m) => m.availability.length > 0)
    .map((m) => m.nickname),
)

const filledCount = computed(
  () => members.value.filter((m) => m.availability.length > 0).length,
)

/** 編輯中用 draft 預覽熱力與自己的格 */
const gridMembers = computed<Member[]>(() => {
  if (!editing.value) return members.value
  const others = members.value.filter((m) => m.id !== memberId.value)
  return [
    ...others,
    {
      id: memberId.value,
      nickname: nickname.value || '我',
      availability: draft.value,
      updatedAt: Date.now(),
    },
  ]
})

const displayMine = computed(() =>
  editing.value ? draft.value : myAvailability.value,
)

let unsub: (() => void) | null = null

async function syncMember() {
  if (!entered.value || !nickname.value || !memberId.value) return
  try {
    await upsertPartyMember(
      weekId.value,
      props.partyId,
      memberId.value,
      nickname.value,
    )
  } catch {
    // ignore
  }
}

onMounted(async () => {
  try {
    weekId.value = await ensureCurrentWeek()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '無法初始化本週'
    loading.value = false
    return
  }

  unsub = subscribeParty(
    weekId.value,
    props.partyId,
    (data) => {
      party.value = data.party
      members.value = data.members
      loading.value = false
      if (!data.party) error.value = '找不到此團（可能已刪除或已換週）'
    },
    (err) => {
      loading.value = false
      error.value = err.message || '連線失敗'
    },
  )
})

watch([entered, identityReady, memberId, nickname], () => {
  if (identityReady.value && entered.value) void syncMember()
})

onUnmounted(() => {
  unsub?.()
})

async function onEnter(nick: string) {
  enterWithNickname(nick)
  busy.value = true
  error.value = ''
  try {
    await upsertPartyMember(weekId.value, props.partyId, memberId.value, nick)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '無法進入'
  } finally {
    busy.value = false
  }
}

function startEdit() {
  draft.value = [...myAvailability.value]
  editing.value = true
  error.value = ''
}

function onCycleDraft(day: DayKey, hour: number) {
  draft.value = cycleHourAvailability(draft.value, day, hour)
}

async function saveEdit() {
  if (!party.value) return
  busy.value = true
  error.value = ''
  try {
    await upsertPartyMember(
      weekId.value,
      props.partyId,
      memberId.value,
      nickname.value,
    )
    await setPartyAvailability(
      weekId.value,
      props.partyId,
      memberId.value,
      draft.value,
    )

    if (draft.value.length > 0) {
      if (!isIn.value) {
        if (isFull.value) {
          error.value = '空檔已儲存，但此團已滿無法計入人數'
        } else {
          await joinParty(
            weekId.value,
            props.partyId,
            memberId.value,
            party.value.maxSize,
            party.value.memberIds.length,
          )
        }
      }
    } else if (isIn.value) {
      await leaveParty(weekId.value, props.partyId, memberId.value)
    }

    editing.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : '儲存失敗'
  } finally {
    busy.value = false
  }
}

async function onDelete() {
  if (!confirm('確定刪除此團？')) return
  busy.value = true
  error.value = ''
  try {
    await deleteParty(weekId.value, props.partyId)
    router.push({ name: 'home' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '刪除失敗'
    busy.value = false
  }
}

function goHome() {
  router.push({ name: 'home' })
}
</script>

<template>
  <main class="page party-page">
    <header class="header fade-up">
      <div>
        <button type="button" class="back" @click="goHome">← 本週列表</button>
        <h1 class="brand room-title">{{ party?.name ?? '團' }}</h1>
      </div>
      <div class="header-actions">
        <p v-if="entered" class="you">
          你是 <strong>{{ nickname }}</strong>
          <span v-if="fromLine" class="line-tag">LINE</span>
        </p>
        <p v-if="party" class="size" :class="{ full: isFull }">
          {{ filledCount }}/{{ party.maxSize }}
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
    <p v-if="loading" class="muted">載入中…</p>

    <template v-else-if="party">
      <div v-if="entered" class="edit-bar">
        <button
          v-if="!editing"
          type="button"
          class="btn btn-ghost"
          :disabled="busy"
          @click="startEdit"
        >
          編輯
        </button>
        <button
          v-else
          type="button"
          class="btn btn-primary"
          :disabled="busy"
          @click="saveEdit"
        >
          {{ busy ? '儲存中…' : '儲存' }}
        </button>
      </div>

      <AvailabilityGrid
        :members="gridMembers"
        :my-availability="displayMine"
        :day-labels="weekInfo.dayLabels"
        :editing="editing"
        :disabled="!entered || busy"
        @cycle="onCycleDraft"
      />

      <TopSlots :members="gridMembers" />

      <section class="roster fade-up">
        <h2>有填空檔的人</h2>
        <p class="names">
          {{ rosterNames.length ? rosterNames.join('、') : '尚無人填寫' }}
        </p>
      </section>

      <div class="danger-zone fade-up">
        <button
          type="button"
          class="btn btn-danger"
          :disabled="busy || !entered"
          @click="onDelete"
        >
          刪除此團
        </button>
      </div>
    </template>

    <NicknameGate
      :visible="identityReady && !entered && !loading && !!party"
      :initial-nickname="nickname"
      :show-line-login="isLiffConfigured"
      :line-error="lineError"
      @submit="onEnter"
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

.back {
  background: none;
  border: none;
  color: var(--ink-muted);
  padding: 0.25rem 0;
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
  min-height: 36px;
}

.back:hover {
  color: var(--accent-soft);
}

.room-title {
  font-size: clamp(1.45rem, 6vw, 2.6rem);
  margin: 0;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
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

.size {
  margin: 0;
  font-weight: 700;
  color: var(--accent-soft);
  font-variant-numeric: tabular-nums;
}

.size.full {
  color: var(--danger);
}

.edit-bar {
  margin-top: 1.25rem;
  display: flex;
  justify-content: flex-end;
}

.roster {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
}

.roster h2 {
  font-family: var(--font-display);
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
}

.names {
  margin: 0 0 1rem;
  overflow-wrap: anywhere;
}

.danger-zone {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: center;
}

.danger-zone .btn {
  width: min(100%, 16rem);
}

@media (max-width: 560px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    align-items: flex-start;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .you {
    justify-content: flex-start;
  }

  .edit-bar {
    justify-content: stretch;
  }

  .edit-bar .btn {
    width: 100%;
  }
}
</style>

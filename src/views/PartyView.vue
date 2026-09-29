<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import NicknameGate from '../components/NicknameGate.vue'
import AvailabilityGrid from '../components/AvailabilityGrid.vue'
import TopSlots from '../components/TopSlots.vue'
import { useIdentity } from '../composables/useIdentity'
import { getWeekInfo } from '../lib/week'
import { formatSlot } from '../lib/slots'
import type { Member, Party, SlotKey } from '../types'
import {
  ensureCurrentWeek,
  isFirebaseConfigured,
  joinParty,
  leaveParty,
  setPartyAvailability,
  setPartySlot,
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

const rosterNames = computed(() => {
  const map = new Map(members.value.map((m) => [m.id, m.nickname]))
  return (party.value?.memberIds ?? []).map((id) => map.get(id) ?? '未知')
})

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
    // party may not be ready
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

async function onToggleSlot(slot: SlotKey) {
  if (!entered.value) return
  const set = new Set(myAvailability.value)
  if (set.has(slot)) set.delete(slot)
  else set.add(slot)
  busy.value = true
  try {
    await setPartyAvailability(
      weekId.value,
      props.partyId,
      memberId.value,
      [...set] as SlotKey[],
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : '更新空檔失敗'
  } finally {
    busy.value = false
  }
}

async function onPickSlot(slot: SlotKey) {
  if (!entered.value) return
  busy.value = true
  error.value = ''
  try {
    await setPartySlot(weekId.value, props.partyId, slot)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '設定時段失敗'
  } finally {
    busy.value = false
  }
}

async function onJoin() {
  if (!party.value) return
  busy.value = true
  error.value = ''
  try {
    if (!me.value) {
      await upsertPartyMember(
        weekId.value,
        props.partyId,
        memberId.value,
        nickname.value,
      )
    }
    await joinParty(
      weekId.value,
      props.partyId,
      memberId.value,
      party.value.maxSize,
      party.value.memberIds.length,
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加入失敗'
  } finally {
    busy.value = false
  }
}

async function onLeave() {
  busy.value = true
  error.value = ''
  try {
    await leaveParty(weekId.value, props.partyId, memberId.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '退出失敗'
  } finally {
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
        <p class="muted week">本週 {{ weekInfo.rangeText }}</p>
        <p class="meta">
          時段：{{ party?.slot ? formatSlot(party.slot) : '尚未決定（點下方重疊時段選定）' }}
        </p>
      </div>
      <div class="header-actions">
        <p v-if="entered" class="you">
          你是 <strong>{{ nickname }}</strong>
          <span v-if="fromLine" class="line-tag">LINE</span>
        </p>
        <p v-if="party" class="size" :class="{ full: isFull }">
          {{ party.memberIds.length }}/{{ party.maxSize }}
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
      <AvailabilityGrid
        :members="members"
        :my-availability="myAvailability"
        :day-labels="weekInfo.dayLabels"
        :disabled="!entered || busy"
        @toggle="onToggleSlot"
      />

      <TopSlots :members="members" @pick="onPickSlot" />

      <section class="roster fade-up">
        <h2>報名名單</h2>
        <p class="names">
          {{ rosterNames.length ? rosterNames.join('、') : '尚無人報名' }}
        </p>
        <div class="actions">
          <button
            v-if="isIn"
            type="button"
            class="btn btn-danger"
            :disabled="busy || !entered"
            @click="onLeave"
          >
            退出此團
          </button>
          <button
            v-else
            type="button"
            class="btn btn-primary"
            :disabled="busy || !entered || isFull"
            @click="onJoin"
          >
            {{ isFull ? '已滿' : '加入此團' }}
          </button>
        </div>
      </section>
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
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.back {
  background: none;
  border: none;
  color: var(--ink-muted);
  padding: 0;
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
}

.back:hover {
  color: var(--accent-soft);
}

.room-title {
  font-size: clamp(1.8rem, 5vw, 2.6rem);
  margin: 0;
}

.week,
.meta {
  margin: 0.3rem 0 0;
  font-size: 0.9rem;
  color: var(--ink-muted);
}

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.you {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.you strong {
  color: var(--accent-soft);
}

.line-tag {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #06c755;
  border: 1px solid rgba(6, 199, 85, 0.45);
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
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
}

.actions {
  display: flex;
  gap: 0.5rem;
}
</style>

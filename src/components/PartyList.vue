<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Party } from '../types'
import { formatSlot } from '../lib/slots'

defineProps<{
  parties: Party[]
  myId: string
  busy?: boolean
}>()

const emit = defineEmits<{
  remove: [partyId: string]
}>()

const router = useRouter()

function isFull(party: Party): boolean {
  return party.memberIds.length >= party.maxSize
}

function openParty(partyId: string) {
  router.push({ name: 'party', params: { partyId } })
}
</script>

<template>
  <section class="parties">
    <h2>本週團列表</h2>
    <p class="muted tip">點進團裡再填該團的空檔與報名</p>
    <p v-if="!parties.length" class="muted empty">還沒有團，下面新增一個吧。</p>
    <ul v-else class="list">
      <li v-for="p in parties" :key="p.id" class="party fade-up">
        <button type="button" class="party-main" @click="openParty(p.id)">
          <div class="title-row">
            <h3>{{ p.name }}</h3>
            <span class="size" :class="{ full: isFull(p) }">
              {{ p.memberIds.length }}/{{ p.maxSize }}
            </span>
          </div>
          <p class="meta">時段：{{ p.slot ? formatSlot(p.slot) : '尚未決定' }}</p>
          <span class="enter">進入此團 →</span>
        </button>
        <div class="actions">
          <button
            type="button"
            class="btn btn-ghost danger-text"
            :disabled="busy"
            @click="emit('remove', p.id)"
          >
            刪除
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.parties {
  margin-top: 1.5rem;
}

.parties h2 {
  font-family: var(--font-display);
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
}

.tip,
.empty {
  margin: 0 0 0.75rem;
  font-size: 0.88rem;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.party {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--line);
}

.party:last-child {
  border-bottom: none;
}

.party-main {
  flex: 1;
  min-width: 0;
  text-align: left;
  background: transparent;
  border: none;
  color: inherit;
  padding: 0.65rem 0.25rem;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.party-main:hover {
  background: rgba(224, 168, 74, 0.06);
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.title-row h3 {
  margin: 0;
  font-size: 1.05rem;
  font-family: var(--font-display);
  overflow-wrap: anywhere;
}

.size {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--accent-soft);
  flex-shrink: 0;
}

.size.full {
  color: var(--danger);
}

.meta {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
  color: var(--ink-muted);
}

.enter {
  display: inline-block;
  margin-top: 0.45rem;
  font-size: 0.82rem;
  color: var(--accent-soft);
}

.actions {
  flex-shrink: 0;
}

.danger-text {
  color: var(--danger);
  border-color: rgba(224, 112, 112, 0.35);
}

@media (max-width: 560px) {
  .party {
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    padding: 0.5rem 0 0.85rem;
  }

  .actions .btn {
    width: 100%;
  }
}
</style>

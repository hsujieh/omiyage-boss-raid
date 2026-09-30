<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Member, PartyTime, SlotKey, SlotMinute } from '../types'
import {
  formatSlot,
  partyTimeFromSlot,
  topSlots,
} from '../lib/slots'

const props = defineProps<{
  members: Member[]
}>()

const emit = defineEmits<{
  pick: [time: PartyTime]
}>()

const tops = computed(() => topSlots(props.members, 5))
const pending = ref<SlotKey | null>(null)

function openPick(slot: SlotKey) {
  pending.value = pending.value === slot ? null : slot
}

function confirm(slot: SlotKey, minute: SlotMinute) {
  emit('pick', partyTimeFromSlot(slot, minute))
  pending.value = null
}
</script>

<template>
  <section v-if="tops.length" class="tops fade-up">
    <h2>重疊最多時段</h2>
    <p class="hint muted">點一下，再選整點或半點設為打王時間</p>
    <ol>
      <li v-for="item in tops" :key="item.slot" class="item">
        <button
          type="button"
          class="slot-btn"
          :class="{ open: pending === item.slot }"
          @click="openPick(item.slot)"
        >
          <span class="label">{{ formatSlot(item.slot) }}</span>
          <span class="badge">{{ item.count }} 人</span>
        </button>
        <div v-if="pending === item.slot" class="minute-pick">
          <button type="button" class="min-btn" @click="confirm(item.slot, 0)">
            :00
          </button>
          <button type="button" class="min-btn" @click="confirm(item.slot, 30)">
            :30
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.tops {
  margin-top: 1.75rem;
}

.tops h2 {
  font-family: var(--font-display);
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
}

.hint {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
}

ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.slot-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.45rem 0.85rem 0.45rem 1rem;
  color: var(--ink);
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}

.slot-btn:hover,
.slot-btn.open {
  border-color: var(--accent);
}

.slot-btn:active {
  transform: scale(0.97);
}

.badge {
  background: var(--accent);
  color: #1a1208;
  font-weight: 700;
  font-size: 0.78rem;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}

.minute-pick {
  display: inline-flex;
  gap: 0.3rem;
}

.min-btn {
  background: var(--accent);
  color: #1a1208;
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-weight: 700;
  font-size: 0.85rem;
}

.min-btn:active {
  transform: scale(0.97);
}
</style>

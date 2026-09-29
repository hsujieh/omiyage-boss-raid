<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DayKey, Member, SlotKey } from '../types'
import {
  DAYS,
  HOURS,
  countBySlot,
  formatSlot,
  nicknamesForSlot,
  slotKey,
} from '../lib/slots'

const props = defineProps<{
  members: Member[]
  myAvailability: SlotKey[]
  dayLabels: { key: DayKey; label: string; dateLabel: string }[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  toggle: [slot: SlotKey]
}>()

const counts = computed(() => countBySlot(props.members))
const maxCount = computed(() => Math.max(1, ...Object.values(counts.value)))
const selected = ref<SlotKey | null>(null)

const selectedNames = computed(() =>
  selected.value ? nicknamesForSlot(props.members, selected.value) : [],
)

function heatClass(slot: SlotKey): string {
  const c = counts.value[slot] ?? 0
  if (c === 0) return 'heat-0'
  const ratio = c / maxCount.value
  if (ratio > 0.75) return 'heat-4'
  if (ratio > 0.5) return 'heat-3'
  if (ratio > 0.25) return 'heat-2'
  return 'heat-1'
}

function isMine(slot: SlotKey): boolean {
  return props.myAvailability.includes(slot)
}

function onCellClick(day: DayKey, hour: number) {
  const slot = slotKey(day, hour)
  selected.value = slot
  if (!props.disabled) emit('toggle', slot)
}

function dateFor(dayKey: DayKey): string {
  return props.dayLabels.find((w) => w.key === dayKey)?.dateLabel ?? ''
}
</script>

<template>
  <section class="grid-wrap">
    <div class="grid-head">
      <h2>此團空檔</h2>
      <p class="muted">只看這一團的人 · 週二～隔週一 · 18:00–24:00</p>
    </div>

    <div class="scroll">
      <div class="grid" role="grid" aria-label="週空檔表">
        <div class="corner" />
        <div v-for="d in DAYS" :key="d.key" class="day-h">
          <span class="day-label">{{ d.label }}</span>
          <span class="day-date">{{ dateFor(d.key) }}</span>
        </div>

        <template v-for="hour in HOURS" :key="hour">
          <div class="hour-label">{{ hour }}:00</div>
          <button
            v-for="d in DAYS"
            :key="`${d.key}-${hour}`"
            type="button"
            class="cell"
            :class="[
              heatClass(slotKey(d.key, hour)),
              { mine: isMine(slotKey(d.key, hour)), selected: selected === slotKey(d.key, hour) },
            ]"
            :disabled="disabled"
            :aria-pressed="isMine(slotKey(d.key, hour))"
            :title="`${d.label} ${hour}:00 · ${counts[slotKey(d.key, hour)] ?? 0} 人`"
            @click="onCellClick(d.key, hour)"
          >
            <span class="count">{{ counts[slotKey(d.key, hour)] || '' }}</span>
          </button>
        </template>
      </div>
    </div>

    <div v-if="selected" class="who fade-up">
      <strong>{{ formatSlot(selected) }}</strong>
      <span v-if="selectedNames.length" class="names">{{ selectedNames.join('、') }}</span>
      <span v-else class="muted">尚無人標記此時段</span>
    </div>
  </section>
</template>

<style scoped>
.grid-wrap {
  margin-top: 1.5rem;
}

.grid-head h2 {
  font-family: var(--font-display);
  margin: 0 0 0.25rem;
  font-size: 1.35rem;
}

.grid-head p {
  margin: 0 0 1rem;
  font-size: 0.9rem;
}

.scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.25rem;
}

.grid {
  display: grid;
  grid-template-columns: 64px repeat(7, minmax(52px, 1fr));
  gap: 4px;
  min-width: 520px;
}

.corner {
  min-height: 2.5rem;
}

.day-h {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: end;
  padding-bottom: 0.25rem;
  font-size: 0.85rem;
}

.day-label {
  font-weight: 700;
}

.day-date {
  color: var(--ink-muted);
  font-size: 0.72rem;
}

.hour-label {
  display: flex;
  align-items: center;
  justify-content: end;
  padding-right: 0.5rem;
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.cell {
  aspect-ratio: 1;
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--ink);
  padding: 0;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.cell:hover:not(:disabled) {
  border-color: var(--accent);
}

.cell:active:not(:disabled) {
  animation: pop 0.25s ease;
}

.cell.mine {
  border-color: var(--mine);
  box-shadow: inset 0 0 0 2px rgba(74, 159, 212, 0.55);
}

.cell.selected {
  outline: 2px solid var(--accent-soft);
  outline-offset: 1px;
}

.heat-0 {
  background: rgba(255, 255, 255, 0.03);
}
.heat-1 {
  background: var(--heat-1);
}
.heat-2 {
  background: var(--heat-2);
}
.heat-3 {
  background: var(--heat-3);
  color: #1a1208;
  font-weight: 700;
}
.heat-4 {
  background: var(--heat-4);
  color: #1a1208;
  font-weight: 700;
}

.count {
  font-size: 0.85rem;
}

.who {
  margin-top: 0.85rem;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--accent);
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
  font-size: 0.92rem;
}
</style>

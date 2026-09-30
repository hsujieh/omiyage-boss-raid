<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DayKey, Member, SlotKey, SlotMinute } from '../types'
import {
  DAYS,
  HOURS,
  countByHourCell,
  formatSlot,
  myMinuteAt,
  nicknamesForHourCell,
  slotKey,
} from '../lib/slots'

const props = defineProps<{
  members: Member[]
  myAvailability: SlotKey[]
  dayLabels: { key: DayKey; label: string; dateLabel: string }[]
  /** 編輯模式才可改自己的空檔；否則點格只看有誰 */
  editing?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  cycle: [day: DayKey, hour: number]
}>()

const maxCount = computed(() => {
  let max = 1
  for (const hour of HOURS) {
    for (const d of DAYS) {
      max = Math.max(max, countByHourCell(props.members, d.key, hour))
    }
  }
  return max
})

const selected = ref<{ day: DayKey; hour: number } | null>(null)

const selectedGroups = computed(() =>
  selected.value
    ? nicknamesForHourCell(props.members, selected.value.day, selected.value.hour)
    : [],
)

function heatClass(day: DayKey, hour: number): string {
  const c = countByHourCell(props.members, day, hour)
  if (c === 0) return 'heat-0'
  const ratio = c / maxCount.value
  if (ratio > 0.75) return 'heat-4'
  if (ratio > 0.5) return 'heat-3'
  if (ratio > 0.25) return 'heat-2'
  return 'heat-1'
}

function mineMinute(day: DayKey, hour: number): SlotMinute | null {
  return myMinuteAt(props.myAvailability, day, hour)
}

function onCellClick(day: DayKey, hour: number) {
  selected.value = { day, hour }
  if (props.editing && !props.disabled) emit('cycle', day, hour)
}

function dateFor(dayKey: DayKey): string {
  return props.dayLabels.find((w) => w.key === dayKey)?.dateLabel ?? ''
}

function cellTitle(day: DayKey, hour: number): string {
  const label = DAYS.find((d) => d.key === day)?.label ?? day
  const count = countByHourCell(props.members, day, hour)
  const mine = mineMinute(day, hour)
  const mineText =
    mine === null ? '' : mine === 0 ? ' · 你：整點' : ' · 你：半點'
  return `週${label} ${hour} 點 · ${count} 人${mineText}`
}
</script>

<template>
  <section class="grid-wrap">
    <div class="grid-head">
      <p class="guide">
        <template v-if="editing"
          >編輯中：點一下整格（整點）、兩下半格（半點）、三下取消，完成後按「儲存」</template
        >
        <template v-else>點格子查看誰有空 · 要修改請按「編輯」</template>
      </p>
    </div>

    <div class="scroll">
      <div class="grid" role="grid" aria-label="週空檔表">
        <div class="corner" />
        <div v-for="d in DAYS" :key="d.key" class="day-h">
          <span class="day-label">{{ d.label }}</span>
          <span class="day-date">{{ dateFor(d.key) }}</span>
        </div>

        <template v-for="hour in HOURS" :key="hour">
          <div class="hour-label">{{ hour }}</div>
          <button
            v-for="d in DAYS"
            :key="`${d.key}-${hour}`"
            type="button"
            class="cell"
            :class="[
              heatClass(d.key, hour),
              {
                'mine-00': mineMinute(d.key, hour) === 0,
                'mine-30': mineMinute(d.key, hour) === 30,
                selected:
                  selected?.day === d.key && selected?.hour === hour,
                editing: editing,
              },
            ]"
            :disabled="disabled"
            :aria-pressed="mineMinute(d.key, hour) !== null"
            :title="cellTitle(d.key, hour)"
            @click="onCellClick(d.key, hour)"
          >
            <span class="count">{{
              countByHourCell(members, d.key, hour) || ''
            }}</span>
          </button>
        </template>
      </div>
    </div>

    <div v-if="selected" class="who fade-up">
      <strong
        >週{{ DAYS.find((d) => d.key === selected!.day)?.label }}
        {{ selected!.hour }} 點</strong
      >
      <template v-if="selectedGroups.length">
        <span
          v-for="g in selectedGroups"
          :key="g.minute"
          class="names"
        >
          {{
            formatSlot(slotKey(selected!.day, selected!.hour, g.minute))
          }}：{{ g.names.join('、') }}
        </span>
      </template>
      <span v-else class="muted">尚無人標記此時段</span>
    </div>
  </section>
</template>

<style scoped>
.grid-wrap {
  margin-top: 1.5rem;
}

.grid-head .guide {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  line-height: 1.5;
  color: #fff;
}

.scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.5rem;
  margin: 0 -0.15rem;
  padding-left: 0.15rem;
  padding-right: 0.15rem;
}

.grid {
  display: grid;
  grid-template-columns: 40px repeat(7, minmax(40px, 1fr));
  gap: 4px;
  min-width: 420px;
}

.corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 5;
  min-height: 2.5rem;
  background: var(--bg-deep);
  box-shadow: 2px 2px 0 var(--bg-deep);
}

.day-h {
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: end;
  padding: 0.35rem 0 0.35rem;
  font-size: 0.8rem;
  background: var(--bg-deep);
  box-shadow: 0 1px 0 var(--line);
}

.day-label {
  font-weight: 700;
}

.day-date {
  color: var(--ink-muted);
  font-size: 0.68rem;
}

.hour-label {
  position: sticky;
  left: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: end;
  padding-right: 0.35rem;
  font-size: 0.72rem;
  color: var(--ink-muted);
  background: var(--bg-deep);
  box-shadow: 2px 0 0 var(--bg-deep);
}

.cell {
  aspect-ratio: 1;
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--ink);
  padding: 0;
  touch-action: manipulation;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.cell.editing:not(:disabled) {
  cursor: pointer;
}

@media (max-width: 560px) {
  .grid-head .guide {
    font-size: 1.12rem;
  }

  .grid {
    grid-template-columns: 32px repeat(7, minmax(36px, 1fr));
    gap: 3px;
    min-width: 360px;
  }

  .cell {
    min-height: 36px;
    border-radius: 6px;
  }

  .count {
    font-size: 0.75rem;
  }

  .who {
    font-size: 0.85rem;
    padding: 0.65rem 0.75rem;
  }
}

.cell:hover:not(:disabled) {
  border-color: var(--accent);
}

.cell:active:not(:disabled) {
  animation: pop 0.25s ease;
}

/* 整格＝你選整點 */
.cell.mine-00 {
  border-color: var(--mine);
  background: rgba(74, 159, 212, 0.72);
  color: #f5fbff;
  box-shadow: inset 0 0 0 1px rgba(74, 159, 212, 0.9);
}

/* 半格＝你選半點（左半上色） */
.cell.mine-30 {
  border-color: var(--mine);
  background: linear-gradient(
    to right,
    rgba(74, 159, 212, 0.72) 50%,
    rgba(74, 159, 212, 0.12) 50%
  );
  color: #f5fbff;
  box-shadow: inset 0 0 0 1px rgba(74, 159, 212, 0.9);
}

.cell.mine-00 .count,
.cell.mine-30 .count {
  font-weight: 700;
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
  position: relative;
  z-index: 1;
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

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
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
  select: [cell: { day: DayKey; hour: number } | null]
}>()

const gridRef = ref<HTMLElement | null>(null)
const tipRef = ref<HTMLElement | null>(null)
const selected = ref<{ day: DayKey; hour: number } | null>(null)
const tipPos = ref<{ top: number; left: number; width: number; flip: boolean } | null>(
  null,
)

const maxCount = computed(() => {
  let max = 1
  for (const hour of HOURS) {
    for (const d of DAYS) {
      max = Math.max(max, countByHourCell(props.members, d.key, hour))
    }
  }
  return max
})

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

function clearSelect() {
  selected.value = null
  tipPos.value = null
  emit('select', null)
}

watch(
  () => props.editing,
  (editing) => {
    if (editing) clearSelect()
  },
)

function placeTip(cell: HTMLElement) {
  const grid = gridRef.value
  if (!grid) return

  const tipWidth = Math.min(220, Math.max(160, grid.clientWidth * 0.55))
  const gap = 6
  let left = cell.offsetLeft
  const top = cell.offsetTop + cell.offsetHeight + gap
  let flip = false

  // 靠右會超出時改往左展
  if (left + tipWidth > grid.clientWidth - 4) {
    left = cell.offsetLeft + cell.offsetWidth - tipWidth
    flip = true
  }
  left = Math.max(0, Math.min(left, grid.clientWidth - tipWidth))

  tipPos.value = { top, left, width: tipWidth, flip }
}

async function onCellClick(day: DayKey, hour: number, e: MouseEvent) {
  // 編輯模式：只切換空檔，不顯示 tip／外框
  if (props.editing) {
    clearSelect()
    if (!props.disabled) emit('cycle', day, hour)
    return
  }

  const same =
    selected.value?.day === day && selected.value?.hour === hour

  // 檢視模式：再點同一格取消外框與 tip
  if (same) {
    clearSelect()
    return
  }

  selected.value = { day, hour }
  emit('select', { day, hour })

  const cell = e.currentTarget as HTMLElement
  await nextTick()
  placeTip(cell)
  await nextTick()
  // 量一次實際寬度再微調，避免長文字撑破
  const tipEl = tipRef.value
  const grid = gridRef.value
  if (tipEl && grid && tipPos.value) {
    const realW = tipEl.offsetWidth
    let left = tipPos.value.left
    let flip = tipPos.value.flip
    if (left + realW > grid.clientWidth - 4) {
      left = cell.offsetLeft + cell.offsetWidth - realW
      flip = true
    }
    left = Math.max(0, Math.min(left, grid.clientWidth - realW))
    tipPos.value = { ...tipPos.value, left, flip, width: realW }
  }
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
      <div ref="gridRef" class="grid" role="grid" aria-label="週空檔表">
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
            @click="onCellClick(d.key, hour, $event)"
          >
            <span class="count">{{
              countByHourCell(members, d.key, hour) || ''
            }}</span>
          </button>
        </template>

        <div
          v-if="selected && tipPos"
          ref="tipRef"
          class="cell-tip"
          :class="{ flip: tipPos.flip }"
          :style="{
            top: `${tipPos.top}px`,
            left: `${tipPos.left}px`,
            width: `${tipPos.width}px`,
          }"
        >
          <strong
            >週{{ DAYS.find((d) => d.key === selected!.day)?.label }}
            {{ selected!.hour }} 點</strong
          >
          <template v-if="selectedGroups.length">
            <span
              v-for="g in selectedGroups"
              :key="g.minute"
              class="tip-line"
            >
              {{
                formatSlot(slotKey(selected!.day, selected!.hour, g.minute))
              }}：{{ g.names.join('、') }}
            </span>
          </template>
          <span v-else class="muted">尚無人標記此時段</span>
        </div>
      </div>
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
  position: relative;
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

/* 手機浮層 tip，不佔格子排版 */
.cell-tip {
  display: none;
}

@media (max-width: 899px) {
  .scroll {
    /* 讓浮層 tip 可超出格子往下長一點 */
    padding-bottom: 4.5rem;
  }

  .cell-tip {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    position: absolute;
    z-index: 20;
    padding: 0.65rem 0.75rem;
    background: var(--bg-panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: var(--shadow);
    font-size: 0.88rem;
    line-height: 1.4;
    box-sizing: border-box;
    pointer-events: none;
  }

  .cell-tip::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 14px;
    width: 10px;
    height: 10px;
    background: var(--bg-panel);
    border-left: 1px solid var(--line);
    border-top: 1px solid var(--line);
    transform: rotate(45deg);
  }

  .cell-tip.flip::before {
    left: auto;
    right: 14px;
  }

  .cell-tip strong {
    font-size: 0.92rem;
  }

  .tip-line {
    overflow-wrap: anywhere;
  }
}
</style>

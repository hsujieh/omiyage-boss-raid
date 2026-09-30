<script setup lang="ts">
import { computed } from 'vue'
import type { Member } from '../types'
import { formatSlot, topSlots } from '../lib/slots'

const props = defineProps<{
  members: Member[]
}>()

const tops = computed(() => topSlots(props.members, 5))
</script>

<template>
  <section v-if="tops.length" class="tops fade-up">
    <h2>統計</h2>
    <ol>
      <li v-for="item in tops" :key="item.slot" class="slot-row">
        <span class="label">{{ formatSlot(item.slot) }}</span>
        <span class="badge">{{ item.count }} 人</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.tops {
  margin-top: 0;
}

.tops h2 {
  font-family: var(--font-display);
  margin: 0 0 0.75rem;
  font-size: 1.2rem;
}

ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.slot-row {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.45rem 0.85rem 0.45rem 1rem;
  color: var(--ink);
}

.badge {
  background: var(--accent);
  color: #1a1208;
  font-weight: 700;
  font-size: 0.78rem;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}
</style>

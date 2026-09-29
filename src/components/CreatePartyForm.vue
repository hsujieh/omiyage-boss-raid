<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'

const props = defineProps<{
  busy?: boolean
}>()

const emit = defineEmits<{
  create: [
    payload: {
      name: string
      maxSize: number
    },
  ]
}>()

const open = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  name: '',
  maxSize: 6,
})

watch(open, async (v) => {
  if (v) {
    form.name = ''
    form.maxSize = 6
    await nextTick()
    nameInput.value?.focus()
  }
})

function close() {
  if (props.busy) return
  open.value = false
}

function onSubmit() {
  emit('create', {
    name: form.name,
    maxSize: Number(form.maxSize) || 1,
  })
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) close()
}
</script>

<template>
  <section class="create">
    <button
      type="button"
      class="btn btn-primary"
      :disabled="busy"
      @click="open = true"
    >
      新增團
    </button>

    <div
      v-if="open"
      class="modal-backdrop"
      role="presentation"
      @click="onBackdrop"
    >
      <div
        class="modal fade-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-party-title"
        @keydown.esc="close"
      >
        <h2 id="create-party-title" class="brand">新增團</h2>
        <p class="muted tip">開團後進到團內再填空檔與選定時間</p>
        <form class="form" @submit.prevent="onSubmit">
          <div class="field">
            <label for="party-name">團名</label>
            <input
              id="party-name"
              ref="nameInput"
              v-model="form.name"
              type="text"
              maxlength="30"
              placeholder="例如：一王團"
              required
            />
          </div>
          <div class="field">
            <label for="max-size">人數上限</label>
            <input
              id="max-size"
              v-model.number="form.maxSize"
              type="number"
              min="1"
              max="99"
              required
            />
          </div>
          <div class="actions">
            <button type="button" class="btn btn-ghost" :disabled="busy" @click="close">
              取消
            </button>
            <button class="btn btn-primary" type="submit" :disabled="busy">
              新增並進入
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.create {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(8, 10, 14, 0.72);
  backdrop-filter: blur(8px);
}

.modal {
  width: min(420px, 100%);
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow);
}

.modal h2 {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
}

.tip {
  margin: 0 0 1.1rem;
  font-size: 0.88rem;
}

.form {
  display: grid;
  gap: 0.85rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.35rem;
}

@media (max-width: 480px) {
  .modal {
    padding: 1.15rem;
    border-radius: 14px;
  }

  .actions {
    flex-direction: column-reverse;
  }

  .actions .btn {
    width: 100%;
  }

  .create .btn-primary {
    width: 100%;
  }
}
</style>

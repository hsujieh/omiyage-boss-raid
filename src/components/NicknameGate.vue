<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  visible: boolean
  initialNickname?: string
  showLineLogin?: boolean
  lineError?: string
}>()

const emit = defineEmits<{
  submit: [nickname: string]
  lineLogin: []
}>()

const nickname = ref(props.initialNickname ?? '')
const error = ref('')

const canSubmit = computed(() => nickname.value.trim().length >= 1)

function onSubmit() {
  const n = nickname.value.trim()
  if (!n) {
    error.value = '請輸入暱稱'
    return
  }
  if (n.length > 20) {
    error.value = '暱稱請在 20 字以內'
    return
  }
  error.value = ''
  emit('submit', n)
}
</script>

<template>
  <div v-if="visible" class="gate">
    <div class="gate-panel fade-up">
      <h2 class="brand">進入</h2>
      <p class="muted">建議用 LINE 登入帶入名稱；也可手動輸入。</p>

      <button
        v-if="showLineLogin"
        type="button"
        class="btn btn-line"
        @click="emit('lineLogin')"
      >
        使用 LINE 登入
      </button>

      <p v-if="lineError" class="err line-err">LINE：{{ lineError }}</p>

      <div v-if="showLineLogin" class="divider"><span>或</span></div>

      <form @submit.prevent="onSubmit">
        <div class="field">
          <label for="nick">暱稱</label>
          <input
            id="nick"
            v-model="nickname"
            type="text"
            maxlength="20"
            placeholder="例如：小明"
            autocomplete="nickname"
          />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="!canSubmit">
          用暱稱進入
        </button>
        <p v-if="error" class="err">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(8, 10, 14, 0.72);
  backdrop-filter: blur(8px);
  padding: 1rem;
}

.gate-panel {
  width: min(400px, 100%);
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: var(--shadow);
}

.gate-panel h2 {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
}

.gate-panel > p {
  margin: 0 0 1.1rem;
}

.gate-panel form {
  display: grid;
  gap: 1rem;
}

.gate-panel .btn {
  width: 100%;
}

.btn-line {
  background: #06c755;
  color: #fff;
  border: none;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.btn-line:hover {
  filter: brightness(1.05);
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
  color: var(--ink-muted);
  font-size: 0.85rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
}

.err {
  margin: 0;
  color: var(--danger);
  font-size: 0.9rem;
}

.line-err {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  word-break: break-all;
}
</style>

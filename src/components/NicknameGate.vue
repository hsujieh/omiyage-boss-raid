<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  visible: boolean
  initialNickname?: string
}>()

const emit = defineEmits<{
  submit: [nickname: string]
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
      <h2 class="brand">輸入暱稱</h2>
      <p class="muted">本機會記住你。</p>
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
            autofocus
          />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="!canSubmit">
          開始填空檔
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

.gate-panel p {
  margin: 0 0 1.25rem;
}

.gate-panel form {
  display: grid;
  gap: 1rem;
}

.gate-panel .btn {
  width: 100%;
}

.err {
  margin: 0;
  color: var(--danger);
  font-size: 0.9rem;
}
</style>

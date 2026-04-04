<template>
  <div class="p-5 space-y-4">
    <div class="text-center space-y-1">
      <p class="text-sm font-semibold text-neutral-200">Iniciar sesión</p>
      <p class="text-xs text-neutral-500">Accede con tu cuenta de Tempo</p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-3">
      <div>
        <input
          v-model="form.username"
          type="text"
          placeholder="Usuario"
          autocomplete="username"
          class="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>
      <div>
        <input
          v-model="form.password"
          type="password"
          placeholder="Contraseña"
          autocomplete="current-password"
          class="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      <p v-if="error" class="text-xs text-red-400 text-center">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading || !form.username || !form.password"
        class="w-full py-2 rounded-lg text-sm font-semibold transition-colors bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span v-if="loading">Entrando...</span>
        <span v-else>Entrar</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { login, type TempoUser } from '../../lib/api'

const emit = defineEmits<{ 'logged-in': [user: TempoUser] }>()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    const user = await login(form.username, form.password)
    emit('logged-in', user)
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? ''
    error.value = msg || 'Usuario o contraseña incorrectos'
  } finally {
    loading.value = false
  }
}
</script>

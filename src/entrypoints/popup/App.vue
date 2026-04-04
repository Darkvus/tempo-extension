<template>
  <div class="w-[340px] bg-neutral-950 text-white font-sans select-none">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
      <div class="flex items-center gap-2">
        <span class="text-amber-400 font-bold text-base tracking-wide">TEMPO</span>
        <span class="text-xs text-neutral-500">Fichaje</span>
      </div>
      <button
        v-if="user"
        @click="handleLogout"
        class="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        Cerrar sesión
      </button>
    </div>

    <!-- Login view -->
    <LoginView v-if="!user" @logged-in="onLoggedIn" />

    <!-- Session view -->
    <SessionView v-else :user="user" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoginView from './LoginView.vue'
import SessionView from './SessionView.vue'
import { getStoredUser, clearTokens, type TempoUser } from '../../lib/api'

const user = ref<TempoUser | null>(null)

onMounted(async () => {
  user.value = await getStoredUser()
})

function onLoggedIn(u: TempoUser) {
  user.value = u
}

async function handleLogout() {
  await clearTokens()
  user.value = null
}
</script>

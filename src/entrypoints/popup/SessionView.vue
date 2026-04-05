<template>
  <div class="p-4 space-y-4">
    <!-- User info -->
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-sm font-bold text-black shrink-0">
        {{ initials }}
      </div>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-white truncate">{{ user.first_name }} {{ user.last_name }}</p>
        <p class="text-xs text-neutral-500">@{{ user.username }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-6 text-center text-xs text-neutral-500">Cargando...</div>

    <!-- Active session -->
    <template v-else-if="session">
      <div class="bg-neutral-900 rounded-xl p-4 space-y-3 border border-neutral-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-widest" :class="session.status === 'paused' ? 'text-amber-400' : 'text-green-400'">
            {{ session.status === 'paused' ? 'Pausada' : 'En curso' }}
          </span>
          <span class="font-mono text-lg font-bold text-white tabular-nums">{{ elapsed }}</span>
        </div>

        <div class="space-y-1 text-xs text-neutral-400">
          <p v-if="user.company">Empresa: <span class="text-neutral-200">{{ user.company.company_name }}</span></p>
          <p v-if="projectName">Proyecto: <span class="text-neutral-200">{{ projectName }}</span></p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-1">
          <button
            v-if="session.status === 'active'"
            @click="handlePause"
            :disabled="acting"
            class="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-40 transition-colors"
          >
            Pausar
          </button>
          <button
            v-if="session.status === 'paused'"
            @click="handleResume"
            :disabled="acting"
            class="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 transition-colors"
          >
            Reanudar
          </button>
          <button
            @click="handleStop"
            :disabled="acting"
            class="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-900/60 hover:bg-red-900 text-red-300 disabled:opacity-40 transition-colors"
          >
            Detener
          </button>
        </div>
      </div>
    </template>

    <!-- No active session -->
    <template v-else>
      <div class="space-y-3">
        <p class="text-xs text-neutral-500 text-center">No hay sesión activa</p>

        <!-- Project select -->
        <select
          v-if="projects.length"
          v-model="selectedProjectId"
          class="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">Sin proyecto</option>
          <option v-for="p in projects" :key="p.project_id" :value="p.project_id">{{ p.name }}</option>
        </select>

        <button
          @click="handleStart"
          :disabled="acting"
          class="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="acting">Iniciando...</span>
          <span v-else>Iniciar sesión de trabajo</span>
        </button>
      </div>
    </template>

    <p v-if="actionError" class="text-xs text-red-400 text-center">{{ actionError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  getActiveSession,
  getProjects,
  startSession,
  pauseSession,
  resumeSession,
  stopSession,
  type TempoUser,
  type WorkSession,
  type Project,
} from '../../lib/api'
import { formatElapsed, elapsedSeconds } from '../../lib/timer'

const props = defineProps<{ user: TempoUser }>()

const loading = ref(true)
const acting = ref(false)
const actionError = ref('')
const session = ref<WorkSession | null>(null)
const projects = ref<Project[]>([])
const selectedProjectId = ref('')
const elapsedSecs = ref(0)
let ticker: ReturnType<typeof setInterval> | null = null

// ── Computed ───────────────────────────────────────────────────────────────

const initials = computed(() => {
  const u = props.user
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? u.username[0]}`.toUpperCase()
})

const elapsed = computed(() => formatElapsed(elapsedSecs.value))

const projectName = computed(() =>
  projects.value.find((p) => p.project_id === session.value?.linked_project_id)?.name ?? '',
)

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    await loadSession()
  } finally {
    loading.value = false
  }
})

onUnmounted(() => stopTicker())

watch(session, (s) => {
  stopTicker()
  if (!s) return
  const isPaused = s.status === 'paused' || !!s.paused_at
  if (isPaused && s.paused_at) {
    elapsedSecs.value = Math.max(0, elapsedSeconds(s.started_at) - elapsedSeconds(s.paused_at))
  } else {
    elapsedSecs.value = elapsedSeconds(s.started_at)
    ticker = setInterval(() => elapsedSecs.value++, 1000)
  }
}, { immediate: true })

// ── Helpers ────────────────────────────────────────────────────────────────

function stopTicker() {
  if (ticker) { clearInterval(ticker); ticker = null }
}

async function loadSession() {
  session.value = await getActiveSession(props.user.user_id)
}

// ── Actions ────────────────────────────────────────────────────────────────

async function withAction(fn: () => Promise<void>) {
  if (acting.value) return
  acting.value = true
  actionError.value = ''
  try {
    await fn()
  } catch {
    actionError.value = 'Error al procesar la acción'
  } finally {
    acting.value = false
  }
}

async function handleStart() {
  await withAction(async () => {
    session.value = await startSession({
      user_id: props.user.user_id,
      project_id: selectedProjectId.value || undefined,
    })
  })
}

async function handlePause() {
  await withAction(async () => {
    await pauseSession(session.value!.session_id)
    session.value = await getActiveSession(props.user.user_id)
  })
}

async function handleResume() {
  await withAction(async () => {
    await resumeSession(session.value!.session_id)
    session.value = await getActiveSession(props.user.user_id)
  })
}

async function handleStop() {
  await withAction(async () => {
    await stopSession(session.value!.session_id)
    session.value = null
    selectedProjectId.value = ''
  })
}
</script>

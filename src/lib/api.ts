/**
 * Tempo API client for the extension.
 * Uses extension storage instead of localStorage.
 */
import axios from 'axios'

const BASE_URL = 'https://tempo.darkvus.com/api'

// ── Storage helpers ────────────────────────────────────────────────────────

export async function getTokens(): Promise<{ access: string | null; refresh: string | null }> {
  const data = await browser.storage.local.get(['tempo_access', 'tempo_refresh'])
  return { access: data.tempo_access ?? null, refresh: data.tempo_refresh ?? null }
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await browser.storage.local.set({ tempo_access: access, tempo_refresh: refresh })
}

export async function clearTokens(): Promise<void> {
  await browser.storage.local.remove(['tempo_access', 'tempo_refresh', 'tempo_user'])
}

export async function getStoredUser(): Promise<TempoUser | null> {
  const data = await browser.storage.local.get('tempo_user')
  return data.tempo_user ?? null
}

export async function setStoredUser(user: TempoUser): Promise<void> {
  await browser.storage.local.set({ tempo_user: user })
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface TempoUser {
  user_id: string
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export interface Company {
  company_id: string
  name: string
}

export interface Project {
  project_id: string
  name: string
}

export interface WorkSession {
  session_id: string
  start_time: string
  end_time: string | null
  status: 'active' | 'paused' | 'completed'
  project_id: string | null
  company_id: string
}

// ── Axios instance ─────────────────────────────────────────────────────────

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 })

api.interceptors.request.use(async (config) => {
  const { access } = await getTokens()
  if (access && config.headers) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { refresh } = await getTokens()
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/users/auth/refresh`, { refresh })
          await setTokens(data.access, refresh)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          await clearTokens()
        }
      }
    }
    return Promise.reject(error)
  },
)

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<TempoUser> {
  const { data } = await api.post('/users/auth/login', { username, password })
  await setTokens(data.access, data.refresh)

  const { data: me } = await api.get(`/users/${data.user_id}`)
  const user: TempoUser = {
    user_id: data.user_id,
    username: me.username,
    first_name: me.first_name,
    last_name: me.last_name,
    email: me.email,
    role: me.role,
  }
  await setStoredUser(user)
  return user
}

export async function logout(): Promise<void> {
  try {
    const { refresh } = await getTokens()
    if (refresh) await api.post('/users/auth/logout', { refresh })
  } catch { /* ignore */ }
  await clearTokens()
}

// ── Companies & Projects ──────────────────────────────────────────────────

export async function getMyCompanies(): Promise<Company[]> {
  const user = await getStoredUser()
  if (!user) return []
  const { data } = await api.get('/business/companies/', { params: { member_id: user.user_id } })
  return data
}

export async function getProjects(companyId: string): Promise<Project[]> {
  const { data } = await api.get('/professional/projects/', { params: { company_id: companyId } })
  return data
}

// ── Work sessions ─────────────────────────────────────────────────────────

export async function getActiveSession(userId: string): Promise<WorkSession | null> {
  try {
    const { data } = await api.get('/professional/sessions/', {
      params: { user_id: userId, status: 'active' },
    })
    const sessions: WorkSession[] = Array.isArray(data) ? data : data.results ?? []
    return sessions.find((s) => s.status === 'active') ?? null
  } catch {
    return null
  }
}

export async function startSession(payload: {
  user_id: string
  company_id: string
  project_id?: string
}): Promise<WorkSession> {
  const { data } = await api.post('/professional/sessions/', payload)
  return data
}

export async function pauseSession(sessionId: string): Promise<WorkSession> {
  const { data } = await api.patch(`/professional/sessions/${sessionId}/`, { action: 'pause' })
  return data
}

export async function resumeSession(sessionId: string): Promise<WorkSession> {
  const { data } = await api.patch(`/professional/sessions/${sessionId}/`, { action: 'resume' })
  return data
}

export async function stopSession(sessionId: string): Promise<WorkSession> {
  const { data } = await api.patch(`/professional/sessions/${sessionId}/`, { action: 'stop' })
  return data
}

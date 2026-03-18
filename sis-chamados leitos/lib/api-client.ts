// API Client para comunicação com o backend
import type {
  ApiResponse,
  AdminUser,
  Bed,
  BedCall,
  SoundSettings,
  RefreshSettings,
  SLAStats,
  LoginRequest,
  CreateBedRequest,
  UpdateBedRequest,
  CreateCallRequest,
  UpdateCallStatusRequest,
  CallStatus,
  WardType,
} from './types'

const API_BASE = '/api'

// Helper para fazer requisições
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('API Error:', error)
    return {
      success: false,
      error: 'Erro de conexão com o servidor',
    }
  }
}

// ==================== AUTH ====================

export async function login(credentials: LoginRequest) {
  return fetchApi<{ user: AdminUser; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function logout() {
  return fetchApi<void>('/auth/logout', {
    method: 'POST',
  })
}

export async function getSession() {
  return fetchApi<{ user: AdminUser }>('/auth/session')
}

// ==================== USERS ====================

export async function getUsers() {
  return fetchApi<{ users: AdminUser[] }>('/users')
}

export async function getUser(id: string) {
  return fetchApi<{ user: AdminUser }>(`/users/${id}`)
}

export async function createUser(data: { name: string; email: string; password: string }) {
  return fetchApi<{ user: AdminUser }>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateUser(id: string, data: Partial<{ name: string; email: string; password: string }>) {
  return fetchApi<void>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteUser(id: string) {
  return fetchApi<void>(`/users/${id}`, {
    method: 'DELETE',
  })
}

// ==================== BEDS ====================

export async function getBeds(filters?: { ward?: WardType; status?: string }) {
  const params = new URLSearchParams()
  if (filters?.ward) params.append('ward', filters.ward)
  if (filters?.status) params.append('status', filters.status)
  
  const queryString = params.toString()
  return fetchApi<{ beds: Bed[] }>(`/beds${queryString ? `?${queryString}` : ''}`)
}

export async function getBed(id: string) {
  return fetchApi<{ bed: Bed }>(`/beds/${id}`)
}

export async function createBed(data: CreateBedRequest) {
  return fetchApi<{ bed: Bed }>('/beds', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBed(id: string, data: UpdateBedRequest) {
  return fetchApi<{ bed: Bed }>(`/beds/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteBed(id: string) {
  return fetchApi<void>(`/beds/${id}`, {
    method: 'DELETE',
  })
}

// ==================== CALLS ====================

export async function getCalls(filters?: {
  status?: CallStatus
  priority?: string
  ward?: WardType
  bedNumber?: string
  active?: boolean
}) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.priority) params.append('priority', filters.priority)
  if (filters?.ward) params.append('ward', filters.ward)
  if (filters?.bedNumber) params.append('bedNumber', filters.bedNumber)
  if (filters?.active) params.append('active', 'true')
  
  const queryString = params.toString()
  return fetchApi<{ calls: BedCall[] }>(`/calls${queryString ? `?${queryString}` : ''}`)
}

export async function getCall(id: string) {
  return fetchApi<{ call: BedCall }>(`/calls/${id}`)
}

export async function createCall(data: CreateCallRequest) {
  return fetchApi<{ call: BedCall }>('/calls', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCallStatus(id: string, data: UpdateCallStatusRequest) {
  return fetchApi<{ call: BedCall }>(`/calls/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCall(id: string) {
  return fetchApi<void>(`/calls/${id}`, {
    method: 'DELETE',
  })
}

// ==================== SETTINGS ====================

export async function getSoundSettings() {
  return fetchApi<{ settings: SoundSettings }>('/settings/sound')
}

export async function updateSoundSettings(data: Partial<SoundSettings>) {
  return fetchApi<{ settings: SoundSettings }>('/settings/sound', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getRefreshSettings() {
  return fetchApi<{ settings: RefreshSettings }>('/settings/refresh')
}

export async function updateRefreshSettings(data: Partial<RefreshSettings>) {
  return fetchApi<{ settings: RefreshSettings }>('/settings/refresh', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// ==================== STATS ====================

export async function getSLAStats() {
  return fetchApi<{ stats: SLAStats[] }>('/stats/sla')
}

export async function getDashboardStats() {
  return fetchApi<{
    stats: {
      totalBeds: number
      totalCalls: number
      activeCalls: number
      completedToday: number
      bedsByWard: Record<WardType, number>
      callsByPriority: { emergency: number; urgent: number; routine: number }
      bedsByStatus: { available: number; occupied: number; maintenance: number; reserved: number }
    }
  }>('/stats/dashboard')
}

// ==================== HEALTH ====================

export async function checkHealth() {
  return fetchApi<{
    health: {
      status: 'healthy' | 'unhealthy'
      database: 'connected' | 'disconnected'
      timestamp: string
      version: string
    }
  }>('/health')
}

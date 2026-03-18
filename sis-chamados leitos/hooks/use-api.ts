import useSWR, { mutate } from 'swr'
import * as api from '@/lib/api-client'
import type {
  AdminUser,
  Bed,
  BedCall,
  SoundSettings,
  RefreshSettings,
  SLAStats,
  WardType,
  CallStatus,
} from '@/lib/types'

// Fetcher genérico
const fetcher = async <T>(key: string, fetchFn: () => Promise<{ success: boolean; data?: T; error?: string }>) => {
  const response = await fetchFn()
  if (!response.success) {
    throw new Error(response.error || 'Erro desconhecido')
  }
  return response.data
}

// ==================== AUTH HOOKS ====================

export function useSession() {
  const { data, error, isLoading, mutate: mutateSession } = useSWR(
    'session',
    () => fetcher('session', api.getSession),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  return {
    user: data?.user as AdminUser | undefined,
    isAuthenticated: !!data?.user,
    isLoading,
    error,
    mutate: mutateSession,
  }
}

// ==================== USERS HOOKS ====================

export function useUsers() {
  const { data, error, isLoading, mutate: mutateUsers } = useSWR(
    'users',
    () => fetcher('users', api.getUsers)
  )

  return {
    users: (data?.users || []) as AdminUser[],
    isLoading,
    error,
    mutate: mutateUsers,
  }
}

// ==================== BEDS HOOKS ====================

export function useBeds(filters?: { ward?: WardType; status?: string }) {
  const key = filters ? `beds-${JSON.stringify(filters)}` : 'beds'
  
  const { data, error, isLoading, mutate: mutateBeds } = useSWR(
    key,
    () => fetcher(key, () => api.getBeds(filters)),
    {
      refreshInterval: 5000, // Atualizar a cada 5 segundos
    }
  )

  return {
    beds: (data?.beds || []) as Bed[],
    isLoading,
    error,
    mutate: mutateBeds,
  }
}

export function useBed(id: string) {
  const { data, error, isLoading, mutate: mutateBed } = useSWR(
    id ? `bed-${id}` : null,
    () => fetcher(`bed-${id}`, () => api.getBed(id))
  )

  return {
    bed: data?.bed as Bed | undefined,
    isLoading,
    error,
    mutate: mutateBed,
  }
}

// ==================== CALLS HOOKS ====================

export function useCalls(filters?: {
  status?: CallStatus
  priority?: string
  ward?: WardType
  bedNumber?: string
  active?: boolean
}) {
  const key = filters ? `calls-${JSON.stringify(filters)}` : 'calls'
  
  const { data, error, isLoading, mutate: mutateCalls } = useSWR(
    key,
    () => fetcher(key, () => api.getCalls(filters)),
    {
      refreshInterval: 2000, // Atualizar a cada 2 segundos para chamados
    }
  )

  return {
    calls: (data?.calls || []) as BedCall[],
    isLoading,
    error,
    mutate: mutateCalls,
  }
}

export function useActiveCalls() {
  return useCalls({ active: true })
}

export function useCallsForBed(bedNumber: string) {
  return useCalls({ bedNumber, active: true })
}

// ==================== SETTINGS HOOKS ====================

export function useSoundSettings() {
  const { data, error, isLoading, mutate: mutateSettings } = useSWR(
    'sound-settings',
    () => fetcher('sound-settings', api.getSoundSettings)
  )

  return {
    settings: data?.settings as SoundSettings | undefined,
    isLoading,
    error,
    mutate: mutateSettings,
  }
}

export function useRefreshSettings() {
  const { data, error, isLoading, mutate: mutateSettings } = useSWR(
    'refresh-settings',
    () => fetcher('refresh-settings', api.getRefreshSettings)
  )

  return {
    settings: data?.settings as RefreshSettings | undefined,
    isLoading,
    error,
    mutate: mutateSettings,
  }
}

// ==================== STATS HOOKS ====================

export function useSLAStats() {
  const { data, error, isLoading, mutate: mutateStats } = useSWR(
    'sla-stats',
    () => fetcher('sla-stats', api.getSLAStats),
    {
      refreshInterval: 30000, // Atualizar a cada 30 segundos
    }
  )

  return {
    stats: (data?.stats || []) as SLAStats[],
    isLoading,
    error,
    mutate: mutateStats,
  }
}

export function useDashboardStats() {
  const { data, error, isLoading, mutate: mutateStats } = useSWR(
    'dashboard-stats',
    () => fetcher('dashboard-stats', api.getDashboardStats),
    {
      refreshInterval: 10000, // Atualizar a cada 10 segundos
    }
  )

  return {
    stats: data?.stats,
    isLoading,
    error,
    mutate: mutateStats,
  }
}

// ==================== HEALTH HOOKS ====================

export function useHealth() {
  const { data, error, isLoading } = useSWR(
    'health',
    () => fetcher('health', api.checkHealth),
    {
      refreshInterval: 60000, // Verificar a cada minuto
    }
  )

  return {
    health: data?.health,
    isLoading,
    error,
  }
}

// ==================== MUTATION HELPERS ====================

export async function invalidateAll() {
  await mutate(() => true, undefined, { revalidate: true })
}

export async function invalidateBeds() {
  await mutate((key) => typeof key === 'string' && key.startsWith('beds'), undefined, { revalidate: true })
}

export async function invalidateCalls() {
  await mutate((key) => typeof key === 'string' && key.startsWith('calls'), undefined, { revalidate: true })
}

export async function invalidateUsers() {
  await mutate('users', undefined, { revalidate: true })
}

export async function invalidateSettings() {
  await mutate('sound-settings', undefined, { revalidate: true })
  await mutate('refresh-settings', undefined, { revalidate: true })
}

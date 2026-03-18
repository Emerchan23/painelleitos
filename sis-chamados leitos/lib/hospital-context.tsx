"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"

export type CallPriority = "emergency" | "urgent" | "routine"
export type CallStatus = "pending" | "seen" | "attending" | "completed"

export type CallType = "emergency" | "pain" | "hygiene" | "water" | "bed"

export type BedStatus = "available" | "occupied" | "maintenance" | "reserved"
export type WardType = string // Alterado de type union fixo para string para permitir alas dinâmicas

export type AlertSoundType = "beep" | "alarm" | "chime" | "siren" | "bell" | "code_blue" | "pulse" | "high_alert"

export interface Ward {
  id: string
  name: string
  description?: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  password: string
  createdAt: Date
}

export interface SoundSettings {
  enabled: boolean
  volume: number // 0-1
  emergencySound: AlertSoundType
  urgentSound: AlertSoundType
  routineSound: AlertSoundType
  repeatIntervalSeconds: number // 10-120 seconds - interval to repeat sound when not attended
}

export type TimezoneOption = "America/Sao_Paulo" | "America/Manaus" | "America/Bahia" | "America/Fortaleza" | "America/Recife" | "America/Cuiaba" | "America/Porto_Velho" | "America/Rio_Branco"

export const TIMEZONE_LABELS: Record<TimezoneOption, string> = {
  "America/Sao_Paulo": "Brasília (GMT-3)",
  "America/Bahia": "Bahia (GMT-3)",
  "America/Fortaleza": "Fortaleza (GMT-3)",
  "America/Recife": "Recife (GMT-3)",
  "America/Cuiaba": "Cuiabá (GMT-4)",
  "America/Manaus": "Manaus (GMT-4)",
  "America/Porto_Velho": "Porto Velho (GMT-4)",
  "America/Rio_Branco": "Rio Branco (GMT-5)",
}

export interface RefreshSettings {
  enabled: boolean
  intervalSeconds: number // 10-120 seconds
  timezone: TimezoneOption
  company_name?: string
  logo_url?: string
}

export interface Bed {
  id: string
  number: string
  ward: WardType
  room: string
  status: BedStatus
  patientName?: string
  createdAt: Date
  updatedAt: Date
}

export interface BedCall {
  id: string
  bedNumber: string
  room?: string
  patientName: string
  callType: CallType
  priority: CallPriority
  status: CallStatus
  createdAt: Date
  seenAt?: Date
  attendingAt?: Date
  completedAt?: Date
  ward?: WardType
}

interface HospitalContextType {
  // Calls
  calls: BedCall[]
  createCall: (bedNumber: string, patientName: string, callType: CallType, ward?: WardType) => void
  markAsSeen: (callId: string) => void
  attendCall: (callId: string) => void
  completeCall: (callId: string) => void
  getCallsForBed: (bedNumber: string) => BedCall[]
  hasNewCalls: boolean
  setHasNewCalls: (value: boolean) => void
  
  // Beds Management
  beds: Bed[]
  addBed: (bed: Omit<Bed, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateBed: (id: string, updates: Partial<Omit<Bed, "id" | "createdAt">>) => Promise<void>
  deleteBed: (id: string) => Promise<void>
  getBedsByWard: (ward: WardType) => Bed[]
  getOccupiedBeds: () => Bed[]
  
  // Wards Management
  wards: Ward[]
  addWard: (name: string, description?: string) => Promise<void>
  updateWard: (id: string, name: string, description?: string) => Promise<void>
  deleteWard: (id: string) => Promise<void>
  
  // SLA Stats
  getSLAByWard: () => Record<WardType, { avgTime: number; count: number }>

  // Authentication
  currentUser: AdminUser | null
  adminUsers: AdminUser[]
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  addAdminUser: (user: Omit<AdminUser, "id" | "createdAt">) => Promise<void>
  deleteAdminUser: (id: string) => Promise<void>
  isAuthenticated: boolean

  // Sound Settings
  soundSettings: SoundSettings
  updateSoundSettings: (settings: Partial<SoundSettings>) => void
  playAlertSound: (priority: CallPriority) => void

  // Refresh Settings
  refreshSettings: RefreshSettings
  updateRefreshSettings: (settings: Partial<RefreshSettings>) => void
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined)

const CALL_TYPE_PRIORITY: Record<CallType, CallPriority> = {
  emergency: "emergency",
  pain: "urgent",
  hygiene: "routine",
  water: "routine",
  bed: "routine",
}

const CALL_TYPE_LABELS: Record<CallType, string> = {
  emergency: "Emergência",
  pain: "Dor",
  hygiene: "Higiene",
  water: "Água",
  bed: "Ajustar Leito",
}

export const ALERT_SOUND_LABELS: Record<AlertSoundType, string> = {
  beep: "Beep Duplo",
  alarm: "Alarme Hospitalar",
  chime: "Sino",
  siren: "Sirene",
  bell: "Campainha",
  code_blue: "Código Azul (Intenso)",
  pulse: "Pulso Crítico",
  high_alert: "Alerta Máximo",
}

export function getCallTypeLabel(type: CallType): string {
  return CALL_TYPE_LABELS[type]
}

// Default beds for demonstration
const DEFAULT_BEDS: Bed[] = [
  { id: "1", number: "101", ward: "UTI", room: "A1", status: "occupied", patientName: "Maria Silva", createdAt: new Date(), updatedAt: new Date() },
  { id: "2", number: "102", ward: "UTI", room: "A1", status: "occupied", patientName: "João Santos", createdAt: new Date(), updatedAt: new Date() },
  { id: "3", number: "103", ward: "UTI", room: "A2", status: "available", createdAt: new Date(), updatedAt: new Date() },
  { id: "4", number: "201", ward: "Enfermaria", room: "B1", status: "occupied", patientName: "Ana Oliveira", createdAt: new Date(), updatedAt: new Date() },
  { id: "5", number: "202", ward: "Enfermaria", room: "B1", status: "occupied", patientName: "Pedro Costa", createdAt: new Date(), updatedAt: new Date() },
  { id: "6", number: "203", ward: "Enfermaria", room: "B2", status: "maintenance", createdAt: new Date(), updatedAt: new Date() },
  { id: "7", number: "301", ward: "Pediatria", room: "C1", status: "occupied", patientName: "Lucas Mendes", createdAt: new Date(), updatedAt: new Date() },
  { id: "8", number: "302", ward: "Pediatria", room: "C1", status: "available", createdAt: new Date(), updatedAt: new Date() },
  { id: "9", number: "401", ward: "Maternidade", room: "D1", status: "occupied", patientName: "Carla Souza", createdAt: new Date(), updatedAt: new Date() },
  { id: "10", number: "501", ward: "Emergência", room: "E1", status: "occupied", patientName: "Roberto Lima", createdAt: new Date(), updatedAt: new Date() },
  { id: "11", number: "502", ward: "Emergência", room: "E1", status: "reserved", createdAt: new Date(), updatedAt: new Date() },
  { id: "12", number: "503", ward: "Emergência", room: "E2", status: "available", createdAt: new Date(), updatedAt: new Date() },
]

const DEFAULT_WARDS: Ward[] = [
  { id: "ward-uti", name: "UTI", description: "Unidade de Terapia Intensiva" },
  { id: "ward-enfermaria", name: "Enfermaria", description: "Enfermaria Geral" },
  { id: "ward-pediatria", name: "Pediatria", description: "Ala Pediátrica" },
  { id: "ward-maternidade", name: "Maternidade", description: "Ala de Maternidade" },
  { id: "ward-emergencia", name: "Emergência", description: "Pronto Socorro" },
]

// Default admin user
const DEFAULT_ADMIN_USERS: AdminUser[] = [
  { id: "admin1", name: "Administrador", email: "admin@hospital.com", password: "admin123", createdAt: new Date() },
]

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.8,
  emergencySound: "siren",
  urgentSound: "alarm",
  routineSound: "beep",
  repeatIntervalSeconds: 20, // Default 20 seconds
}

const DEFAULT_REFRESH_SETTINGS: RefreshSettings = {
  enabled: true,
  intervalSeconds: 1, // Default 1 second for instant updates
  timezone: "America/Sao_Paulo", // Brasília timezone
}

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [calls, setCalls] = useState<BedCall[]>([]) // Start empty, fetch from API
  const [beds, setBeds] = useState<Bed[]>(DEFAULT_BEDS)
  const [wards, setWards] = useState<Ward[]>(DEFAULT_WARDS)
  const [hasNewCalls, setHasNewCalls] = useState(false)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(DEFAULT_ADMIN_USERS)
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS)
  const [refreshSettings, setRefreshSettings] = useState<RefreshSettings>(DEFAULT_REFRESH_SETTINGS)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
    }
    
    window.addEventListener('click', initAudioContext, { once: true })
    window.addEventListener('touchstart', initAudioContext, { once: true })
    
    return () => {
      window.removeEventListener('click', initAudioContext)
      window.removeEventListener('touchstart', initAudioContext)
    }
  }, [])

  const playAlertSound = useCallback((priority: CallPriority) => {
    if (!soundSettings.enabled) return

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    
    const soundType = priority === "emergency" 
      ? soundSettings.emergencySound 
      : priority === "urgent" 
        ? soundSettings.urgentSound 
        : soundSettings.routineSound

    try {
      const ctx = audioContextRef.current
      const volume = soundSettings.volume
      
      // Resume audio context if suspended (required for some browsers)
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      // Helper function to play a tone
      const playTone = (frequency: number, duration: number, type: OscillatorType, vol: number, delay: number = 0) => {
        const startTime = ctx.currentTime + delay
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = frequency
        osc.type = type
        gain.gain.setValueAtTime(vol, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration)
      }

      // Helper function to play a siren sweep
      const playSiren = (startFreq: number, endFreq: number, duration: number, vol: number, delay: number = 0) => {
        const startTime = ctx.currentTime + delay
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(startFreq, startTime)
        osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration / 2)
        osc.frequency.linearRampToValueAtTime(startFreq, startTime + duration)
        gain.gain.setValueAtTime(vol, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration)
      }

      switch (soundType) {
        case "beep":
          // Double beep
          playTone(880, 0.3, 'sine', volume * 0.3, 0)
          playTone(880, 0.3, 'sine', volume * 0.3, 0.2)
          break

        case "alarm":
          // Hospital alarm - alternating tones
          for (let i = 0; i < 6; i++) {
            const freq = i % 2 === 0 ? 800 : 1000
            playTone(freq, 0.15, 'square', volume * 0.4, i * 0.18)
          }
          break

        case "chime":
          // Pleasant chime - C5, E5, G5 chord
          const chimeFreqs = [523, 659, 784]
          chimeFreqs.forEach((freq, i) => {
            playTone(freq, 0.4, 'sine', volume * 0.25, i * 0.15)
          })
          break

        case "siren":
          // Urgent siren - sweeping frequency
          for (let i = 0; i < 3; i++) {
            playSiren(600, 1200, 0.5, volume * 0.5, i * 0.6)
          }
          break

        case "bell":
          // Bell ring - high frequency with decay
          for (let i = 0; i < 3; i++) {
            playTone(1047, 0.5, 'sine', volume * 0.35, i * 0.4)
          }
          break

        case "code_blue":
          // Code Blue - intense alternating triad
          for (let i = 0; i < 8; i++) {
            const freq = i % 2 === 0 ? 1200 : 900
            playTone(freq, 0.1, 'square', volume * 0.6, i * 0.15)
          }
          break

        case "pulse":
          // Critical Pulse - rapid high-pitched staccato
          for (let i = 0; i < 10; i++) {
            playTone(1500, 0.05, 'sawtooth', volume * 0.5, i * 0.1)
          }
          break

        case "high_alert":
          // Fast aggressive sweep
          for (let i = 0; i < 5; i++) {
            playSiren(800, 1600, 0.2, volume * 0.6, i * 0.25)
          }
          break
      }
      
      // Update last sound time to reset repetition timer
      lastSoundTimeRef.current = Date.now()
    } catch {
      // Audio failed silently
    }
  }, [soundSettings])

  // Fetch calls from API
  const fetchCalls = useCallback(async () => {
    try {
      // Add timestamp to prevent browser caching
      const response = await fetch(`/api/calls?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      const data = await response.json()
      if (data.success && data.data && data.data.calls) {
        const parsedCalls = data.data.calls.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          seenAt: c.seenAt ? new Date(c.seenAt) : undefined,
          attendingAt: c.attendingAt ? new Date(c.attendingAt) : undefined,
          completedAt: c.completedAt ? new Date(c.completedAt) : undefined,
        }))

        setCalls((prev) => {
          // Check for new pending calls to play sound
          const prevPendingIds = prev.filter(c => c.status === 'pending').map(c => c.id)
          const newPendingCalls = parsedCalls.filter((c: any) => c.status === 'pending' && !prevPendingIds.includes(c.id))
          
          if (newPendingCalls.length > 0) {
            setHasNewCalls(true)
          }
          
          return parsedCalls
        })
      }
    } catch (error) {
      console.error('Error fetching calls:', error)
    }
  }, []) // Remove sound dependencies from fetchCalls

  // Separate effect to handle playing sounds when calls change
  useEffect(() => {
    if (!soundSettings.enabled) return;

    const pendingCalls = calls.filter(c => c.status === 'pending')
    if (pendingCalls.length === 0) return;

    // Check if we have any newly created calls that haven't been sounded yet
    // For simplicity, we just check if hasNewCalls is true
    if (hasNewCalls) {
      const highestPriority = pendingCalls.reduce((highest: any, call: any) => {
        const priorityOrder: Record<CallPriority, number> = { emergency: 0, urgent: 1, routine: 2 }
        return priorityOrder[call.priority] < priorityOrder[highest.priority] ? call : highest
      }, pendingCalls[0])
      
      playAlertSound(highestPriority.priority)
    }
  }, [calls, hasNewCalls, playAlertSound, soundSettings.enabled])

  // Fetch settings from API
  const fetchSettings = useCallback(async () => {
    try {
      // Sound Settings
      const soundResponse = await fetch('/api/settings/sound')
      const soundData = await soundResponse.json()
      if (soundData.success && soundData.data && soundData.data.settings) {
        setSoundSettings(soundData.data.settings)
      }

      // Refresh Settings
      const refreshResponse = await fetch('/api/settings/refresh')
      const refreshData = await refreshResponse.json()
      if (refreshData.success && refreshData.data && refreshData.data.settings) {
        setRefreshSettings(refreshData.data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }, [])

  // --- As chamadas iniciais foram movidas para o final do componente para evitar TDZ ---

  // Polling for calls (fast)
  useEffect(() => {
    if (!refreshSettings.enabled) return

    // Garantir que a busca mais rápida (2 segundos) seja feita
    // independentemente do que está no banco, para a tela de Enfermagem ficar em tempo real
    const interval = setInterval(() => {
      fetchCalls()
    }, 2000)
    return () => clearInterval(interval)
  }, [fetchCalls, refreshSettings.enabled])

  // Polling for settings (slow - every 30s) to sync across devices
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSettings()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchSettings])

  // Ref to track the last time a sound was played for repetition
  const lastSoundTimeRef = useRef<number>(0)
  // Ref to access current calls inside the interval without resetting it
  const callsRef = useRef(calls)

  // Keep callsRef in sync
  useEffect(() => {
    callsRef.current = calls
  }, [calls])

  // Repeat sound for unattended calls
  useEffect(() => {
    if (!soundSettings.enabled) return

    // Check frequently (every 1s) if we need to play a repeat sound
    const interval = setInterval(() => {
      const pendingCalls = callsRef.current.filter((c) => c.status === "pending")
      if (pendingCalls.length === 0) return

      const now = Date.now()
      // Check if enough time has passed since the last sound
      // We add a small buffer (100ms) to ensure stability
      if (now - lastSoundTimeRef.current >= (soundSettings.repeatIntervalSeconds * 1000) - 100) {
        const highestPriority = pendingCalls.reduce((highest: any, call: any) => {
          const priorityOrder: Record<CallPriority, number> = { emergency: 0, urgent: 1, routine: 2 }
          return priorityOrder[call.priority] < priorityOrder[highest.priority] ? call : highest
        }, pendingCalls[0])
        
        playAlertSound(highestPriority.priority)
        lastSoundTimeRef.current = now
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [soundSettings.enabled, soundSettings.repeatIntervalSeconds, playAlertSound])

  const createCall = useCallback(async (bedNumber: string, patientName: string, callType: CallType, ward?: WardType) => {
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedNumber, patientName, callType, ward })
      })
      fetchCalls()
    } catch (error) {
      console.error('Error creating call:', error)
    }
  }, [fetchCalls])

  const markAsSeen = useCallback(async (callId: string) => {
    try {
      await fetch(`/api/calls/${callId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'seen' })
      })
      fetchCalls()
    } catch (error) {
      console.error('Error marking as seen:', error)
    }
  }, [fetchCalls])

  const attendCall = useCallback(async (callId: string) => {
    try {
      await fetch(`/api/calls/${callId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'attending' })
      })
      fetchCalls()
    } catch (error) {
      console.error('Error attending call:', error)
    }
  }, [fetchCalls])

  const completeCall = useCallback(async (callId: string) => {
    try {
      await fetch(`/api/calls/${callId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      })
      fetchCalls()
    } catch (error) {
      console.error('Error completing call:', error)
    }
  }, [fetchCalls])

  const getCallsForBed = useCallback(
    (bedNumber: string) => {
      return calls.filter((call) => call.bedNumber === bedNumber && call.status !== "completed")
    },
    [calls]
  )

  // Bed Management Functions
  const fetchBeds = useCallback(async () => {
    try {
      const response = await fetch('/api/beds')
      const data = await response.json()
      if (data.success && data.data && data.data.beds) {
        setBeds(data.data.beds.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        })))
      }
    } catch (error) {
      console.error('Error fetching beds:', error)
    }
  }, [])

  const addBed = useCallback(async (bedData: Omit<Bed, "id" | "createdAt" | "updatedAt">) => {
    try {
      const response = await fetch('/api/beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bedData)
      })
      if (response.ok) {
        fetchBeds()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao salvar leito')
      }
    } catch (error) {
      console.error('Error adding bed:', error)
    }
  }, [fetchBeds])

  const updateBed = useCallback(async (id: string, updates: Partial<Omit<Bed, "id" | "createdAt">>) => {
    try {
      const response = await fetch(`/api/beds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (response.ok) {
        fetchBeds()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao atualizar leito')
      }
    } catch (error) {
      console.error('Error updating bed:', error)
      alert('Erro de conexão ao atualizar leito')
    }
  }, [fetchBeds])

  const deleteBed = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/beds/${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchBeds()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao excluir leito')
      }
    } catch (error) {
      console.error('Error deleting bed:', error)
      alert('Erro de conexão ao excluir leito')
    }
  }, [fetchBeds])

  const getBedsByWard = useCallback((ward: WardType) => {
    return beds.filter((bed) => bed.ward === ward)
  }, [beds])

  const getOccupiedBeds = useCallback(() => {
    return beds.filter((bed) => bed.status === "occupied")
  }, [beds])

  // Ward Management Functions
  const fetchWards = useCallback(async () => {
    try {
      const response = await fetch('/api/wards')
      const data = await response.json()
      if (data.success && data.data && data.data.wards) {
        setWards(data.data.wards)
      }
    } catch (error) {
      console.error('Error fetching wards:', error)
    }
  }, [])

  const addWard = useCallback(async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })
      if (response.ok) {
        fetchWards()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao salvar ala')
      }
    } catch (error) {
      console.error('Error adding ward:', error)
    }
  }, [fetchWards])

  const updateWard = useCallback(async (id: string, name: string, description?: string) => {
    try {
      const response = await fetch(`/api/wards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })
      if (response.ok) {
        fetchWards()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao atualizar ala')
      }
    } catch (error) {
      console.error('Error updating ward:', error)
      alert('Erro de conexão ao atualizar ala')
    }
  }, [fetchWards])

  const deleteWard = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/wards/${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchWards()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao remover ala')
      }
    } catch (error) {
      console.error('Error deleting ward:', error)
      alert('Erro de conexão ao excluir ala')
    }
  }, [fetchWards])

  // SLA Calculation
  const getSLAByWard = useCallback(() => {
    const completedCalls = calls.filter((call) => call.status === "completed" && call.completedAt && call.ward)
    
    const wardStats: Record<WardType, { totalTime: number; count: number }> = {}
    
    // Initialize stats for all current wards
    wards.forEach(ward => {
      wardStats[ward.name] = { totalTime: 0, count: 0 }
    })
    
    completedCalls.forEach((call) => {
      if (call.ward && call.completedAt) {
        if (!wardStats[call.ward]) {
          wardStats[call.ward] = { totalTime: 0, count: 0 }
        }
        const responseTime = call.completedAt.getTime() - call.createdAt.getTime()
        wardStats[call.ward].totalTime += responseTime
        wardStats[call.ward].count += 1
      }
    })
    
    const result: Record<WardType, { avgTime: number; count: number }> = {} as Record<WardType, { avgTime: number; count: number }>
    
    Object.keys(wardStats).forEach((ward) => {
      const w = ward as WardType
      result[w] = {
        avgTime: wardStats[w].count > 0 ? wardStats[w].totalTime / wardStats[w].count : 0,
        count: wardStats[w].count,
      }
    })
    
    return result
  }, [calls])

  // Authentication
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.success && data.data && data.data.users) {
        setAdminUsers(data.data.users.map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt)
        })))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      if (data.success && data.data && data.data.user) {
        setCurrentUser(data.data.user)
      } else {
        setCurrentUser(null)
      }
    } catch (error) {
      console.error('Error fetching session:', error)
      setCurrentUser(null)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await response.json()
      if (data.success && data.data && data.data.user) {
        setCurrentUser(data.data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Error logging in:', error)
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setCurrentUser(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }, [])

  const addAdminUser = useCallback(async (userData: Omit<AdminUser, "id" | "createdAt">) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      if (response.ok) {
        await fetchUsers()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao criar usuário')
      }
    } catch (error) {
      console.error('Error adding user:', error)
    }
  }, [fetchUsers])

  const deleteAdminUser = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchUsers()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao remover usuário')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }, [fetchUsers])

  const updateSoundSettings = useCallback(async (settings: Partial<SoundSettings>) => {
    try {
      // Otimistic UI update
      setSoundSettings((prev) => ({ ...prev, ...settings }))
      
      // Save to API
      await fetch('/api/settings/sound', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
    } catch (error) {
      console.error('Error updating sound settings:', error)
    }
  }, [])

  const updateRefreshSettings = useCallback(async (settings: Partial<RefreshSettings>) => {
    try {
      // Otimistic UI update
      setRefreshSettings((prev) => ({ ...prev, ...settings }))
      
      // Save to API
      await fetch('/api/settings/refresh', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
    } catch (error) {
      console.error('Error updating refresh settings:', error)
    }
  }, [])

  // Initial fetch - Movido para o final para garantir que todas as funções já foram inicializadas
  useEffect(() => {
    fetchSession()
    fetchCalls()
    fetchSettings()
    fetchBeds()
    fetchWards()
    fetchUsers()
  }, [fetchSession, fetchCalls, fetchSettings, fetchBeds, fetchWards, fetchUsers])

  return (
      <HospitalContext.Provider
      value={{
        calls,
        createCall,
        markAsSeen,
        attendCall,
        completeCall,
        getCallsForBed,
        hasNewCalls,
        setHasNewCalls,
        beds,
        addBed,
        updateBed,
        deleteBed,
        getBedsByWard,
        getOccupiedBeds,
        wards,
        addWard,
        updateWard,
        deleteWard,
        getSLAByWard,
        currentUser,
        adminUsers,
        login,
        logout,
        addAdminUser,
        deleteAdminUser,
        isAuthenticated: !!currentUser,
        soundSettings,
        updateSoundSettings,
        playAlertSound,
        refreshSettings,
        updateRefreshSettings,
      }}
    >
      {children}
    </HospitalContext.Provider>
  )
}

export function useHospital() {
  const context = useContext(HospitalContext)
  if (context === undefined) {
    throw new Error("useHospital must be used within a HospitalProvider")
  }
  return context
}

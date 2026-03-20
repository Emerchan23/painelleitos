// Tipos para o banco de dados

export type CallPriority = 'emergency' | 'urgent' | 'routine'
export type CallStatus = 'pending' | 'seen' | 'attending' | 'completed'
export type CallType = 'emergency' | 'pain' | 'hygiene' | 'water' | 'bed'
export type BedStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'
export type WardType = string
export type AlertSoundType = 'beep' | 'alarm' | 'chime' | 'siren' | 'bell'
export type TimezoneOption = 
  | 'America/Sao_Paulo' 
  | 'America/Manaus' 
  | 'America/Bahia' 
  | 'America/Fortaleza' 
  | 'America/Recife' 
  | 'America/Cuiaba' 
  | 'America/Porto_Velho' 
  | 'America/Rio_Branco'

// Interfaces do banco de dados
export interface DBAdminUser {
  id: string
  name: string
  email: string
  password: string
  created_at: Date
  updated_at: Date
}

export interface DBBed {
  id: string
  number: string
  ward: WardType
  room: string
  status: BedStatus
  patient_name: string | null
  show_in_room: boolean | number
  created_at: Date
  updated_at: Date
}

export interface DBCall {
  id: string
  bed_id: string
  bed_number: string
  patient_name: string
  call_type: CallType
  priority: CallPriority
  status: CallStatus
  ward: WardType | null
  created_at: Date
  seen_at: Date | null
  attending_at: Date | null
  completed_at: Date | null
}

export interface DBSoundSettings {
  id: string
  enabled: boolean
  volume: number
  emergency_sound: AlertSoundType
  urgent_sound: AlertSoundType
  routine_sound: AlertSoundType
  repeat_interval_seconds: number
  updated_at: Date
}

export interface DBRefreshSettings {
  id: string
  enabled: boolean
  interval_seconds: number
  timezone: TimezoneOption
  updated_at: Date
}

export interface DBSession {
  id: string
  user_id: string
  token: string
  expires_at: Date
  created_at: Date
}

export interface DBCallHistory {
  id: string
  call_id: string
  action: 'created' | 'seen' | 'attending' | 'completed'
  user_id: string | null
  details: string | null
  created_at: Date
}

// Interfaces para API responses
export interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: Date
}

export interface DBWard {
  id: string
  name: string
  description: string | null
  created_at: Date
}

export interface Ward {
  id: string
  name: string
  description?: string
  createdAt?: Date
}

export interface Bed {
  id: string
  number: string
  ward: WardType
  room: string
  status: BedStatus
  patientName?: string
  showInRoom: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BedCall {
  id: string
  bedId: string
  bedNumber: string
  patientName: string
  callType: CallType
  priority: CallPriority
  status: CallStatus
  ward?: WardType
  room?: string
  createdAt: Date
  seenAt?: Date
  attendingAt?: Date
  completedAt?: Date
}

export interface SoundSettings {
  enabled: boolean
  volume: number
  emergencySound: AlertSoundType
  urgentSound: AlertSoundType
  routineSound: AlertSoundType
  repeatIntervalSeconds: number
}

export interface RefreshSettings {
  enabled: boolean
  intervalSeconds: number
  timezone: TimezoneOption
}

// Request/Response types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  user?: AdminUser
  token?: string
  error?: string
}

export interface CreateCallRequest {
  bedNumber?: string
  patientName: string
  callType: CallType
  ward?: WardType
  token?: string
}

export interface CreateBedRequest {
  number: string
  ward: WardType
  room: string
  status?: BedStatus
  patientName?: string
  showInRoom?: boolean
}

export interface UpdateBedRequest {
  number?: string
  ward?: WardType
  room?: string
  status?: BedStatus
  patientName?: string
  showInRoom?: boolean
}

export interface UpdateCallStatusRequest {
  status: CallStatus
}

export interface SLAStats {
  ward: WardType
  totalCalls: number
  avgResponseSeconds: number
  minResponseSeconds: number
  maxResponseSeconds: number
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

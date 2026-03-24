"use client"

import { useState, useEffect, useRef } from "react"
import { useHospital, type BedCall, type CallPriority, getCallTypeLabel } from "@/lib/hospital-context"
import { 
  AlertTriangle, 
  Droplets, 
  Bath, 
  BedDouble, 
  HeartPulse, 
  Clock, 
  Play, 
  CheckCircle2,
  Eye,
  Maximize,
  Lock,
  Unlock,
  KeyRound
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

const CALL_ICONS: Record<string, React.ElementType> = {
  emergency: AlertTriangle,
  pain: HeartPulse,
  hygiene: Bath,
  water: Droplets,
  bed: BedDouble,
}

const PRIORITY_CONFIG: Record<CallPriority, { label: string; className: string }> = {
  emergency: { label: "Crítico", className: "bg-emergency text-emergency-foreground" },
  urgent: { label: "Urgente", className: "bg-urgent text-urgent-foreground" },
  routine: { label: "Rotina", className: "bg-routine text-routine-foreground" },
}

export function NursingDashboard() {
  const { 
    calls, markAsSeen, attendCall, completeCall, hasNewCalls, 
    setHasNewCalls, soundSettings, playAlertSound, refreshSettings, updateRefreshSettings, login 
  } = useHospital()
  const [now, setNow] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Layout states
  const [isLayoutUnlocked, setIsLayoutUnlocked] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  // Default sizes
   const defaultLayout = {
      header: 12,
      stats: 8,
      main: 80,
      mainLeft: 75,
      mainRight: 25,
      cardHeight: 280,
      titleBarHeight: 45
    }
  
  const [layout, setLayout] = useState(defaultLayout)
  
  // Load layout from settings
  useEffect(() => {
    if (refreshSettings?.dashboard_layout) {
      try {
        const parsed = JSON.parse(refreshSettings.dashboard_layout)
        setLayout({ ...defaultLayout, ...parsed })
      } catch (e) {
        console.error("Failed to parse dashboard layout", e)
      }
    }
  }, [refreshSettings?.dashboard_layout])

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setIsLoggingIn(true)
    
    const success = await login(adminEmail, adminPassword)
    if (success) {
      setIsLayoutUnlocked(true)
      setShowPasswordDialog(false)
      setAdminPassword("")
    } else {
      setLoginError("Email ou senha inválidos")
    }
    setIsLoggingIn(false)
  }

  const toggleLayoutLock = () => {
    if (isLayoutUnlocked) {
      // Save and lock
      setIsLayoutUnlocked(false)
      updateRefreshSettings({ dashboard_layout: JSON.stringify(layout) })
    } else {
      // Prompt for password
      setShowPasswordDialog(true)
    }
  }

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Refetch calls when they are updated to ensure sync
  useEffect(() => {
    const fetchLatestCalls = async () => {
      try {
        const response = await fetch('/api/calls?active=true')
        const data = await response.json()
        if (data.success && data.data && data.data.calls) {
          // Atualização já tratada no contexto global
        }
      } catch (error) {
        console.error('Error fetching latest calls:', error)
      }
    }
    
    // Polling muito mais rápido para garantir que as ações sejam refletidas quase instantaneamente
    const pollInterval = setInterval(fetchLatestCalls, 2000)
    return () => clearInterval(pollInterval)
  }, [])

  // Auto-refresh based on settings
  // Disabled here as it's now handled by HospitalProvider

  // Clear new calls notification when viewing
  useEffect(() => {
    if (hasNewCalls) {
      const timeout = setTimeout(() => setHasNewCalls(false), 3000) // Changed to 3s to allow sound to play
      return () => clearTimeout(timeout)
    }
  }, [hasNewCalls, setHasNewCalls])

  // Fix the sort function to handle Date string conversion properly
  const activeCalls = [...calls]
    .filter((call) => call.status !== "completed")
    .sort((a, b) => {
      const priorityOrder: Record<CallPriority, number> = { emergency: 0, urgent: 1, routine: 2 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const completedCalls = [...calls]
    .filter((call) => call.status === "completed")
    .sort((a, b) => (new Date(b.completedAt || 0).getTime()) - (new Date(a.completedAt || 0).getTime()))
    .slice(0, 5)

  const stats = {
    total: activeCalls.length,
    emergency: activeCalls.filter((c) => c.priority === "emergency").length,
    urgent: activeCalls.filter((c) => c.priority === "urgent").length,
    routine: activeCalls.filter((c) => c.priority === "routine").length,
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const getCompletionDuration = (call: BedCall) => {
    if (!call.completedAt) return ""
    const created = new Date(call.createdAt)
    const completed = new Date(call.completedAt)
    
    // Calcular a duração em milissegundos
    let durationMs = completed.getTime() - created.getTime()
    
    // Auto-correção de fuso horário robusta
    // Se a duração for negativa (ex: -180 min), é porque 'completed' está em UTC e 'created' em local
    if (durationMs < -60000) { 
       durationMs += 10800000 // +3h
    } 
    // Se a duração for absurdamente grande (ex: ~3h) para um chamado recente, é o inverso
    else if (durationMs > 10000000 && durationMs < 11500000) { 
       durationMs -= 10800000 // -3h
    }
    
    if (durationMs < 0) durationMs = 0
    
    const durationHours = Math.floor(durationMs / 3600000)
    const durationMin = Math.floor((durationMs % 3600000) / 60000)
    const durationSec = Math.floor((durationMs % 60000) / 1000)
    
    if (durationHours > 0) {
      return `${durationHours}h ${durationMin}m ${durationSec}s`
    }
    return `${durationMin}m ${durationSec}s`
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-background overflow-hidden">
      <PanelGroup direction="vertical" onLayout={(sizes) => {
        if (sizes.length === 3) {
          setLayout(prev => ({ ...prev, header: sizes[0], stats: sizes[1], main: sizes[2] }))
        }
      }}>
        {/* Header - Compact for TV */}
        <Panel defaultSize={layout.header} minSize={5} maxSize={25} className="bg-card shadow-sm z-40 flex flex-col">
          <header className="w-full h-full border-b border-border flex flex-col justify-center px-4 py-1.5 min-h-[40px]">
            <div className="flex items-center justify-between">
              {/* Left Area: Title & Navigation */}
              <div className="flex items-center gap-3 w-auto shrink-0">
                <div className="bg-primary p-2 rounded-xl shadow-inner shrink-0 hidden sm:block">
                  <HeartPulse className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="whitespace-nowrap hidden lg:block">
                  <h1 className="text-xl font-black text-foreground tracking-tight">Central de Enfermagem</h1>
                  <p className="text-sm font-medium text-muted-foreground">Painel de Chamados</p>
                </div>
              </div>

              {/* Center Area: Custom Company Info (Logo + Name) */}
              <div className="flex items-center justify-center flex-1 mx-2 sm:mx-4 lg:mx-8 min-w-0">
                <div className="flex flex-row items-center justify-center text-center opacity-90 gap-3 bg-muted/20 px-4 py-1.5 rounded-2xl w-full max-w-2xl min-w-0">
                  {refreshSettings?.logo_url && (
                    <div className="relative h-8 sm:h-10 shrink-0 flex items-center">
                      <img 
                        src={refreshSettings.logo_url} 
                        alt="Logo" 
                        className="h-full w-auto object-contain max-w-[150px]"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                  <span className="text-sm sm:text-lg lg:text-xl font-black tracking-widest uppercase text-slate-700 dark:text-slate-200 leading-tight truncate">
                    {refreshSettings?.company_name || "HOSPITAL SYSTEM"}
                  </span>
                </div>
              </div>

              {/* Right Area: Controls & Clock */}
              <div className="flex items-center justify-end gap-2 sm:gap-4 w-auto shrink-0">
                {/* Layout Lock/Unlock Toggle */}
                <Button
                  variant={isLayoutUnlocked ? "default" : "ghost"}
                  size="lg"
                  onClick={toggleLayoutLock}
                  className={cn(
                    "h-10 w-10 p-0 rounded-full shrink-0 transition-colors",
                    isLayoutUnlocked ? "bg-blue-600 hover:bg-blue-700 text-white animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.5)]" : "bg-muted/50 hover:bg-muted"
                  )}
                  title={isLayoutUnlocked ? "Salvar e Travar Layout" : "Destrancar Layout (Requer Senha)"}
                >
                  {isLayoutUnlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5 opacity-50" />}
                </Button>

                {/* Fullscreen Toggle */}
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={toggleFullscreen}
                  className="h-10 w-10 p-0 rounded-full bg-muted/50 hover:bg-muted shrink-0"
                  title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                >
                  <Maximize className="h-5 w-5" />
                </Button>

                {/* Clock */}
                <div className="text-right border-l border-border pl-2 sm:pl-4 ml-1 shrink-0">
                  <p className="text-lg sm:text-2xl font-black text-foreground tabular-nums tracking-tighter">
                    {now.toLocaleTimeString("pt-BR", { 
                      timeZone: refreshSettings.timezone,
                      hour: "2-digit", 
                      minute: "2-digit", 
                      second: "2-digit" 
                    })}
                  </p>
                  <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 hidden sm:block">
                    {now.toLocaleDateString("pt-BR", { 
                      timeZone: refreshSettings.timezone,
                      weekday: "long", 
                      day: "numeric", 
                      month: "short" 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </header>
        </Panel>

        {isLayoutUnlocked && (
          <PanelResizeHandle className="h-2 bg-blue-500/50 hover:bg-blue-600 active:bg-blue-700 transition-colors cursor-row-resize z-50 flex items-center justify-center border-y border-border">
            <div className="w-16 h-1 bg-white/80 rounded-full" />
          </PanelResizeHandle>
        )}

        {/* Stats Bar - Large for TV visibility */}
        <Panel defaultSize={layout.stats} minSize={5} maxSize={20} className="bg-card shadow-sm z-30 flex flex-col">
          <div className="w-full h-full px-4 py-1 flex items-center justify-center min-h-[30px] overflow-hidden">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 h-full">
              <StatBadge label="Total Ativos" value={stats.total} large />
              <div className="h-4 sm:h-6 w-px bg-border hidden sm:block"></div>
              <StatBadge label="Críticos" value={stats.emergency} variant="emergency" large />
              <StatBadge label="Urgentes" value={stats.urgent} variant="urgent" large />
              <StatBadge label="Rotina" value={stats.routine} variant="routine" large />
            </div>
          </div>
        </Panel>

        {isLayoutUnlocked && (
          <PanelResizeHandle className="h-2 bg-blue-500/50 hover:bg-blue-600 active:bg-blue-700 transition-colors cursor-row-resize z-50 flex items-center justify-center border-y border-border">
            <div className="w-16 h-1 bg-white/80 rounded-full" />
          </PanelResizeHandle>
        )}

        {/* Main Content */}
        <Panel defaultSize={layout.main} minSize={40} className="flex flex-col bg-muted/30 relative">
          <PanelGroup direction="horizontal" onLayout={(sizes) => {
            if (sizes.length === 2) {
              setLayout(prev => ({ ...prev, mainLeft: sizes[0], mainRight: sizes[1] }))
            }
          }}>
            {/* Active Calls List - Takes most space */}
            <Panel defaultSize={layout.mainLeft} minSize={50} className="flex flex-col h-full relative">
              <div 
                className="px-4 bg-background border-b border-border shadow-sm z-10 shrink-0 absolute top-0 left-0 right-0 flex items-center justify-between"
                style={{ height: `${layout.titleBarHeight || 45}px` }}
              >
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Chamados Ativos
                </h2>
                
                {isLayoutUnlocked && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Barra:</span>
                      <input 
                        type="range" 
                        min="30" 
                        max="80" 
                        value={layout.titleBarHeight || 45}
                        onChange={(e) => setLayout(prev => ({ ...prev, titleBarHeight: parseInt(e.target.value) }))}
                        className="w-16 accent-blue-600 h-1.5"
                      />
                      <span className="text-[10px] font-mono w-6 font-bold">{layout.titleBarHeight || 45}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cards:</span>
                      <input 
                        type="range" 
                        min="150" 
                        max="400" 
                        value={layout.cardHeight || 280}
                        onChange={(e) => setLayout(prev => ({ ...prev, cardHeight: parseInt(e.target.value) }))}
                        className="w-20 accent-blue-600 h-1.5"
                      />
                      <span className="text-[10px] font-mono w-6 font-bold">{layout.cardHeight || 280}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div 
                className="absolute inset-0 bottom-0 overflow-y-auto p-4 scrollbar-hide pb-24"
                style={{ top: `${layout.titleBarHeight || 45}px` }}
              >
                {activeCalls.length === 0 ? (
                  <Card className="border-2 border-dashed h-full min-h-[200px] flex items-center justify-center">
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
                      <p className="text-2xl font-bold text-foreground">Nenhum chamado pendente</p>
                      <p className="text-lg text-muted-foreground mt-2">Todos os pacientes foram atendidos</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                  style={{ gridAutoRows: `${layout.cardHeight || 280}px` }}
                >
                    {activeCalls.map((call) => (
                      <CallCard 
                        key={call.id} 
                        call={call} 
                        now={now} 
                        onSeen={markAsSeen} 
                        onAttend={attendCall} 
                        onComplete={completeCall} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            {isLayoutUnlocked && (
              <PanelResizeHandle className="w-2 bg-blue-500/50 hover:bg-blue-600 active:bg-blue-700 transition-colors cursor-col-resize z-50 flex items-center justify-center border-x border-border">
                <div className="h-16 w-1 bg-white/80 rounded-full" />
              </PanelResizeHandle>
            )}

            {/* Sidebar - Compact */}
            <Panel defaultSize={layout.mainRight} minSize={15} maxSize={40} className="bg-background border-t xl:border-t-0 border-border flex flex-col shrink-0 h-full relative">
              {/* Recent Completed */}
              <div 
                className="px-4 bg-muted/10 border-b border-border shadow-sm shrink-0 absolute top-0 left-0 right-0 z-10 flex items-center"
                style={{ height: `${layout.titleBarHeight || 45}px` }}
              >
                <h3 className="text-base font-bold flex items-center gap-2 text-foreground/90">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Finalizados Recentes
                </h3>
              </div>
              <div 
                className="absolute inset-0 bottom-0 overflow-y-auto p-0 scrollbar-hide pb-24"
                style={{ top: `${layout.titleBarHeight || 45}px` }}
              >
                {completedCalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 font-medium">
                    Nenhum chamado finalizado
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {completedCalls.map((call) => (
                      <div 
                        key={call.id} 
                        className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-success/70 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-base font-bold text-foreground/90 truncate">
                              Leito {call.bedNumber}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground/80 mt-0.5 truncate">
                              {getCallTypeLabel(call.callType)}
                            </span>
                          </div>
                        </div>
                        
                        <div 
                          className="flex flex-col items-end shrink-0"
                          title={`Finalizado às ${new Date(call.completedAt || new Date()).toLocaleTimeString("pt-BR", { timeZone: refreshSettings?.timezone, hour: "2-digit", minute: "2-digit" })}`}
                        >
                          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 mb-1">
                            Duração
                          </span>
                          <span className="text-sm font-bold text-foreground/80 bg-muted/50 px-2.5 py-0.5 rounded-md">
                            {getCompletionDuration(call)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {/* Password Dialog for Unlocking Layout */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Desbloquear Redimensionamento
            </DialogTitle>
            <DialogDescription>
              Apenas administradores podem alterar o layout da tela. Insira suas credenciais.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUnlockSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email do Administrador</label>
              <Input 
                type="email" 
                placeholder="admin@hospital.com" 
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                required
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-500 font-medium">{loginError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? "Verificando..." : "Desbloquear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatBadge({ 
  label, 
  value, 
  variant, 
  large 
}: { 
  label: string
  value: number
  variant?: "emergency" | "urgent" | "routine"
  large?: boolean
}) {
  const variantClasses = {
    emergency: "text-emergency",
    urgent: "text-urgent",
    routine: "text-routine",
  }
  
  return (
    <div className="flex items-center gap-4">
      <span className={cn(
        "font-black tabular-nums tracking-tight",
        large ? "text-3xl" : "text-xl",
        variant ? variantClasses[variant] : "text-foreground"
      )}>
        {value}
      </span>
      <span className={cn(
        "text-muted-foreground font-semibold uppercase tracking-wider",
        large ? "text-sm" : "text-xs"
      )}>
        {label}
      </span>
    </div>
  )
}

function CallCard({ 
  call, 
  now, 
  onSeen, 
  onAttend, 
  onComplete 
}: { 
  call: BedCall
  now: Date
  onSeen: (id: string) => void
  onAttend: (id: string) => void
  onComplete: (id: string) => void
}) {
  const Icon = CALL_ICONS[call.callType] || AlertTriangle
  const priorityConfig = PRIORITY_CONFIG[call.priority]
  
  // Calculate waiting time (from creation to now)
  const callDate = new Date(call.createdAt)
  let timeDiff = now.getTime() - callDate.getTime()

  // O fuso horário do banco de dados está vindo com uma diferença exata de 3 horas em relação ao Date.now() do navegador.
  // Vamos remover exatamente 3 horas (10800000 ms) do timeDiff para sincronizar.
  // Se o valor ficar negativo, significa que a hora do banco está certa, então não aplicamos.
  if (timeDiff > 10800000) {
    timeDiff -= 10800000
  }
  
  let waitingTime = Math.max(0, Math.floor(timeDiff / 1000))
  
  // Calculate attending time (from attending start to now)
  let attendingTime = 0
  if (call.status === "attending" && call.attendingAt) {
    const attendingDate = new Date(call.attendingAt)
    let attendingDiff = now.getTime() - attendingDate.getTime()
    
    // Mesma correção de fuso para o tempo de atendimento
    if (attendingDiff > 10800000) {
      attendingDiff -= 10800000
    }
    
    attendingTime = Math.max(0, Math.floor(attendingDiff / 1000))
  }

  // Se o status for "attending", mostramos o tempo de atendimento em vez do tempo de espera total
  const displayTime = call.status === "attending" ? attendingTime : waitingTime
  
  const hours = Math.floor(displayTime / 3600)
  const minutes = Math.floor((displayTime % 3600) / 60)
  const seconds = displayTime % 60

  const isLongWait = hours > 0 || minutes >= 5
  const isCritical = call.priority === "emergency"
  const isPending = call.status === "pending"
  
  // Cores dinâmicas para o tempo de espera (Apenas se ainda não foi atendido)
  let timerColorClass = "text-foreground bg-muted/50"
  
  if (call.status === "pending" || call.status === "seen") {
    if (hours > 0 || minutes >= 5) {
      timerColorClass = "text-red-600 bg-red-100 ring-2 ring-red-500/50 dark:text-red-400 dark:bg-red-950/50"
    } else if (minutes >= 2) {
      timerColorClass = "text-orange-600 bg-orange-100 ring-2 ring-orange-500/50 dark:text-orange-400 dark:bg-orange-950/50"
    } else if (isCritical) {
      timerColorClass = "text-red-600 bg-red-100 ring-2 ring-red-500/50 dark:text-red-400 dark:bg-red-950/50"
    }
  } else if (call.status === "attending") {
    timerColorClass = "text-success bg-success/10 ring-2 ring-success/50"
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-500 hover:shadow-lg flex flex-col h-full",
      "border-l-[6px]",
      call.priority === "emergency" && "border-l-emergency shadow-emergency/10",
      call.priority === "urgent" && "border-l-urgent",
      call.priority === "routine" && "border-l-routine",
      // Efeito piscando para chamados pendentes baseado na prioridade
      isPending && call.priority === "emergency" && "animate-blink-emergency bg-emergency/5",
      isPending && call.priority === "urgent" && "animate-blink-urgent bg-urgent/5",
      isPending && call.priority === "routine" && "animate-blink-routine bg-routine/5"
    )}>
      <CardContent className="p-0 flex flex-col h-full w-full justify-between overflow-hidden">
        {/* Top Section: Room & Timer */}
        <div className="flex items-start justify-between w-full shrink-0 bg-black/5 px-2 py-0 border-b border-border/50">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className={cn("p-1 rounded-md shrink-0 flex items-center justify-center", priorityConfig.className)}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-none truncate" title={call.room || call.patientName || 'Quarto'}>
              {call.room || call.patientName || 'Quarto'}
            </h3>
          </div>
          
          {/* Timer absolute top right */}
          <div className={cn(
            "flex flex-col items-center justify-center shrink-0 px-2 py-0.5 rounded shadow-inner transition-colors duration-500 min-w-[60px] my-0.5",
            timerColorClass
          )}>
            <div className="flex items-center gap-1 text-xs sm:text-sm font-mono font-bold">
              <Clock className="h-3 w-3 hidden sm:block" />
              <span>
                {hours > 0 ? `${hours}h ` : ''}{minutes > 0 || hours > 0 ? `${minutes}m ` : ''}{String(seconds).padStart(2, "0")}s
              </span>
            </div>
          </div>
        </div>

        {/* Middle Section: Details (Takes remaining space) */}
        <div className="flex flex-col justify-center flex-1 w-full min-h-0 overflow-hidden px-2 py-0 -my-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {call.bedNumber && call.bedNumber !== call.room && call.bedNumber !== call.patientName && (
              <span className="text-sm sm:text-base font-bold text-muted-foreground leading-none">Leito {call.bedNumber}</span>
            )}
            <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] px-1.5 py-0 font-bold h-4 sm:h-5 leading-none", priorityConfig.className)}>
              {priorityConfig.label}
            </Badge>
          </div>
          
          <p className="text-base sm:text-lg font-bold text-foreground opacity-90 leading-tight truncate">
            {getCallTypeLabel(call.callType)}
          </p>
          
          {call.ward && (
            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest truncate mt-0.5">
              {call.ward}
            </p>
          )}
        </div>

        {/* Bottom Section: Actions */}
        <div className="flex flex-col gap-1 w-full shrink-0 border-t border-border/60 bg-black/5 px-2 pt-1">
          {/* Status indicator */}
          <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground flex items-center justify-center gap-1.5 w-full">
            {call.status === "pending" && (
              <><div className="w-1.5 h-1.5 rounded-full bg-emergency animate-pulse" /> Aguardando</>
            )}
            {call.status === "seen" && (
              <><div className="w-1.5 h-1.5 rounded-full bg-urgent animate-pulse" /> Visualizado</>
            )}
            {call.status === "attending" && (
              <><div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Atendendo</>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-1.5 w-full pb-1">
            {call.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSeen(call.id)}
                  className="h-7 sm:h-8 flex-1 px-2 text-[10px] sm:text-[11px] font-bold border-2"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5 shrink-0 hidden sm:block" />
                  <span className="truncate">Visualizar</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAttend(call.id)}
                  className="h-7 sm:h-8 flex-1 px-2 text-[10px] sm:text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 shrink-0 hidden sm:block" />
                  <span className="truncate">Atender</span>
                </Button>
              </>
            )}
            {call.status === "seen" && (
              <Button
                size="sm"
                onClick={() => onAttend(call.id)}
                className="h-7 sm:h-8 w-full px-4 text-[10px] sm:text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Play className="h-3.5 w-3.5 mr-2 shrink-0" />
                Atender
              </Button>
            )}
            {call.status === "attending" && (
              <Button
                size="sm"
                onClick={() => onComplete(call.id)}
                className="h-7 sm:h-8 w-full px-4 text-[10px] sm:text-[11px] font-bold bg-success text-success-foreground hover:bg-success/90"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-2 shrink-0" />
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

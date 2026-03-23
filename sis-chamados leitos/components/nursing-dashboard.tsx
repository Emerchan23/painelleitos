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
  Maximize
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
    setHasNewCalls, soundSettings, playAlertSound, refreshSettings 
  } = useHospital()
  const [now, setNow] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
    
    const durationMin = Math.floor(durationMs / 60000)
    const durationSec = Math.floor((durationMs % 60000) / 1000)
    
    return `${durationMin}m ${durationSec}s`
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header - Compact for TV */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm w-full">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left Area: Title & Navigation */}
            <div className="flex items-center gap-4 w-auto shrink-0">
              <div className="bg-primary p-3 rounded-xl shadow-inner shrink-0">
                <HeartPulse className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="whitespace-nowrap hidden lg:block">
                <h1 className="text-3xl font-black text-foreground tracking-tight">Central de Enfermagem</h1>
                <p className="text-lg font-medium text-muted-foreground">Painel de Chamados</p>
              </div>
            </div>

            {/* Center Area: Custom Company Info (Logo + Name) */}
            <div className="flex items-center justify-center flex-1 mx-4 sm:mx-8">
              <div className="flex flex-row items-center justify-center text-center opacity-90 gap-4 bg-muted/20 px-6 py-2 rounded-2xl w-full max-w-3xl">
                {refreshSettings?.logo_url && (
                  <div className="relative h-16 shrink-0 flex items-center">
                    <img 
                      src={refreshSettings.logo_url} 
                      alt="Logo" 
                      className="h-full w-auto object-contain max-w-[200px]"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
                <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-widest uppercase text-slate-700 dark:text-slate-200 leading-tight">
                  {refreshSettings?.company_name || "HOSPITAL SYSTEM"}
                </span>
              </div>
            </div>

            {/* Right Area: Controls & Clock */}
            <div className="flex items-center justify-end gap-4 sm:gap-6 w-auto shrink-0">
              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleFullscreen}
                className="h-14 w-14 p-0 rounded-full bg-muted/50 hover:bg-muted shrink-0"
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                <Maximize className="h-7 w-7" />
              </Button>

              {/* Clock */}
              <div className="text-right border-l border-border pl-6 ml-2 shrink-0">
                <p className="text-4xl font-black text-foreground tabular-nums tracking-tighter">
                  {now.toLocaleTimeString("pt-BR", { 
                    timeZone: refreshSettings.timezone,
                    hour: "2-digit", 
                    minute: "2-digit", 
                    second: "2-digit" 
                  })}
                </p>
                <p className="text-base font-semibold text-muted-foreground uppercase tracking-wider mt-1">
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
        </div>
      </header>

      {/* Stats Bar - Large for TV visibility */}
      <div className="bg-card border-b border-border shadow-sm z-30 relative w-full">
        <div className="w-full px-4 py-6">
          <div className="flex items-center gap-10">
            <StatBadge label="Total Ativos" value={stats.total} large />
            <div className="h-10 w-px bg-border"></div>
            <StatBadge label="Críticos" value={stats.emergency} variant="emergency" large />
            <StatBadge label="Urgentes" value={stats.urgent} variant="urgent" large />
            <StatBadge label="Rotina" value={stats.routine} variant="routine" large />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-hidden flex flex-col min-h-0 bg-muted/30">
        <div className="flex flex-col xl:flex-row h-full min-h-0">
          {/* Active Calls List - Takes most space */}
          <div className="flex-1 flex flex-col h-full min-h-0 relative">
            <div className="px-6 py-4 bg-background border-b border-border shadow-sm z-10 shrink-0 absolute top-0 left-0 right-0 h-[73px]">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <Clock className="h-7 w-7 text-primary" />
                Chamados Ativos
              </h2>
            </div>
            
            <div className="absolute inset-0 top-[73px] bottom-0 overflow-y-auto p-6 scrollbar-hide pb-32">
              {activeCalls.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-24 text-center">
                    <CheckCircle2 className="h-20 w-20 text-success mx-auto mb-6" />
                    <p className="text-3xl font-bold text-foreground">Nenhum chamado pendente</p>
                    <p className="text-xl text-muted-foreground mt-3">Todos os pacientes foram atendidos</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
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
          </div>

          {/* Sidebar - Compact */}
          <div className="w-full xl:w-[380px] 2xl:w-[450px] bg-background border-t xl:border-t-0 xl:border-l border-border flex flex-col shrink-0 h-full min-h-0 relative">
            {/* Recent Completed */}
            <div className="flex flex-col h-full relative">
              <div className="py-4 px-6 bg-muted/10 border-b border-border shadow-sm shrink-0 absolute top-0 left-0 right-0 h-[61px] z-10">
                <h3 className="text-xl font-bold flex items-center gap-2.5 text-foreground/90">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                  Finalizados Recentes
                </h3>
              </div>
              <div className="absolute inset-0 top-[61px] bottom-0 overflow-y-auto p-0 scrollbar-hide pb-32">
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
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-success/70" />
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-foreground/90">
                              Leito {call.bedNumber}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground/80 mt-0.5">
                              {getCallTypeLabel(call.callType)}
                            </span>
                          </div>
                        </div>
                        
                        <div 
                          className="flex flex-col items-end"
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
            </div>
          </div>
        </div>
      </main>
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
        large ? "text-5xl" : "text-3xl",
        variant ? variantClasses[variant] : "text-foreground"
      )}>
        {value}
      </span>
      <span className={cn(
        "text-muted-foreground font-semibold uppercase tracking-wider",
        large ? "text-lg" : "text-sm"
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
  
  const minutes = Math.floor(displayTime / 60)
  const seconds = displayTime % 60

  const isLongWait = minutes >= 5
  const isCritical = call.priority === "emergency"
  const isPending = call.status === "pending"
  
  // Cores dinâmicas para o tempo de espera (Apenas se ainda não foi atendido)
  let timerColorClass = "text-foreground bg-muted/50"
  
  if (call.status === "pending" || call.status === "seen") {
    if (minutes >= 5) {
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
      "relative overflow-hidden transition-all duration-500 hover:shadow-lg flex flex-col h-[300px] min-h-[300px]",
      "border-l-[12px]",
      call.priority === "emergency" && "border-l-emergency shadow-emergency/10",
      call.priority === "urgent" && "border-l-urgent",
      call.priority === "routine" && "border-l-routine",
      // Efeito piscando para chamados pendentes baseado na prioridade
      isPending && call.priority === "emergency" && "animate-blink-emergency bg-emergency/5",
      isPending && call.priority === "urgent" && "animate-blink-urgent bg-urgent/5",
      isPending && call.priority === "routine" && "animate-blink-routine bg-routine/5"
    )}>
      <CardContent className="p-6 flex flex-col h-full flex-1">
        {/* Top Row: Room Info and Timer */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-3 rounded-2xl shrink-0", priorityConfig.className)}>
              <Icon className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0 flex items-center min-h-[3.5rem]">
              <h3 className="text-3xl sm:text-4xl lg:text-4xl font-black text-foreground tracking-tight leading-none break-words whitespace-normal line-clamp-2" title={call.room || call.patientName || 'Quarto'}>
                {call.room || call.patientName || 'Quarto'}
              </h3>
            </div>
          </div>
        </div>

        {/* Middle Row: Details */}
        <div className="flex items-end justify-between gap-3 mb-3 flex-1">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {call.bedNumber && call.bedNumber !== call.room && call.bedNumber !== call.patientName && (
                <span className="text-lg font-bold text-muted-foreground">Leito {call.bedNumber}</span>
              )}
              <Badge variant="outline" className={cn("text-xs px-2 py-0.5 font-bold", priorityConfig.className)}>
                {priorityConfig.label}
              </Badge>
            </div>
            
            <p className="text-lg font-bold text-foreground opacity-90 leading-tight truncate">{getCallTypeLabel(call.callType)}</p>
            {call.ward && (
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest break-words whitespace-normal line-clamp-1">{call.ward}</p>
            )}
          </div>
          
          {/* Timer on the right side */}
          <div className={cn(
            "flex flex-col items-center justify-center shrink-0 px-2 py-1.5 rounded-lg shadow-inner transition-colors duration-500 min-w-[90px]",
            timerColorClass
          )}>
            <div className="flex items-center gap-1 text-base font-mono font-bold">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {minutes > 0 ? `${minutes}m ` : ''}{String(seconds).padStart(2, "0")}s
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto"></div>

        {/* Bottom Row: Actions and Status */}
        <div className="flex flex-col gap-3 pt-4 border-t-2 border-border/60 mt-auto">
          {/* Status indicator */}
          <div className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 shrink-0">
            {call.status === "pending" && (
              <><div className="w-2.5 h-2.5 rounded-full bg-emergency animate-pulse" /> Aguardando</>
            )}
            {call.status === "seen" && (
              <><div className="w-2.5 h-2.5 rounded-full bg-urgent animate-pulse" /> Visualizado</>
            )}
            {call.status === "attending" && (
              <><div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" /> Atendendo</>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full">
            {call.status === "pending" && (
              <>
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => onSeen(call.id)}
                  className="h-11 flex-1 px-2 text-sm font-bold border-2"
                >
                  <Eye className="h-4 w-4 mr-1.5 shrink-0" />
                  <span className="truncate">Visualizar</span>
                </Button>
                <Button
                  size="default"
                  onClick={() => onAttend(call.id)}
                  className="h-11 flex-1 px-2 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Play className="h-4 w-4 mr-1.5 shrink-0" />
                  <span className="truncate">Atender</span>
                </Button>
              </>
            )}
            {call.status === "seen" && (
              <Button
                size="default"
                onClick={() => onAttend(call.id)}
                className="h-11 w-full px-6 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Play className="h-4 w-4 mr-2 shrink-0" />
                Atender
              </Button>
            )}
            {call.status === "attending" && (
              <Button
                size="default"
                onClick={() => onComplete(call.id)}
                className="h-11 w-full px-6 text-sm font-bold bg-success text-success-foreground hover:bg-success/90"
              >
                <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

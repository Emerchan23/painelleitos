"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useHospital, Bed, WardType, Ward, getCallTypeLabel } from "@/lib/hospital-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { 
  BedDouble, 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  Clock,
  BarChart3,
  Link2,
  LogOut,
  Users,
  Volume2,
  Settings,
  LayoutGrid,
  History,
  Calendar,
  Filter,
  User,
  CheckCircle2,
  AlertCircle,
  Ban,
  Wrench,
  Download,
  Copy,
  DoorOpen,
  QrCode,
  Bed as BedIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { UserManagement } from "./user-management"
import { SoundSettings } from "./sound-settings"
import { RefreshSettings } from "./refresh-settings"
import { DeviceSettings } from "./device-settings"
import { BackupSettings } from "./backup-settings"
import { format, isToday, isThisWeek, isThisMonth, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toPng } from "html-to-image"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { useToast } from "@/components/ui/use-toast"
import { QRCodeSVG } from "qrcode.react"

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}min`
}

export function AdminDashboard() {
  const { beds, addBed, updateBed, deleteBed, wards, addWard, updateWard, deleteWard, getSLAByWard, logout, currentUser, calls, refreshSettings } = useHospital()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBed, setEditingBed] = useState<Bed | null>(null)
  const [deleteConfirmBed, setDeleteConfirmBed] = useState<Bed | null>(null)
  
  const [isWardDialogOpen, setIsWardDialogOpen] = useState(false)
  const [editingWard, setEditingWard] = useState<Ward | null>(null)
  const [deleteConfirmWard, setDeleteConfirmWard] = useState<Ward | null>(null)
  
  const [historyFilter, setHistoryFilter] = useState<"today" | "week" | "month" | "all">("today")
  const [qrCodeData, setQrCodeData] = useState<{ token: string, label: string } | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    number: "",
    ward: wards.length > 0 ? wards[0].name : "",
    room: "",
  })

  // Ward Form state
  const [wardFormData, setWardFormData] = useState({
    name: "",
    description: "",
  })

  // SLA Stats from server
  const [slaStats, setSlaStats] = useState<Record<string, { avgTime: number; count: number }>>({})
  const chartRef = useRef<HTMLDivElement>(null)

  const chartData = useMemo(() => {
    return wards.map(ward => {
      const wardData = slaStats[ward.name] || { avgTime: 0, count: 0 }
      return {
        name: ward.name,
        avgTimeMinutes: Number((wardData.avgTime / 60000).toFixed(2)),
        count: wardData.count,
      }
    })
  }, [wards, slaStats])

  useEffect(() => {
    const fetchSLA = async () => {
      try {
        const response = await fetch('/api/stats/sla')
        const data = await response.json()
        if (data.success && data.data?.stats) {
          const statsMap: Record<string, { avgTime: number; count: number }> = {}
          data.data.stats.forEach((s: any) => {
            statsMap[s.ward] = {
              avgTime: s.avgResponseSeconds,
              count: s.totalCalls
            }
          })
          setSlaStats(statsMap)
        }
      } catch (error) {
        console.error("Failed to fetch SLA stats", error)
      }
    }

    fetchSLA()
    // Poll every minute
    const interval = setInterval(fetchSLA, 60000)
    return () => clearInterval(interval)
  }, [])

  const bedsByWard = useMemo(() => {
    const grouped: Record<WardType, Bed[]> = {}
    wards.forEach(w => {
      grouped[w.name] = []
    })
    beds.forEach((bed) => {
      if (!grouped[bed.ward]) {
        grouped[bed.ward] = []
      }
      grouped[bed.ward].push(bed)
    })
    return grouped
  }, [beds, wards])

  const stats = useMemo(() => {
    const total = beds.length
    return { total }
  }, [beds])

  const filteredHistory = useMemo(() => {
    // Apenas chamados concluídos ou todos? Geralmente histórico foca em todos ou concluídos.
    // Vamos mostrar todos ordenados por data mais recente.
    const sortedCalls = [...calls].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    return sortedCalls.filter(call => {
      if (historyFilter === "today") return isToday(call.createdAt)
      if (historyFilter === "week") return isThisWeek(call.createdAt, { weekStartsOn: 1 })
      if (historyFilter === "month") return isThisMonth(call.createdAt)
      return true
    })
  }, [calls, historyFilter])

  const handleOpenDialog = (bed?: Bed) => {
    if (bed) {
      setEditingBed(bed)
      setFormData({
        number: bed.number,
        ward: bed.ward,
        room: bed.room,
      })
    } else {
      setEditingBed(null)
      setFormData({
        number: "",
        ward: wards.length > 0 ? wards[0].name : "",
        room: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleOpenWardDialog = (ward?: Ward) => {
    if (ward) {
      setEditingWard(ward)
      setWardFormData({
        name: ward.name,
        description: ward.description || "",
      })
    } else {
      setEditingWard(null)
      setWardFormData({
        name: "",
        description: "",
      })
    }
    setIsWardDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingBed) {
      updateBed(editingBed.id, {
        number: formData.number,
        ward: formData.ward,
        room: formData.room,
      })
    } else {
      // Permitir que o número do leito seja vazio
      addBed({
        number: formData.number,
        ward: formData.ward,
        room: formData.room,
        status: "available",
      })
    }
    setIsDialogOpen(false)
    setEditingBed(null)
  }

  const handleWardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingWard) {
      updateWard(editingWard.id, wardFormData.name, wardFormData.description)
    } else {
      addWard(wardFormData.name, wardFormData.description)
    }
    setIsWardDialogOpen(false)
    setEditingWard(null)
  }

  const handleDelete = () => {
    if (deleteConfirmBed) {
      deleteBed(deleteConfirmBed.id)
      setDeleteConfirmBed(null)
    }
  }

  const handleWardDelete = () => {
    if (deleteConfirmWard) {
      deleteWard(deleteConfirmWard.id)
      setDeleteConfirmWard(null)
    }
  }

  const getBedLink = (bed: Bed) => {
    return `/leito/${bed.id}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      })
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      })
    }
  }

  const exportSlaToPDF = async () => {
    const doc = new jsPDF()
    
    // Título
    doc.setFontSize(18)
    doc.text("Relatório de SLA por Ala", 14, 22)
    
    // Data de geração
    doc.setFontSize(10)
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 30)
    
    // Tabela
    const tableData = wards.map(ward => {
      const wardData = slaStats[ward.name] || { avgTime: 0, count: 0 }
      let status = "Excelente"
      if (wardData.avgTime > 600000) status = "Crítico"
      else if (wardData.avgTime > 300000) status = "Atenção"
      
      return [
        ward.name,
        wardData.count.toString(),
        wardData.count > 0 ? formatTime(wardData.avgTime) : "-",
        wardData.count > 0 ? status : "-"
      ]
    })

    autoTable(doc, {
      startY: 40,
      head: [['Ala', 'Total de Chamados', 'Tempo Médio', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    })

    // Adicionar Gráfico se existir
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' })
        const finalY = (doc as any).lastAutoTable.finalY || 40
        
        // Ajustar dimensões da imagem para caber na página
        const width = chartRef.current.offsetWidth
        const height = chartRef.current.offsetHeight
        const imgWidth = 180
        const imgHeight = (height * imgWidth) / width
        
        // Se a imagem não couber na página atual, adicionar nova página
        if (finalY + imgHeight + 20 > doc.internal.pageSize.getHeight()) {
          doc.addPage()
          doc.text("Gráfico de SLA", 14, 20)
          doc.addImage(dataUrl, "PNG", 14, 30, imgWidth, imgHeight)
        } else {
          doc.text("Gráfico de SLA", 14, finalY + 15)
          doc.addImage(dataUrl, "PNG", 14, finalY + 25, imgWidth, imgHeight)
        }
      } catch (err) {
        console.error("Erro ao gerar imagem do gráfico", err)
      }
    }

    doc.save(`relatorio-sla-${format(new Date(), "dd-MM-yyyy")}.pdf`)
    
    toast({
      title: "Sucesso",
      description: "Relatório PDF gerado com sucesso.",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-3 rounded-xl shadow-inner shrink-0">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">Painel Administrativo</h1>
                <p className="text-sm font-medium text-muted-foreground">Gestão de Leitos</p>
              </div>
            </div>
            
            {/* Center Area: Custom Company Info (Logo + Name) */}
            <div className="hidden md:flex items-center justify-center flex-1 mx-4">
              <div className="flex flex-row items-center justify-center text-center opacity-80 gap-3">
                {refreshSettings?.logo_url ? (
                  <img src={refreshSettings.logo_url} alt="Logo" className="h-10 object-contain" />
                ) : null}
                <span className="text-lg font-bold tracking-widest uppercase text-muted-foreground">
                  {refreshSettings?.company_name || "HOSPITAL SYSTEM"}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {currentUser && (
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                  Olá, {currentUser.name}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={logout} className="rounded-xl">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 max-w-4xl">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="beds">Gestão de Locais</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="sla">Relatório SLA</TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="sounds" className="flex items-center gap-1">
              <Volume2 className="h-4 w-4" />
              Sons
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Config
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <BedDouble className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total de Leitos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {wards.slice(0, 2).map((ward) => (
                <Card key={ward.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-lg">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{bedsByWard[ward.name]?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">{ward.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Heat Map */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Mapa de Chamados por Ala</CardTitle>
                    <CardDescription>Monitoramento em tempo real dos chamados ativos por leito</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span>Emergência</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span>Urgente</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <span>Rotina</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      <span>Sem chamados</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {wards.map((ward) => {
                    const wardBeds = bedsByWard[ward.name] || []
                    
                    return (
                      <div key={ward.id} className="space-y-3">
                        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                          <div className="p-1.5 bg-primary/10 rounded-md">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-semibold text-foreground text-sm">{ward.name}</span>
                          <Badge variant="secondary" className="text-xs h-5 px-2 font-normal">
                            {wardBeds.length} leitos
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                          {wardBeds.length === 0 ? (
                            <div className="col-span-full py-6 flex flex-col items-center justify-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
                              <BedDouble className="h-8 w-8 mb-2 opacity-20" />
                              <p className="text-sm">Nenhum leito cadastrado nesta ala</p>
                            </div>
                          ) : (
                            wardBeds.map((bed) => {
                              const bedCalls = calls.filter(c => c.bedNumber === bed.number && c.status !== "completed");
                              let highestPriority = null;
                              if (bedCalls.length > 0) {
                                if (bedCalls.some(c => c.priority === "emergency")) highestPriority = "emergency";
                                else if (bedCalls.some(c => c.priority === "urgent")) highestPriority = "urgent";
                                else highestPriority = "routine";
                              }

                              let config = {
                                style: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300",
                                icon: BedDouble,
                                label: "Sem chamados",
                                colorClass: "text-slate-600"
                              };
                              
                              if (highestPriority === "emergency") {
                                config = {
                                  style: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300",
                                  icon: AlertCircle,
                                  label: "Emergência",
                                  colorClass: "text-red-600"
                                };
                              } else if (highestPriority === "urgent") {
                                config = {
                                  style: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300",
                                  icon: AlertTriangle,
                                  label: "Urgente",
                                  colorClass: "text-orange-600"
                                };
                              } else if (highestPriority === "routine") {
                                config = {
                                  style: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300",
                                  icon: Clock,
                                  label: "Rotina",
                                  colorClass: "text-yellow-600"
                                };
                              }

                              const StatusIcon = config.icon

                              return (
                                <TooltipProvider key={bed.id}>
                                  <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          "relative group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md",
                                          config.style
                                        )}
                                        onClick={() => handleOpenDialog(bed)}
                                      >
                                        <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                          <StatusIcon className="h-3 w-3" />
                                        </div>
                                        <span className="text-lg font-bold tracking-tight">{bed.number}</span>
                                        <span className="text-[10px] uppercase font-medium opacity-70 mt-0.5">
                                          Quarto {bed.room}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="p-3 max-w-[200px]">
                                      <div className="space-y-1">
                                        <p className="font-semibold text-sm">Leito {bed.number}</p>
                                        <div className="text-xs space-y-1 text-muted-foreground">
                                          <p>Quarto: <span className="text-foreground">{bed.room}</span></p>
                                          <p>Status: <span className={cn("font-medium", config.colorClass)}>{config.label}</span></p>
                                          {bedCalls.length > 0 && (
                                            <p className="pt-1 border-t border-border mt-1">
                                              Chamados ativos: <span className="font-bold text-foreground">{bedCalls.length}</span>
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locais Tab */}
          <TabsContent value="beds">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-lg border shadow-sm">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Gestão de Locais e Leitos
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Organize a estrutura do hospital em Alas, Quartos e Leitos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleOpenWardDialog()} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Ala
                  </Button>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Leito
                  </Button>
                </div>
              </div>

              {wards.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-card shadow-sm">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-medium">Nenhuma ala cadastrada</h3>
                  <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                    Comece criando uma ala (ex: UTI, Enfermaria, Pediatria) para depois adicionar os quartos e leitos.
                  </p>
                  <Button onClick={() => handleOpenWardDialog()}>Criar Primeira Ala</Button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {wards.map((ward) => {
                    // Encontra leitos desta ala
                    const wardBeds = beds.filter(b => b.ward === ward.name);
                    
                    // Agrupa leitos por quarto
                    const roomsMap = new Map<string, typeof beds>();
                    wardBeds.forEach(bed => {
                      if (!roomsMap.has(bed.room)) roomsMap.set(bed.room, []);
                      roomsMap.get(bed.room)!.push(bed);
                    });
                    const rooms = Array.from(roomsMap.entries()).map(([name, beds]) => ({ name, beds }))
                      .sort((a, b) => a.name.localeCompare(b.name));

                    return (
                      <Card key={ward.id} className="overflow-hidden border-muted-foreground/20">
                        <div className="bg-muted/30 px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{ward.name}</h3>
                              {ward.description && <p className="text-sm text-muted-foreground">{ward.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="mr-2">
                              {rooms.length} {rooms.length === 1 ? 'Quarto' : 'Quartos'} • {wardBeds.length} {wardBeds.length === 1 ? 'Leito' : 'Leitos'}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mr-2 h-8 text-xs gap-1.5"
                              onClick={() => window.open(`/print/ward?ward=${encodeURIComponent(ward.name)}`, '_blank')}
                              title="Imprimir todos os QR Codes desta ala"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              Imprimir QR Codes
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenWardDialog(ward)} title="Editar Ala">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90" onClick={() => setDeleteConfirmWard(ward)} title="Excluir Ala">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <CardContent className="p-6">
                          {rooms.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground text-sm">Nenhum quarto/leito cadastrado nesta ala.</p>
                              <Button variant="link" size="sm" className="mt-2 text-primary" onClick={() => handleOpenDialog()}>
                                Adicionar Leito
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {rooms.map(room => (
                                <div key={room.name} className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
                                  <div className="bg-muted/20 px-4 py-3 border-b flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Quarto {room.name}</h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={async () => {
                                        try {
                                          const ward = room.beds[0].ward;
                                          const roomName = room.name;
                                          const res = await fetch(`/api/rooms/token?ward=${encodeURIComponent(ward)}&room=${encodeURIComponent(roomName)}`);
                                          const data = await res.json();
                                          if (data.success && data.data?.token) {
                                            setQrCodeData({ token: data.data.token, label: `Quarto ${roomName} - ${ward}` });
                                          } else {
                                            toast({ title: "Erro", description: "Não foi possível gerar o token do quarto.", variant: "destructive" });
                                          }
                                        } catch (error) {
                                          toast({ title: "Erro", description: "Erro ao comunicar com o servidor.", variant: "destructive" });
                                        }
                                      }}
                                      title="Gerar QR Code do Quarto"
                                    >
                                      <QrCode className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs px-2"
                                      onClick={async () => {
                                        try {
                                          const ward = room.beds[0].ward;
                                          const roomName = room.name;
                                          const res = await fetch(`/api/rooms/token?ward=${encodeURIComponent(ward)}&room=${encodeURIComponent(roomName)}`);
                                          const data = await res.json();
                                          if (data.success && data.data?.token) {
                                            navigator.clipboard.writeText(data.data.token);
                                            toast({ title: "Token do Quarto copiado!", description: "Cole este token no tablet do quarto." });
                                          } else {
                                            toast({ title: "Erro", description: "Não foi possível gerar o token do quarto.", variant: "destructive" });
                                          }
                                        } catch (error) {
                                          toast({ title: "Erro", description: "Erro ao comunicar com o servidor.", variant: "destructive" });
                                        }
                                      }}
                                      title="Copiar Token para usar em Tablet do Quarto (Múltiplos leitos)"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Token do Quarto
                                    </Button>
                                    <Badge variant="outline" className="text-xs bg-background">
                                      {room.beds.length} {room.beds.length === 1 ? 'leito' : 'leitos'}
                                    </Badge>
                                  </div>
                                </div>
                                  <div className="p-3 space-y-2 flex-1 bg-muted/5">
                                    {room.beds.sort((a,b) => a.number.localeCompare(b.number)).map(bed => (
                                      <div key={bed.id} className={cn(
                                        "flex items-center justify-between border p-3 rounded-lg group transition-colors shadow-sm",
                                        bed.showInRoom 
                                          ? "bg-green-50 border-green-200 hover:border-green-300 dark:bg-green-950/20 dark:border-green-900/30" 
                                          : "bg-red-50 border-red-200 hover:border-red-300 dark:bg-red-950/20 dark:border-red-900/30"
                                      )}>
                                        <div className="flex items-center gap-3">
                                          <div className={cn(
                                            "p-1.5 rounded-md",
                                            bed.showInRoom 
                                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" 
                                              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 opacity-80"
                                          )}>
                                            <BedIcon className="h-4 w-4" />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className={cn("font-medium text-sm", !bed.showInRoom && "line-through text-muted-foreground")}>Leito {bed.number}</span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground" title="Token do Tablet">
                                                {bed.id.substring(0, 8)}...
                                              </code>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className={cn("h-7 w-7", bed.showInRoom ? "text-primary" : "text-destructive")}
                                                  onClick={async () => {
                                                    try {
                                                      const newStatus = !bed.showInRoom;
                                                      const res = await fetch(`/api/beds/${bed.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ showInRoom: newStatus })
                                                      });
                                                      if (res.ok) {
                                                        const updatedBed = await res.json();
                                                        if (updatedBed.success) {
                                                          toast({ title: "Sucesso", description: newStatus ? "Leito ativado no tablet do quarto." : "Leito desativado no tablet do quarto." });
                                                          // Em vez de forçar o recarregamento total da página (que muda a aba),
                                                          // disparamos o evento e também recarregamos suavemente usando a função existente de beds (que você precisaria expor no contexto)
                                                          // Como não podemos modificar o contexto livremente sem afetar outros lugares,
                                                          // vamos fazer um soft refresh que mantém as abas
                                                          const fetchBedsDirect = async () => {
                                                             const response = await fetch('/api/beds');
                                                             if(response.ok) {
                                                                // Simula um evento de state change que o componente reage se possível
                                                                // Uma abordagem melhor sem reload é chamar updateBed(bed.id, {showInRoom: newStatus})
                                                                updateBed(bed.id, { showInRoom: newStatus });
                                                             }
                                                          };
                                                          fetchBedsDirect();
                                                        }
                                                      } else {
                                                        toast({ title: "Erro", description: "Falha ao atualizar o status.", variant: "destructive" });
                                                      }
                                                    } catch (e) {
                                                      toast({ title: "Erro", description: "Falha ao comunicar com servidor.", variant: "destructive" });
                                                    }
                                                  }}
                                                >
                                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                <p>{bed.showInRoom ? "Desativar no tablet do quarto" : "Ativar no tablet do quarto"}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setQrCodeData({ token: bed.id, label: `Leito ${bed.number} - Quarto ${bed.room}` })}
                                            title="Gerar QR Code"
                                          >
                                            <QrCode className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => {
                                              navigator.clipboard.writeText(bed.id);
                                              toast({ title: "Token copiado!", description: "Cole este token no aplicativo do tablet." });
                                            }}
                                            title="Copiar Token"
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleOpenDialog(bed)} title="Editar Leito">
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => setDeleteConfirmBed(bed)} title="Excluir Leito">
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}

                  {/* Render orphan beds if any */}
                  {(() => {
                    const allWardNames = new Set(wards.map(w => w.name));
                    const orphanBeds = beds.filter(b => !allWardNames.has(b.ward));
                    if (orphanBeds.length === 0) return null;

                    // Agrupa leitos órfãos por quarto
                    const roomsMap = new Map<string, typeof beds>();
                    orphanBeds.forEach(bed => {
                      if (!roomsMap.has(bed.room)) roomsMap.set(bed.room, []);
                      roomsMap.get(bed.room)!.push(bed);
                    });
                    const rooms = Array.from(roomsMap.entries()).map(([name, beds]) => ({ name, beds }))
                      .sort((a, b) => a.name.localeCompare(b.name));

                    return (
                      <Card className="overflow-hidden border-destructive/20">
                        <div className="bg-destructive/10 px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-destructive/20 rounded-lg text-destructive">
                              <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-destructive">Alas Não Encontradas</h3>
                              <p className="text-sm text-muted-foreground">Leitos associados a alas que foram excluídas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="mr-2">
                              {rooms.length} {rooms.length === 1 ? 'Quarto' : 'Quartos'} • {orphanBeds.length} {orphanBeds.length === 1 ? 'Leito' : 'Leitos'}
                            </Badge>
                          </div>
                        </div>
                        
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rooms.map(room => (
                              <div key={room.name} className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
                                <div className="bg-muted/20 px-4 py-3 border-b flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Quarto {room.name} <span className="text-xs text-muted-foreground font-normal">(Ala: {room.beds[0].ward})</span></h4>
                                  </div>
                                  <Badge variant="outline" className="text-xs bg-background">
                                    {room.beds.length} {room.beds.length === 1 ? 'leito' : 'leitos'}
                                  </Badge>
                                </div>
                                <div className="p-3 space-y-2 flex-1 bg-muted/5">
                                  {room.beds.sort((a,b) => a.number.localeCompare(b.number)).map(bed => (
                                    <div key={bed.id} className={cn(
                                      "flex items-center justify-between border p-3 rounded-lg group transition-colors shadow-sm",
                                      bed.showInRoom 
                                        ? "bg-green-50 border-green-200 hover:border-green-300 dark:bg-green-950/20 dark:border-green-900/30" 
                                        : "bg-red-50 border-red-200 hover:border-red-300 dark:bg-red-950/20 dark:border-red-900/30"
                                    )}>
                                        <div className="flex items-center gap-3">
                                          <div className={cn(
                                            "p-1.5 rounded-md",
                                            bed.showInRoom 
                                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" 
                                              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 opacity-80"
                                          )}>
                                            <BedIcon className="h-4 w-4" />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className={cn("font-medium text-sm", !bed.showInRoom && "line-through text-muted-foreground")}>Leito {bed.number}</span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground" title="Token do Tablet">
                                                {bed.id.substring(0, 8)}...
                                              </code>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className={cn("h-7 w-7", bed.showInRoom ? "text-primary" : "text-destructive")}
                                                  onClick={async () => {
                                                    try {
                                                      const newStatus = !bed.showInRoom;
                                                      const res = await fetch(`/api/beds/${bed.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ showInRoom: newStatus })
                                                      });
                                                      if (res.ok) {
                                                        const updatedBed = await res.json();
                                                        if (updatedBed.success) {
                                                          toast({ title: "Sucesso", description: newStatus ? "Leito ativado no tablet do quarto." : "Leito desativado no tablet do quarto." });
                                                          updateBed(bed.id, { showInRoom: newStatus });
                                                        }
                                                      } else {
                                                        toast({ title: "Erro", description: "Falha ao atualizar o status.", variant: "destructive" });
                                                      }
                                                    } catch (e) {
                                                      toast({ title: "Erro", description: "Falha ao comunicar com servidor.", variant: "destructive" });
                                                    }
                                                  }}
                                                >
                                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                <p>{bed.showInRoom ? "Desativar no tablet do quarto" : "Ativar no tablet do quarto"}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setQrCodeData({ token: bed.id, label: `Leito ${bed.number} - Quarto ${bed.room}` })}
                                            title="Gerar QR Code"
                                          >
                                            <QrCode className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                          onClick={() => {
                                            navigator.clipboard.writeText(bed.id);
                                            toast({ title: "Token copiado!", description: "Cole este token no aplicativo do tablet." });
                                          }}
                                          title="Copiar Token"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleOpenDialog(bed)} title="Editar Leito">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => setDeleteConfirmBed(bed)} title="Excluir Leito">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              )}
            </div>
          </TabsContent>


          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <History className="h-5 w-5" />
                      Histórico de Chamados
                    </CardTitle>
                    <CardDescription>
                      Acompanhe todas as interações e tempos de atendimento
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={historyFilter} onValueChange={(v: any) => setHistoryFilter(v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Esta Semana</SelectItem>
                        <SelectItem value="month">Este Mês</SelectItem>
                        <SelectItem value="all">Todo o Período</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Leito</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tempo de Resposta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum registro encontrado para este período
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHistory.map((call) => {
                          const responseTime = call.completedAt 
                            ? call.completedAt.getTime() - call.createdAt.getTime() 
                            : null;
                            
                          return (
                            <TableRow key={call.id}>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-medium">{format(call.createdAt, "dd/MM/yyyy", { locale: ptBR })}</span>
                                  <span className="text-xs text-muted-foreground">{format(call.createdAt, "HH:mm:ss")}</span>
                                </div>
                              </TableCell>
                              <TableCell>{call.ward || "-"}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{call.bedNumber}</span>
                                  <span className="text-xs text-muted-foreground">{call.patientName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(
                                  call.priority === 'emergency' && "border-emergency text-emergency",
                                  call.priority === 'urgent' && "border-urgent text-urgent",
                                  call.priority === 'routine' && "border-routine text-routine"
                                )}>
                                  {getCallTypeLabel(call.callType)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {call.status === "completed" ? (
                                  <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">Concluído</Badge>
                                ) : call.status === "attending" ? (
                                  <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0">Em Atendimento</Badge>
                                ) : (
                                  <Badge variant="secondary">Pendente/Visto</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {responseTime ? (
                                  <span className={cn(
                                    "font-medium",
                                    responseTime > 600000 ? "text-emergency" : // > 10 min
                                    responseTime > 300000 ? "text-urgent" : // > 5 min
                                    "text-success"
                                  )}>
                                    {formatTime(responseTime)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SLA Tab */}
          <TabsContent value="sla">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-5 w-5" />
                      Relatório de SLA por Ala
                    </CardTitle>
                    <CardDescription>
                      Tempo médio de atendimento dos chamados por ala hospitalar
                    </CardDescription>
                  </div>
                  <Button onClick={exportSlaToPDF} variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-8 bg-card p-2" ref={chartRef}>
                  <div className="space-y-6">
                    {wards.map((ward) => {
                      const wardData = slaStats[ward.name] || { avgTime: 0, count: 0 }
                      const maxTime = Math.max(...Object.values(slaStats).map((s) => s.avgTime), 1)
                      const percentage = maxTime > 0 ? (wardData.avgTime / maxTime) * 100 : 0
                      
                      return (
                        <div key={ward.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">{ward.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="text-xs">
                                {wardData.count} chamados
                              </Badge>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                  {wardData.count > 0 ? formatTime(wardData.avgTime) : "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                wardData.avgTime > 600000 ? "bg-emergency" :
                                wardData.avgTime > 300000 ? "bg-urgent" : "bg-success"
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Gráfico de SLA */}
                  {chartData.length > 0 && (
                    <div className="h-[350px] w-full mt-8 border rounded-lg p-4 bg-background">
                      <h3 className="text-sm font-medium mb-4 text-center text-muted-foreground">Comparativo de SLA e Volume por Ala</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis 
                            yAxisId="left" 
                            orientation="left" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                            dx={-10}
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                            dx={10}
                          />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            formatter={(value: number, name: string) => {
                              if (name === "Tempo Médio (min)") return [`${value} min`, name];
                              return [value, name];
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar yAxisId="left" dataKey="avgTimeMinutes" name="Tempo Médio (min)" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            {chartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  entry.avgTimeMinutes > 10 ? '#ef4444' :
                                  entry.avgTimeMinutes > 5 ? '#f59e0b' : '#22c55e'
                                } 
                              />
                            ))}
                          </Bar>
                          <Bar yAxisId="right" dataKey="count" name="Total de Chamados" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* SLA Legend */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-success" />
                      <span className="text-sm text-muted-foreground">{"< 5 min (Excelente)"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-urgent" />
                      <span className="text-sm text-muted-foreground">5-10 min (Atenção)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emergency" />
                      <span className="text-sm text-muted-foreground">{"> 10 min (Crítico)"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* Sounds Tab */}
          <TabsContent value="sounds">
            <SoundSettings />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <DeviceSettings />
            <RefreshSettings />
            <BackupSettings />
          </TabsContent>
        </Tabs>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <BedIcon className="h-5 w-5 text-primary" />
              {editingBed ? "Editar Leito" : "Novo Leito"}
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
              {editingBed ? "Atualize as informações do leito existente." : "Preencha os dados abaixo para cadastrar um novo leito no sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="mt-2">
            <FieldGroup className="gap-6">
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <Field>
                  <FieldLabel className="text-sm font-semibold">Ala / Setor</FieldLabel>
                  <FieldDescription>Selecione a ala à qual este leito pertence.</FieldDescription>
                  <Select
                    value={formData.ward}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, ward: value as WardType }))}
                  >
                    <SelectTrigger className="mt-2 bg-background">
                      <SelectValue placeholder="Selecione uma ala" />
                    </SelectTrigger>
                    <SelectContent>
                      {wards.map((ward) => (
                        <SelectItem key={ward.id} value={ward.name}>
                          {ward.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field>
                  <FieldLabel className="text-sm font-semibold">Quarto</FieldLabel>
                  <FieldDescription>Identificação do quarto.</FieldDescription>
                  <Input
                    value={formData.room}
                    onChange={(e) => setFormData((prev) => ({ ...prev, room: e.target.value }))}
                    placeholder="Ex: 201 ou A"
                    required
                    className="mt-2"
                  />
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold">
                    Número do Leito <span className="text-muted-foreground font-normal ml-1">(Opcional)</span>
                  </FieldLabel>
                  <FieldDescription>Identificação específica.</FieldDescription>
                  <Input
                    value={formData.number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, number: e.target.value }))}
                    placeholder="Ex: 1, A, ou 201-A"
                    className="mt-2"
                  />
                </Field>
              </div>
            </FieldGroup>
            
            <DialogFooter className="mt-8 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {editingBed ? "Salvar Alterações" : "Cadastrar Leito"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Ward Dialog */}
      <Dialog open={isWardDialogOpen} onOpenChange={setIsWardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingWard ? "Editar Ala" : "Nova Ala"}
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
              {editingWard ? "Atualize as informações da ala." : "Preencha os dados para cadastrar uma nova ala ou setor no hospital."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleWardSubmit} className="mt-2">
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel className="text-sm font-semibold">Nome da Ala/Setor</FieldLabel>
                <FieldDescription>Identifique a área principal (ex: UTI, Enfermaria).</FieldDescription>
                <Input
                  value={wardFormData.name}
                  onChange={(e) => setWardFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: UTI Neonatal"
                  required
                  className="mt-2"
                />
              </Field>
              
              <Field>
                <FieldLabel className="text-sm font-semibold">
                  Descrição <span className="text-muted-foreground font-normal ml-1">(Opcional)</span>
                </FieldLabel>
                <FieldDescription>Detalhes adicionais sobre esta ala.</FieldDescription>
                <Input
                  value={wardFormData.description}
                  onChange={(e) => setWardFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Unidade de Terapia Intensiva para recém-nascidos"
                  className="mt-2"
                />
              </Field>
            </FieldGroup>
            
            <DialogFooter className="mt-8 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsWardDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {editingWard ? "Salvar Alterações" : "Cadastrar Ala"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmBed} onOpenChange={() => setDeleteConfirmBed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o leito {deleteConfirmBed?.number}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmBed(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog (Ward) */}
      <Dialog open={!!deleteConfirmWard} onOpenChange={() => setDeleteConfirmWard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a ala {deleteConfirmWard?.name}? Esta ação não pode ser desfeita e pode afetar os leitos associados a ela.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmWard(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleWardDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrCodeData} onOpenChange={() => setQrCodeData(null)}>
        <DialogContent className="sm:max-w-md flex flex-col items-center text-center">
          <DialogHeader className="w-full">
            <DialogTitle className="text-center text-xl">{qrCodeData?.label}</DialogTitle>
            <DialogDescription className="text-center">
              Escaneie este QR Code com o aplicativo para conectar automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white p-6 rounded-xl border shadow-sm my-4 flex flex-col items-center justify-center">
            {qrCodeData?.token && (
              <QRCodeSVG 
                value={qrCodeData.token} 
                size={220} 
                level="M"
                includeMargin={false}
              />
            )}
            <div className="mt-6 text-sm text-muted-foreground break-all bg-muted p-2 rounded-md w-full font-mono">
              {qrCodeData?.token}
            </div>
          </div>
          
          <DialogFooter className="sm:justify-center w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (qrCodeData?.token) {
                  navigator.clipboard.writeText(qrCodeData.token);
                  toast({ title: "Token copiado!", description: "Cole este token no aplicativo." });
                }
              }}
              className="w-full sm:w-auto"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar Token
            </Button>
            <Button 
              type="button" 
              onClick={() => setQrCodeData(null)}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

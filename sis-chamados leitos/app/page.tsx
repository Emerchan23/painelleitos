"use client"

import { useState, useEffect } from "react"
import { HospitalProvider, useHospital, type Bed } from "@/lib/hospital-context"
import { NursingDashboard } from "@/components/nursing-dashboard"
import { AdminDashboard } from "@/components/admin-dashboard"
import { LoginForm } from "@/components/login-form"
import { LayoutDashboard, HeartPulse, ChevronRight, Settings, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = "menu" | "nursing" | "admin" | "login"

function HospitalApp() {
  const { isAuthenticated, logout } = useHospital()
  const [viewMode, setViewMode] = useState<ViewMode>("menu")
  const [isInitializing, setIsInitializing] = useState(true)

  // Restaurar a tela anterior ao atualizar se estiver autenticado
  useEffect(() => {
    const savedMode = localStorage.getItem("hospital_view_mode") as ViewMode
    if (savedMode) {
      if (savedMode === "admin" && !isAuthenticated) {
        // Aguarda a inicialização da sessão para não jogar pra login antes da hora
      } else {
        setViewMode(savedMode)
      }
    }
    
    // Pequeno delay para permitir que o contexto hospitalar verifique a sessão
    const timer = setTimeout(() => setIsInitializing(false), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      const savedMode = localStorage.getItem("hospital_view_mode") as ViewMode
      if (savedMode === "admin") {
        setViewMode("admin")
      }
    }
  }, [isAuthenticated])

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem("hospital_view_mode", mode)
  }

  const handleAdminAccess = () => {
    if (isAuthenticated) {
      changeViewMode("admin")
    } else {
      changeViewMode("login")
    }
  }

  const handleLoginSuccess = () => {
    changeViewMode("admin")
  }

  const handleBackToMenu = () => {
    changeViewMode("menu")
  }

  // Se o viewMode for admin e não estiver autenticado e ainda inicializando, mostra tela de loading
  if (viewMode === "admin" && !isAuthenticated && isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Carregando sessão...</div>
  }

  // Se o viewMode for admin e não estiver autenticado e terminou de inicializar, joga pro login
  useEffect(() => {
    if (viewMode === "admin" && !isAuthenticated && !isInitializing) {
      changeViewMode("login")
    }
  }, [viewMode, isAuthenticated, isInitializing])

  return (
    <>
      {viewMode === "menu" && (
        <MainMenu 
          onSelectNursing={() => changeViewMode("nursing")}
          onSelectAdmin={handleAdminAccess}
        />
      )}
      
      {viewMode === "nursing" && (
        <div className="relative">
          <button
            onClick={handleBackToMenu}
            className="fixed top-4 left-4 z-50 bg-card/80 backdrop-blur border border-border px-3 py-2 rounded-lg text-sm text-foreground hover:bg-card transition-colors"
          >
            Voltar
          </button>
          <NursingDashboard />
        </div>
      )}

      {viewMode === "login" && (
        <div className="relative">
          <button
            onClick={handleBackToMenu}
            className="fixed top-4 left-4 z-50 bg-card/80 backdrop-blur border border-border px-3 py-2 rounded-lg text-sm text-foreground hover:bg-card transition-colors"
          >
            Voltar
          </button>
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      )}
      
      {viewMode === "admin" && (
        <div className="relative">
          <button
            onClick={handleBackToMenu}
            className="fixed top-4 left-4 z-50 bg-card/80 backdrop-blur border border-border px-3 py-2 rounded-lg text-sm text-foreground hover:bg-card transition-colors"
          >
            Voltar ao Menu
          </button>
          <AdminDashboard />
        </div>
      )}
    </>
  )
}

export default function HospitalCallSystem() {
  return (
    <HospitalProvider>
      <HospitalApp />
    </HospitalProvider>
  )
}

function MainMenu({ 
  onSelectNursing,
  onSelectAdmin
}: { 
  onSelectNursing: () => void
  onSelectAdmin: () => void
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-xl">
              <HeartPulse className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Chamado Digital</h1>
              <p className="text-muted-foreground">Sistema de Leitos Hospitalares</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Nursing Dashboard Card - No Auth Required */}
          <button
            onClick={onSelectNursing}
            className={cn(
              "bg-card rounded-2xl border border-border p-6 text-left",
              "hover:border-primary hover:shadow-lg transition-all",
              "group"
            )}
          >
            <div className="bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <LayoutDashboard className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Central de Enfermagem</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Painel para TV/Monitor grande. Visualize e gerencie todos os chamados em tempo real com alertas sonoros.
            </p>
            <div className="flex items-center text-primary text-sm font-medium">
              Acessar painel
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Admin Dashboard Card - Auth Required */}
          <button
            onClick={onSelectAdmin}
            className={cn(
              "bg-card rounded-2xl border border-border p-6 text-left",
              "hover:border-success hover:shadow-lg transition-all",
              "group"
            )}
          >
            <div className="bg-success/10 w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:bg-success/20 transition-colors">
              <Settings className="h-8 w-8 text-success" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold text-foreground">Painel Administrativo</h2>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Cadastre leitos, gerencie usuários, configure alertas sonoros e acompanhe relatórios de SLA.
            </p>
            <div className="flex items-center text-success text-sm font-medium">
              Fazer login
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Instructions */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-muted/50 rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-3">Como funciona o sistema:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                <strong className="text-foreground">Central de Enfermagem:</strong> Exiba em uma TV/Monitor grande. Acesso livre, sem necessidade de login. Sons de alerta automáticos.
              </li>
              <li>
                <strong className="text-foreground">Painel Administrativo:</strong> Acesso restrito por login. Cadastre leitos, usuários e configure sons de alerta.
              </li>
              <li>
                <strong className="text-foreground">Paciente:</strong> Utiliza o aplicativo instalado no tablet para fazer solicitações (emergência, dor, higiene, água, ajuste de leito)
              </li>
              <li>
                <strong className="text-foreground">Prioridades:</strong> Vermelho (Crítico) - som alto e repetido, Amarelo (Urgente), Azul (Rotina)
              </li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Sistema de Chamado Digital de Leitos Hospitalares
          </p>
        </div>
      </footer>
    </div>
  )
}

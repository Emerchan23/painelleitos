"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Upload, AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function BackupSettings() {
  const { toast } = useToast()
  const [isRestoring, setIsRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBackup = () => {
    window.open('/api/settings/backup', '_blank')
  }

  const handleRestoreClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo de backup válido (.json).",
        variant: "destructive",
      })
      return
    }

    if (!confirm("AVISO: A restauração substituirá TODOS os dados atuais do sistema. Esta ação não pode ser desfeita. Deseja continuar?")) {
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setIsRestoring(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/settings/restore', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Restauração Concluída",
          description: "Os dados foram restaurados com sucesso. A página será recarregada.",
        })
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        throw new Error(data.error || 'Erro desconhecido')
      }
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Erro na restauração",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup e Restauração</CardTitle>
        <CardDescription>
          Faça o download de todos os dados do sistema ou restaure a partir de um arquivo de backup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            A restauração de um backup irá apagar e substituir todos os dados atuais do sistema, incluindo chamados em andamento, leitos e usuários.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleBackup} className="flex-1 gap-2" variant="outline">
            <Download className="h-4 w-4" />
            Gerar Backup (Download)
          </Button>

          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button 
            onClick={handleRestoreClick} 
            className="flex-1 gap-2" 
            variant="destructive"
            disabled={isRestoring}
          >
            {isRestoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isRestoring ? "Restaurando..." : "Restaurar Backup"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

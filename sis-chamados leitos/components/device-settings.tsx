"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { TabletSmartphone, Save, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function DeviceSettings() {
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/settings/device')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPassword(data.data.password)
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleSave = async () => {
    if (!password || password.length < 4) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 4 caracteres.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/device', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      const data = await res.json()
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Senha do dispositivo atualizada com sucesso.",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a senha.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TabletSmartphone className="h-5 w-5" />
          Configurações dos Tablets
        </CardTitle>
        <CardDescription>
          Defina a senha necessária para acessar a tela de configuração dentro do aplicativo dos pacientes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="max-w-md">
          <Field>
            <FieldLabel>Senha de Acesso (App)</FieldLabel>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: admin123"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Esta senha será solicitada ao clicar no ícone de engrenagem no aplicativo do paciente. A senha padrão é <strong>admin123</strong>.
            </p>
          </Field>
          
          <Button 
            onClick={handleSave} 
            disabled={isLoading || isSaving}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Senha"}
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

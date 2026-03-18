"use client"

import { useState } from "react"
import { useHospital, TIMEZONE_LABELS, type TimezoneOption } from "@/lib/hospital-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Clock, Monitor, Globe, Building, Image as ImageIcon } from "lucide-react"

const INTERVAL_OPTIONS = [
  { value: 10, label: "10 segundos" },
  { value: 15, label: "15 segundos" },
  { value: 30, label: "30 segundos" },
  { value: 45, label: "45 segundos" },
  { value: 60, label: "1 minuto" },
  { value: 90, label: "1,5 minutos" },
  { value: 120, label: "2 minutos" },
]

export function RefreshSettings() {
  const { refreshSettings, updateRefreshSettings } = useHospital()
  const [companyName, setCompanyName] = useState(refreshSettings?.company_name || "HOSPITAL SYSTEM")
  const [logoUrl, setLogoUrl] = useState(refreshSettings?.logo_url || "")

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (data.success) {
        setLogoUrl(data.url)
      } else {
        alert("Erro ao fazer upload: " + data.error)
      }
    } catch (error) {
      console.error("Erro ao subir imagem:", error)
      alert("Erro ao conectar com o servidor de upload")
    }
  }

  const handleSaveCompanyInfo = () => {
    updateRefreshSettings({
      company_name: companyName,
      logo_url: logoUrl
    })
    
    // Mostra um feedback visual simplificado se tivermos a prop the toast disponível aqui ou recarrega a página para atualizar o header
    // Usaremos reload para atualizar imediatamente as props no layout principal
    setTimeout(() => {
        window.location.reload()
    }, 500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-5 w-5" />
          Atualização Automática do Painel
        </CardTitle>
        <CardDescription>
          Configure o intervalo de atualização automática do Painel Central de Enfermagem.
          A atualização periódica garante que os dados exibidos na TV/monitor estejam sempre atualizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-6">
          {/* Enable/Disable */}
          <Field>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <FieldLabel className="text-base">Atualização Automática</FieldLabel>
                  <p className="text-sm text-muted-foreground">
                    Ativar atualização periódica do painel de enfermagem
                  </p>
                </div>
              </div>
              <Switch
                checked={refreshSettings.enabled}
                onCheckedChange={(enabled) => updateRefreshSettings({ enabled })}
              />
            </div>
          </Field>

          {/* Interval Selection */}
          <Field>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <FieldLabel className="text-base">Intervalo de Atualização</FieldLabel>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Tempo entre cada atualização automática da tela
            </p>
            
            <div className="space-y-4">
              <Slider
                value={[refreshSettings.intervalSeconds]}
                onValueChange={([value]) => updateRefreshSettings({ intervalSeconds: value })}
                min={10}
                max={120}
                step={5}
                disabled={!refreshSettings.enabled}
                className="w-full"
              />
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>10s</span>
                <span className="font-medium text-foreground text-lg">
                  {refreshSettings.intervalSeconds < 60 
                    ? `${refreshSettings.intervalSeconds} segundos`
                    : refreshSettings.intervalSeconds === 60 
                      ? "1 minuto"
                      : `${Math.floor(refreshSettings.intervalSeconds / 60)} min ${refreshSettings.intervalSeconds % 60}s`
                  }
                </span>
                <span>2min</span>
              </div>
            </div>
          </Field>

          {/* Quick Select Buttons */}
          <Field>
            <FieldLabel className="text-sm mb-2">Seleção Rápida</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {INTERVAL_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={refreshSettings.intervalSeconds === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateRefreshSettings({ intervalSeconds: option.value })}
                  disabled={!refreshSettings.enabled}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </Field>

          {/* Timezone Selection */}
          <Field>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <FieldLabel className="text-base">Fuso Horário</FieldLabel>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Define o horário exibido em todos os painéis do sistema
            </p>
            
            <Select
              value={refreshSettings.timezone}
              onValueChange={(value) => updateRefreshSettings({ timezone: value as TimezoneOption })}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecione o fuso horário" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIMEZONE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground mt-2">
              Horário atual: {new Date().toLocaleTimeString("pt-BR", { 
                timeZone: refreshSettings.timezone,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              })} ({TIMEZONE_LABELS[refreshSettings.timezone]})
            </p>
          </Field>

          {/* Company Information */}
          <div className="pt-6 border-t border-border mt-4">
            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Identidade Visual da Empresa
            </h4>
            
            <div className="space-y-4 max-w-md">
              <Field>
                <FieldLabel>Nome da Empresa</FieldLabel>
                <Input 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)} 
                  placeholder="Ex: HOSPITAL SYSTEM" 
                />
              </Field>

              <Field>
                <FieldLabel>Logo da Empresa</FieldLabel>
                <div className="flex flex-col gap-3">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <span className="uppercase">OU</span>
                  </div>
                  <Input 
                    value={logoUrl} 
                    onChange={(e) => setLogoUrl(e.target.value)} 
                    placeholder="URL da imagem (http://...)" 
                  />
                  {logoUrl && (
                    <div className="mt-2 border rounded-md p-2 bg-white w-fit">
                      <img 
                        src={logoUrl} 
                        alt="Preview Logo" 
                        className="h-16 object-contain" 
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Faça upload de uma imagem ou cole uma URL direta.
                </p>
              </Field>

              <Button onClick={handleSaveCompanyInfo} className="w-full">
                Salvar Identidade Visual
              </Button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Informação
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- O Painel Central de Enfermagem atualiza automaticamente conforme configurado</li>
              <li>- Intervalos menores consomem mais recursos mas mantém dados mais atuais</li>
              <li>- Recomendado: 30 segundos para uso normal em TV/monitor</li>
              <li>- O botão de atualização manual sempre está disponível no painel</li>
              <li>- O fuso horário padrão é Brasília (GMT-3)</li>
            </ul>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

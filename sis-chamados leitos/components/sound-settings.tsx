"use client"

import { useHospital, type AlertSoundType, ALERT_SOUND_LABELS } from "@/lib/hospital-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, AlertTriangle, AlertCircle, Info, Play, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"

const SOUND_OPTIONS: AlertSoundType[] = ["beep", "alarm", "chime", "siren", "bell", "code_blue", "pulse", "high_alert"]

export function SoundSettings() {
  const { soundSettings, updateSoundSettings, playAlertSound } = useHospital()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Configurações de Som
        </CardTitle>
        <CardDescription>
          Configure os alertas sonoros para cada nível de prioridade. Os sons serão tocados na Central de Enfermagem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-6">
          {/* Enable/Disable Sound */}
          <Field>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {soundSettings.enabled ? (
                  <Volume2 className="h-5 w-5 text-success" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <FieldLabel className="mb-0">Sons de Alerta</FieldLabel>
                  <p className="text-sm text-muted-foreground">
                    Ativar ou desativar todos os sons de alerta
                  </p>
                </div>
              </div>
              <Switch
                checked={soundSettings.enabled}
                onCheckedChange={(enabled) => updateSoundSettings({ enabled })}
              />
            </div>
          </Field>

          {/* Volume Control */}
          <Field className={cn(!soundSettings.enabled && "opacity-50 pointer-events-none")}>
            <FieldLabel>Volume</FieldLabel>
            <div className="flex items-center gap-4">
              <VolumeX className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[soundSettings.volume * 100]}
                onValueChange={(value) => updateSoundSettings({ volume: value[0] / 100 })}
                max={100}
                step={5}
                className="flex-1"
              />
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium w-10 text-right">
                {Math.round(soundSettings.volume * 100)}%
              </span>
            </div>
          </Field>

          {/* Sound Types by Priority */}
          <div className={cn(
            "space-y-4 pt-4 border-t border-border",
            !soundSettings.enabled && "opacity-50 pointer-events-none"
          )}>
            <p className="text-sm font-medium text-foreground">Sons por Prioridade</p>
            
            {/* Emergency Sound */}
            <Field>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emergency/10 p-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-emergency" />
                  </div>
                  <div>
                    <FieldLabel className="mb-0">Emergência (Crítico)</FieldLabel>
                    <p className="text-xs text-muted-foreground">Som mais alto e urgente</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={soundSettings.emergencySound}
                    onValueChange={(value: AlertSoundType) => updateSoundSettings({ emergencySound: value })}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOUND_OPTIONS.map((sound) => (
                        <SelectItem key={sound} value={sound}>
                          {ALERT_SOUND_LABELS[sound]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => playAlertSound("emergency")}
                    title="Testar som"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Field>

            {/* Urgent Sound */}
            <Field>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-urgent/10 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-urgent" />
                  </div>
                  <div>
                    <FieldLabel className="mb-0">Urgente</FieldLabel>
                    <p className="text-xs text-muted-foreground">Som de atenção moderada</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={soundSettings.urgentSound}
                    onValueChange={(value: AlertSoundType) => updateSoundSettings({ urgentSound: value })}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOUND_OPTIONS.map((sound) => (
                        <SelectItem key={sound} value={sound}>
                          {ALERT_SOUND_LABELS[sound]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => playAlertSound("urgent")}
                    title="Testar som"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Field>

            {/* Routine Sound */}
            <Field>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-routine/10 p-2 rounded-lg">
                    <Info className="h-4 w-4 text-routine" />
                  </div>
                  <div>
                    <FieldLabel className="mb-0">Rotina</FieldLabel>
                    <p className="text-xs text-muted-foreground">Som suave para solicitações comuns</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={soundSettings.routineSound}
                    onValueChange={(value: AlertSoundType) => updateSoundSettings({ routineSound: value })}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOUND_OPTIONS.map((sound) => (
                        <SelectItem key={sound} value={sound}>
                          {ALERT_SOUND_LABELS[sound]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => playAlertSound("routine")}
                    title="Testar som"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Field>
          </div>

          {/* Repeat Interval */}
          <div className={cn(
            "space-y-4 pt-4 border-t border-border",
            !soundSettings.enabled && "opacity-50 pointer-events-none"
          )}>
            <Field>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Repeat className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <FieldLabel className="mb-0">Repetição de Alerta</FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Intervalo para repetir o som enquanto a chamada não for atendida
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Slider
                  value={[soundSettings.repeatIntervalSeconds]}
                  onValueChange={(value) => updateSoundSettings({ repeatIntervalSeconds: value[0] })}
                  min={10}
                  max={120}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-20 text-right tabular-nums">
                  {soundSettings.repeatIntervalSeconds} seg
                </span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>10 seg</span>
                <span>120 seg</span>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                O som será repetido a cada <strong className="text-foreground">{soundSettings.repeatIntervalSeconds} segundos</strong> para chamadas pendentes de todas as prioridades.
              </p>
            </Field>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 rounded-lg p-4 mt-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Dica:</strong> Para que os sons funcionem corretamente na Central de Enfermagem (TV/Monitor), 
              certifique-se de que o dispositivo tem o volume ativado e que o navegador tem permissão para reproduzir áudio.
            </p>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { DBSoundSettings, ApiResponse, SoundSettings } from '@/lib/types'

// Converter DB para API format
function mapDBToSoundSettings(db: DBSoundSettings): SoundSettings {
  return {
    enabled: db.enabled,
    volume: Number(db.volume),
    emergencySound: db.emergency_sound,
    urgentSound: db.urgent_sound,
    routineSound: db.routine_sound,
    repeatIntervalSeconds: db.repeat_interval_seconds,
  }
}

// GET - Buscar configurações de som
export async function GET() {
  try {
    let settings = await queryOne<DBSoundSettings>(
      'SELECT * FROM sound_settings WHERE id = ?',
      ['default']
    )

    // Se não existir, criar configuração padrão
    if (!settings) {
      try {
        await execute(
          `INSERT INTO sound_settings (id, enabled, volume, emergency_sound, urgent_sound, routine_sound, repeat_interval_seconds)
           VALUES ('default', TRUE, 0.80, 'siren', 'alarm', 'beep', 20)`
        )
      } catch (e) {
        // Ignora erro de duplicidade se ocorreu concorrência
      }
      
      settings = await queryOne<DBSoundSettings>(
        'SELECT * FROM sound_settings WHERE id = ?',
        ['default']
      )
    }

    return NextResponse.json<ApiResponse<{ settings: SoundSettings }>>(
      {
        success: true,
        data: { settings: mapDBToSoundSettings(settings!) },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao buscar configurações de som:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configurações de som
export async function PUT(request: NextRequest) {
  try {
    const body: Partial<SoundSettings> = await request.json()
    console.log('Recebendo atualização de som:', body)
    const { enabled, volume, emergencySound, urgentSound, routineSound, repeatIntervalSeconds } = body

    const updates: string[] = []
    const values: unknown[] = []

    if (enabled !== undefined) {
      updates.push('enabled = ?')
      values.push(enabled)
    }
    if (volume !== undefined) {
      updates.push('volume = ?')
      values.push(volume)
    }
    if (emergencySound !== undefined) {
      updates.push('emergency_sound = ?')
      values.push(emergencySound)
    }
    if (urgentSound !== undefined) {
      updates.push('urgent_sound = ?')
      values.push(urgentSound)
    }
    if (routineSound !== undefined) {
      updates.push('routine_sound = ?')
      values.push(routineSound)
    }
    if (repeatIntervalSeconds !== undefined) {
      updates.push('repeat_interval_seconds = ?')
      values.push(repeatIntervalSeconds)
    }

    if (updates.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    await execute(
      `UPDATE sound_settings SET ${updates.join(', ')} WHERE id = 'default'`,
      values
    )

    const updatedSettings = await queryOne<DBSoundSettings>(
      'SELECT * FROM sound_settings WHERE id = ?',
      ['default']
    )

    return NextResponse.json<ApiResponse<{ settings: SoundSettings }>>(
      {
        success: true,
        data: { settings: mapDBToSoundSettings(updatedSettings!) },
        message: 'Configurações de som atualizadas com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao atualizar configurações de som:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

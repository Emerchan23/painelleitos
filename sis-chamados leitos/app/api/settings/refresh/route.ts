import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { DBRefreshSettings, ApiResponse, RefreshSettings } from '@/lib/types'

// Converter DB para API format
function mapDBToRefreshSettings(db: DBRefreshSettings): RefreshSettings {
  return {
    enabled: db.enabled,
    intervalSeconds: db.interval_seconds,
    timezone: db.timezone,
  }
}

// Helper for System Settings since it doesn't have its own API endpoint
async function getSystemSettings() {
  try {
    const settings = await queryOne<any>(
      'SELECT * FROM system_settings WHERE id = ?',
      ['default']
    )
    return settings
  } catch (e: any) {
    // Se a tabela não existir, cria automaticamente para evitar erros no frontend
    if (e.code === 'ER_NO_SUCH_TABLE') {
      await execute(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id varchar(36) NOT NULL DEFAULT 'default',
          company_name varchar(255) DEFAULT 'HOSPITAL SYSTEM',
          logo_url varchar(255) DEFAULT NULL,
          primary_color varchar(50) DEFAULT '#0ea5e9',
          updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `)
      await execute(`INSERT IGNORE INTO system_settings (id, company_name) VALUES ('default', 'HOSPITAL SYSTEM')`)
      return await queryOne<any>('SELECT * FROM system_settings WHERE id = ?', ['default'])
    }
    throw e
  }
}

// GET - Buscar configurações de atualização
export async function GET() {
  try {
    let settings = await queryOne<DBRefreshSettings>(
      'SELECT * FROM refresh_settings WHERE id = ?',
      ['default']
    )

    // Se não existir, criar configuração padrão
    if (!settings) {
      try {
        await execute(
          `INSERT INTO refresh_settings (id, enabled, interval_seconds, timezone)
           VALUES ('default', TRUE, 30, 'America/Sao_Paulo')`
        )
      } catch (e) {
        // Ignora erro de duplicidade se ocorreu concorrência
      }
      
      settings = await queryOne<DBRefreshSettings>(
        'SELECT * FROM refresh_settings WHERE id = ?',
        ['default']
      )
    }

    let sysSettings = await getSystemSettings()
    if (!sysSettings) {
      try {
        await execute(
          `INSERT INTO system_settings (id, company_name, primary_color)
           VALUES ('default', 'HOSPITAL SYSTEM', '#0ea5e9')`
        )
        sysSettings = await getSystemSettings()
      } catch (e) {
        // Ignora erro
      }
    }

    const finalSettings = {
      ...mapDBToRefreshSettings(settings!),
      company_name: sysSettings?.company_name || 'HOSPITAL SYSTEM',
      logo_url: sysSettings?.logo_url || ''
    }

    return NextResponse.json<ApiResponse<{ settings: any }>>(
      {
        success: true,
        data: { settings: finalSettings },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao buscar configurações de atualização:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configurações de atualização
export async function PUT(request: NextRequest) {
  try {
    const body: any = await request.json()
    const { enabled, intervalSeconds, timezone, company_name, logo_url } = body

    const updates: string[] = []
    const values: unknown[] = []

    if (enabled !== undefined) {
      updates.push('enabled = ?')
      values.push(enabled)
    }
    if (intervalSeconds !== undefined) {
      updates.push('interval_seconds = ?')
      values.push(intervalSeconds)
    }
    if (timezone !== undefined) {
      updates.push('timezone = ?')
      values.push(timezone)
    }

    if (updates.length > 0) {
      await execute(
        `UPDATE refresh_settings SET ${updates.join(', ')} WHERE id = 'default'`,
        values
      )
    }

    const sysUpdates: string[] = []
    const sysValues: unknown[] = []

    if (company_name !== undefined) {
      sysUpdates.push('company_name = ?')
      sysValues.push(company_name)
    }
    
    if (logo_url !== undefined) {
      sysUpdates.push('logo_url = ?')
      sysValues.push(logo_url)
    }

    if (sysUpdates.length > 0) {
      // Garantir que existe a linha
      const hasSysSettings = await getSystemSettings()
      if (!hasSysSettings) {
         await execute(
          `INSERT INTO system_settings (id, company_name, primary_color)
           VALUES ('default', 'HOSPITAL SYSTEM', '#0ea5e9')`
        )
      }
      
      await execute(
        `UPDATE system_settings SET ${sysUpdates.join(', ')} WHERE id = 'default'`,
        sysValues
      )
    }

    if (updates.length === 0 && sysUpdates.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    const updatedSettings = await queryOne<DBRefreshSettings>(
      'SELECT * FROM refresh_settings WHERE id = ?',
      ['default']
    )
    
    const sysSettings = await getSystemSettings()

    const finalSettings = {
      ...mapDBToRefreshSettings(updatedSettings!),
      company_name: sysSettings?.company_name || 'HOSPITAL SYSTEM',
      logo_url: sysSettings?.logo_url || ''
    }

    return NextResponse.json<ApiResponse<{ settings: any }>>(
      {
        success: true,
        data: { settings: finalSettings },
        message: 'Configurações de atualização atualizadas com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao atualizar configurações de atualização:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

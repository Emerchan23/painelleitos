import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { ApiResponse } from '@/lib/types'

// We assume the table already exists via script, avoid DDL in API routes
// Just ensure default row exists if we can query it
async function ensureDefaultRow() {
  try {
    const settings = await queryOne('SELECT * FROM device_settings WHERE id = ?', ['default'])
    if (!settings) {
      await execute(`INSERT INTO device_settings (id, password) VALUES ('default', 'admin123')`)
    }
  } catch (e) {
    // If table doesn't exist yet, ignore
    console.log('Tabela device_settings não existe ou erro ao criar linha default', e)
  }
}

export async function GET() {
  try {
    await ensureDefaultRow()
    const settings = await queryOne<any>('SELECT password FROM device_settings WHERE id = ?', ['default'])
    
    return NextResponse.json(
      {
        success: true,
        data: { password: settings?.password || 'admin123' },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao buscar configurações do dispositivo:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Senha não fornecida' },
        { status: 400 }
      )
    }

    await ensureDefaultRow()
    
    await execute(
      `UPDATE device_settings SET password = ? WHERE id = 'default'`,
      [password]
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Senha atualizada com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao atualizar configurações do dispositivo:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

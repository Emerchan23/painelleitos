import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'

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

export async function POST(request: NextRequest) {
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
    
    const settings = await queryOne<any>('SELECT password FROM device_settings WHERE id = ?', ['default'])
    
    if (settings?.password === password) {
      return NextResponse.json({ success: true }, { status: 200 })
    } else {
      return NextResponse.json({ success: false, error: 'Senha incorreta' }, { status: 401 })
    }
  } catch (error) {
    console.error('Erro ao verificar senha:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

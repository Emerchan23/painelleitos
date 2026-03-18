import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET() {
  try {
    const pool = getPool()
    const tables = [
      'wards',
      'call_types',
      'admin_users',
      'beds',
      'device_settings',
      'refresh_settings',
      'sound_settings',
      'system_settings',
      'calls',
      'call_history'
    ]

    const backupData: Record<string, any[]> = {}

    for (const table of tables) {
      const [rows] = await pool.execute(`SELECT * FROM ${table}`)
      backupData[table] = rows as any[]
    }

    const jsonString = JSON.stringify(backupData, null, 2)

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json"`,
        'Content-Type': 'application/json',
      },
    })
  } catch (error: any) {
    console.error('Backup error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao gerar backup: ' + (error.message || 'Erro desconhecido') }, { status: 500 })
  }
}

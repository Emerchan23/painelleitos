import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { ApiResponse, SLAStats } from '@/lib/types'

interface DBSLAStats {
  ward: string
  total_calls: number
  avg_response_seconds: number | null
  min_response_seconds: number | null
  max_response_seconds: number | null
}

interface DBWard {
  name: string
}

// GET - Buscar estatísticas de SLA por ala
export async function GET() {
  try {
    // 1. Buscar todas as alas cadastradas para garantir que apareçam mesmo sem chamados
    const dbWards = await query<DBWard>('SELECT name FROM wards ORDER BY name')
    const wardNames = dbWards.map(w => w.name)
    
    // Fallback se não houver alas no banco
    if (wardNames.length === 0) {
       wardNames.push('UTI', 'Enfermaria', 'Pediatria', 'Maternidade', 'Emergência')
    }

    // 2. Buscar estatísticas dos chamados
    const stats = await query<DBSLAStats>(`
      SELECT 
        ward,
        COUNT(*) as total_calls,
        AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_response_seconds,
        MIN(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as min_response_seconds,
        MAX(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as max_response_seconds
      FROM calls
      WHERE status = 'completed' AND completed_at IS NOT NULL AND ward IS NOT NULL
      GROUP BY ward
    `)

    // 3. Combinar dados (alas do banco + alas encontradas nos chamados)
    const allWardsSet = new Set([...wardNames, ...stats.map(s => s.ward)])
    const allWards = Array.from(allWardsSet).sort()

    const slaStats: SLAStats[] = allWards.map((ward) => {
      const wardStats = stats.find((s) => s.ward === ward)
      return {
        ward,
        totalCalls: Number(wardStats?.total_calls || 0),
        avgResponseSeconds: Number(wardStats?.avg_response_seconds || 0) * 1000, // Converter para ms para compatibilidade com frontend
        minResponseSeconds: Number(wardStats?.min_response_seconds || 0) * 1000,
        maxResponseSeconds: Number(wardStats?.max_response_seconds || 0) * 1000,
      }
    })

    return NextResponse.json<ApiResponse<{ stats: SLAStats[] }>>(
      {
        success: true,
        data: { stats: slaStats },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao buscar estatísticas de SLA:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

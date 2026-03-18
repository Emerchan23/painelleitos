import { NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import type { ApiResponse, WardType } from '@/lib/types'

interface DashboardStats {
  totalBeds: number
  totalCalls: number
  activeCalls: number
  completedToday: number
  bedsByWard: Record<WardType, number>
  callsByPriority: {
    emergency: number
    urgent: number
    routine: number
  }
  bedsByStatus: {
    available: number
    occupied: number
    maintenance: number
    reserved: number
  }
}

interface CountResult {
  count: number
}

interface WardCount {
  ward: WardType
  count: number
}

interface PriorityCount {
  priority: string
  count: number
}

interface StatusCount {
  status: string
  count: number
}

// GET - Buscar estatísticas do dashboard
export async function GET() {
  try {
    // Total de leitos
    const totalBedsResult = await queryOne<CountResult>('SELECT COUNT(*) as count FROM beds')
    const totalBeds = totalBedsResult?.count || 0

    // Total de chamados
    const totalCallsResult = await queryOne<CountResult>('SELECT COUNT(*) as count FROM calls')
    const totalCalls = totalCallsResult?.count || 0

    // Chamados ativos
    const activeCallsResult = await queryOne<CountResult>(
      "SELECT COUNT(*) as count FROM calls WHERE status != 'completed'"
    )
    const activeCalls = activeCallsResult?.count || 0

    // Chamados completados hoje
    const completedTodayResult = await queryOne<CountResult>(
      "SELECT COUNT(*) as count FROM calls WHERE status = 'completed' AND DATE(completed_at) = CURDATE()"
    )
    const completedToday = completedTodayResult?.count || 0

    // Leitos por ala
    const bedsByWardResults = await query<WardCount>(
      'SELECT ward, COUNT(*) as count FROM beds GROUP BY ward'
    )
    const allWards: WardType[] = ['UTI', 'Enfermaria', 'Pediatria', 'Maternidade', 'Emergência']
    const bedsByWard: Record<WardType, number> = {} as Record<WardType, number>
    allWards.forEach((ward) => {
      const wardData = bedsByWardResults.find((w) => w.ward === ward)
      bedsByWard[ward] = wardData?.count || 0
    })

    // Chamados ativos por prioridade
    const callsByPriorityResults = await query<PriorityCount>(
      "SELECT priority, COUNT(*) as count FROM calls WHERE status != 'completed' GROUP BY priority"
    )
    const callsByPriority = {
      emergency: callsByPriorityResults.find((c) => c.priority === 'emergency')?.count || 0,
      urgent: callsByPriorityResults.find((c) => c.priority === 'urgent')?.count || 0,
      routine: callsByPriorityResults.find((c) => c.priority === 'routine')?.count || 0,
    }

    // Leitos por status
    const bedsByStatusResults = await query<StatusCount>(
      'SELECT status, COUNT(*) as count FROM beds GROUP BY status'
    )
    const bedsByStatus = {
      available: bedsByStatusResults.find((b) => b.status === 'available')?.count || 0,
      occupied: bedsByStatusResults.find((b) => b.status === 'occupied')?.count || 0,
      maintenance: bedsByStatusResults.find((b) => b.status === 'maintenance')?.count || 0,
      reserved: bedsByStatusResults.find((b) => b.status === 'reserved')?.count || 0,
    }

    const stats: DashboardStats = {
      totalBeds,
      totalCalls,
      activeCalls,
      completedToday,
      bedsByWard,
      callsByPriority,
      bedsByStatus,
    }

    return NextResponse.json<ApiResponse<{ stats: DashboardStats }>>(
      {
        success: true,
        data: { stats },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

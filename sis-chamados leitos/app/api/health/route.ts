import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/db'
import type { ApiResponse } from '@/lib/types'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  database: 'connected' | 'disconnected'
  timestamp: string
  version: string
}

// GET - Health check
export async function GET() {
  try {
    const isDbConnected = await testConnection()
    
    const health: HealthStatus = {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }

    return NextResponse.json<ApiResponse<{ health: HealthStatus }>>(
      {
        success: isDbConnected,
        data: { health },
      },
      { status: isDbConnected ? 200 : 503 }
    )
  } catch (error) {
    console.error('Erro no health check:', error)
    return NextResponse.json<ApiResponse>(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        data: {
          health: {
            status: 'unhealthy',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          }
        }
      },
      { status: 503 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import type { DBAdminUser, DBSession, ApiResponse, AdminUser } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value

    if (!token) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar sessão válida
    const session = await queryOne<DBSession>(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    )

    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Sessão expirada ou inválida' },
        { status: 401 }
      )
    }

    // Buscar usuário
    const user = await queryOne<DBAdminUser>(
      'SELECT * FROM admin_users WHERE id = ?',
      [session.user_id]
    )

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Usuário não encontrado' },
        { status: 401 }
      )
    }

    const adminUser: AdminUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    }

    return NextResponse.json<ApiResponse<{ user: AdminUser }>>(
      {
        success: true,
        data: { user: adminUser },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao verificar sessão:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

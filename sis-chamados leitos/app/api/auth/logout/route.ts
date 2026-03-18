import { NextRequest, NextResponse } from 'next/server'
import { execute } from '@/lib/db'
import type { ApiResponse } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value

    if (token) {
      // Remover sessão do banco
      await execute('DELETE FROM sessions WHERE token = ?', [token])
    }

    // Criar resposta removendo cookie
    const response = NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Logout realizado com sucesso',
      },
      { status: 200 }
    )

    // Remover cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

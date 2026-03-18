import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { queryOne, execute } from '@/lib/db'
import type { ApiResponse } from '@/lib/types'

// GET - Buscar ou criar token para um quarto
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ward = searchParams.get('ward')
    const room = searchParams.get('room')

    if (!ward || !room) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Ala e quarto são obrigatórios' },
        { status: 400 }
      )
    }

    // Tentar encontrar token existente
    let roomToken = await queryOne<{id: string}>(
      'SELECT id FROM room_tokens WHERE ward = ? AND room = ?',
      [ward, room]
    )

    // Se não existe, criar
    if (!roomToken) {
      const newId = uuidv4()
      await execute(
        'INSERT INTO room_tokens (id, ward, room) VALUES (?, ?, ?)',
        [newId, ward, room]
      )
      roomToken = { id: newId }
    }

    return NextResponse.json<ApiResponse<{ token: string }>>(
      {
        success: true,
        data: { token: roomToken.id },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao buscar/criar token do quarto:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

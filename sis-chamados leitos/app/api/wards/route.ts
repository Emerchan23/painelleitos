import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, execute } from '@/lib/db'
import type { DBWard, ApiResponse, Ward } from '@/lib/types'

// GET - Listar todas as alas
export async function GET() {
  try {
    const wards = await query<DBWard>('SELECT * FROM wards ORDER BY name')

    return NextResponse.json<ApiResponse<{ wards: Ward[] }>>(
      {
        success: true,
        data: {
          wards: wards.map(w => ({
            id: w.id,
            name: w.name,
            description: w.description || undefined
          }))
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao listar alas:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova ala
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nome da ala é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se nome já existe
    const existingWard = await queryOne<DBWard>(
      'SELECT id FROM wards WHERE name = ?',
      [name]
    )

    if (existingWard) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Já existe uma ala com este nome' },
        { status: 400 }
      )
    }

    const wardId = uuidv4()

    await execute(
      'INSERT INTO wards (id, name, description) VALUES (?, ?, ?)',
      [wardId, name, description || null]
    )

    const newWard: Ward = {
      id: wardId,
      name,
      description: description || undefined,
    }

    return NextResponse.json<ApiResponse<{ ward: Ward }>>(
      {
        success: true,
        data: { ward: newWard },
        message: 'Ala criada com sucesso',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar ala:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

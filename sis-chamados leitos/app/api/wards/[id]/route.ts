import { NextRequest, NextResponse } from 'next/server'
import { execute, queryOne } from '@/lib/db'
import type { ApiResponse, DBWard } from '@/lib/types'

// PUT - Atualizar ala
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nome da ala é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se nome já existe em outra ala
    const existingWard = await queryOne<DBWard>(
      'SELECT id FROM wards WHERE name = ? AND id != ?',
      [name, id]
    )

    if (existingWard) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Já existe outra ala com este nome' },
        { status: 400 }
      )
    }

    await execute(
      'UPDATE wards SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    )

    return NextResponse.json<ApiResponse>(
      { success: true, message: 'Ala atualizada com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao atualizar ala:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover ala
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await execute('DELETE FROM wards WHERE id = ?', [id])

    return NextResponse.json<ApiResponse>(
      { success: true, message: 'Ala removida com sucesso' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Erro ao deletar ala:', error)
    
    // Se der erro de foreign key (ex: tem leitos vinculados)
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Não é possível remover uma ala que possui leitos vinculados' },
        { status: 400 }
      )
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

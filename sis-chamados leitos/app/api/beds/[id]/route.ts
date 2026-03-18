import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { DBBed, ApiResponse, Bed, UpdateBedRequest } from '@/lib/types'

// Converter DB para API format
function mapDBBedToBed(dbBed: DBBed): Bed {
  return {
    id: dbBed.id,
    number: dbBed.number,
    ward: dbBed.ward,
    room: dbBed.room,
    status: dbBed.status,
    patientName: dbBed.patient_name || undefined,
    showInRoom: dbBed.show_in_room === 1 || dbBed.show_in_room === true,
    createdAt: dbBed.created_at,
    updatedAt: dbBed.updated_at,
  }
}

// GET - Buscar leito por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const bed = await queryOne<DBBed>('SELECT * FROM beds WHERE id = ?', [id])

    if (!bed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Leito não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<{ bed: Bed }>>(
      {
        success: true,
        data: { bed: mapDBBedToBed(bed) },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao buscar leito:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar leito
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateBedRequest = await request.json()
    const { number, ward, room, status, patientName, showInRoom } = body

    // Verificar se leito existe
    const existingBed = await queryOne<DBBed>(
      'SELECT id FROM beds WHERE id = ?',
      [id]
    )

    if (!existingBed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Leito não encontrado' },
        { status: 404 }
      )
    }

    // Se número foi alterado, verificar duplicidade
    if (number) {
      const numberExists = await queryOne<DBBed>(
        'SELECT id FROM beds WHERE number = ? AND id != ?',
        [number, id]
      )

      if (numberExists) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Já existe um leito com este número' },
          { status: 400 }
        )
      }
    }

    // Montar query de atualização
    const updates: string[] = []
    const values: unknown[] = []

    if (number !== undefined) {
      updates.push('number = ?')
      values.push(number)
    }
    if (ward !== undefined) {
      updates.push('ward = ?')
      values.push(ward)
    }
    if (room !== undefined) {
      updates.push('room = ?')
      values.push(room)
    }
    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)
    }
    if (patientName !== undefined) {
      updates.push('patient_name = ?')
      values.push(patientName || null)
    }
    if (showInRoom !== undefined) {
      updates.push('show_in_room = ?')
      values.push(showInRoom)
    }

    if (updates.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    values.push(id)
    await execute(
      `UPDATE beds SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // Buscar leito atualizado
    const updatedBed = await queryOne<DBBed>('SELECT * FROM beds WHERE id = ?', [id])

    return NextResponse.json<ApiResponse<{ bed: Bed }>>(
      {
        success: true,
        data: { bed: mapDBBedToBed(updatedBed!) },
        message: 'Leito atualizado com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao atualizar leito:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir leito
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se leito existe
    const existingBed = await queryOne<DBBed>(
      'SELECT id FROM beds WHERE id = ?',
      [id]
    )

    if (!existingBed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Leito não encontrado' },
        { status: 404 }
      )
    }

    // Excluir chamados relacionados primeiro
    await execute('DELETE FROM calls WHERE bed_id = ?', [id])
    
    // Excluir leito
    await execute('DELETE FROM beds WHERE id = ?', [id])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Leito excluído com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir leito:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

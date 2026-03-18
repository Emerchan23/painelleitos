import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import type { DBCall, ApiResponse, BedCall, UpdateCallStatusRequest } from '@/lib/types'

// Converter DB para API format
function mapDBCallToBedCall(dbCall: DBCall): BedCall {
  return {
    id: dbCall.id,
    bedId: dbCall.bed_id,
    bedNumber: dbCall.bed_number,
    patientName: dbCall.patient_name,
    callType: dbCall.call_type,
    priority: dbCall.priority,
    status: dbCall.status,
    ward: dbCall.ward || undefined,
    createdAt: dbCall.created_at,
    seenAt: dbCall.seen_at || undefined,
    attendingAt: dbCall.attending_at || undefined,
    completedAt: dbCall.completed_at || undefined,
  }
}

// GET - Buscar chamado por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const call = await queryOne<DBCall>('SELECT * FROM calls WHERE id = ?', [id])

    if (!call) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Chamado não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<{ call: BedCall }>>(
      {
        success: true,
        data: { call: mapDBCallToBedCall(call) },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao buscar chamado:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar status do chamado
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateCallStatusRequest = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Status é obrigatório' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'seen', 'attending', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Status inválido' },
        { status: 400 }
      )
    }

    // Verificar se chamado existe
    const existingCall = await queryOne<DBCall>(
      'SELECT * FROM calls WHERE id = ?',
      [id]
    )

    if (!existingCall) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Chamado não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar status e timestamps apropriados
    let sql = 'UPDATE calls SET status = ?'
    const values: unknown[] = [status]

    if (status === 'seen' && !existingCall.seen_at) {
      sql += ', seen_at = NOW()'
    }
    if (status === 'attending' && !existingCall.attending_at) {
      sql += ', attending_at = NOW()'
    }
    if (status === 'completed' && !existingCall.completed_at) {
      sql += ', completed_at = NOW()'
    }

    sql += ' WHERE id = ?'
    values.push(id)

    await execute(sql, values)

    // Buscar chamado atualizado
    const updatedCall = await queryOne<DBCall>('SELECT * FROM calls WHERE id = ?', [id])

    return NextResponse.json<ApiResponse<{ call: BedCall }>>(
      {
        success: true,
        data: { call: mapDBCallToBedCall(updatedCall!) },
        message: 'Chamado atualizado com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao atualizar chamado:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir chamado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se chamado existe
    const existingCall = await queryOne<DBCall>(
      'SELECT id FROM calls WHERE id = ?',
      [id]
    )

    if (!existingCall) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Chamado não encontrado' },
        { status: 404 }
      )
    }

    await execute('DELETE FROM calls WHERE id = ?', [id])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Chamado excluído com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir chamado:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

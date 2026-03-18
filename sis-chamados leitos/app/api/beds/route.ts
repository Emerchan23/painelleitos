import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, execute } from '@/lib/db'
import type { DBBed, ApiResponse, Bed, CreateBedRequest } from '@/lib/types'

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

// GET - Listar todos os leitos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ward = searchParams.get('ward')
    const status = searchParams.get('status')
    const number = searchParams.get('number')
    const id = searchParams.get('id') // this is the token

    if (id) {
      // Check if it's a bed token
      const bed = await queryOne<DBBed>('SELECT * FROM beds WHERE id = ?', [id])
      if (bed) {
        return NextResponse.json({
          success: true,
          data: { type: 'bed', beds: [mapDBBedToBed(bed)] }
        }, { status: 200 })
      }

      // Check if it's a room token
      const roomToken = await queryOne<{ward: string, room: string}>('SELECT ward, room FROM room_tokens WHERE id = ?', [id])
      if (roomToken) {
        const beds = await query<DBBed>(
          'SELECT * FROM beds WHERE ward = ? AND room = ? AND show_in_room = TRUE ORDER BY number',
          [roomToken.ward, roomToken.room]
        )
        return NextResponse.json({
          success: true,
          data: { 
            type: 'room', 
            ward: roomToken.ward, 
            room: roomToken.room, 
            beds: beds.map(mapDBBedToBed) 
          }
        }, { status: 200 })
      }

      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 404 }
      )
    }

    let sql = 'SELECT * FROM beds'
    const conditions: string[] = []
    const params: unknown[] = []

    if (ward) {
      conditions.push('ward = ?')
      params.push(ward)
    }
    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }
    if (number) {
      conditions.push('number = ?')
      params.push(number)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    sql += ' ORDER BY ward, number'

    const beds = await query<DBBed>(sql, params)

    return NextResponse.json<ApiResponse<{ beds: Bed[] }>>(
      {
        success: true,
        data: { beds: beds.map(mapDBBedToBed) },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao listar leitos:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo leito
export async function POST(request: NextRequest) {
  try {
    const body: CreateBedRequest = await request.json()
    const { number, ward, room, status = 'available', patientName, showInRoom = true } = body

    if (!ward || !room) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Ala e quarto são obrigatórios' },
        { status: 400 }
      )
    }

    // Se não forneceu número, usar o nome do quarto como identificador principal
    const finalNumber = number || room;

    // Verificar se já existe um leito com esse número (ou quarto se usado como número)
    const existingBed = await queryOne<DBBed>(
      'SELECT id FROM beds WHERE number = ?',
      [finalNumber]
    )

    if (existingBed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Já existe um leito com este número ou neste local' },
        { status: 400 }
      )
    }

    const bedId = uuidv4()

    await execute(
      `INSERT INTO beds (id, number, ward, room, status, patient_name, show_in_room) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bedId, finalNumber, ward, room, status, patientName || null, showInRoom]
    )

    const newBed: Bed = {
      id: bedId,
      number: finalNumber,
      ward,
      room,
      status,
      patientName: patientName || undefined,
      showInRoom,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return NextResponse.json<ApiResponse<{ bed: Bed }>>(
      {
        success: true,
        data: { bed: newBed },
        message: 'Leito criado com sucesso',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar leito:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

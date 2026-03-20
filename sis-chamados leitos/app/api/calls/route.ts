import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, execute } from '@/lib/db'
import type { DBCall, DBBed, ApiResponse, BedCall, CreateCallRequest, CallPriority, CallType } from '@/lib/types'

// Mapeamento de tipo de chamado para prioridade
const CALL_TYPE_PRIORITY: Record<CallType, CallPriority> = {
  emergency: 'emergency',
  pain: 'urgent',
  hygiene: 'routine',
  water: 'routine',
  bed: 'routine',
}

// Converter DB para API format
function mapDBCallToBedCall(dbCall: DBCall): BedCall {
  return {
    id: dbCall.id,
    bedId: dbCall.bed_id,
    bedNumber: dbCall.bed_number,
    room: (dbCall as any).bed_room, // Pegando do join
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

// GET - Listar chamados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const ward = searchParams.get('ward')
    const bedNumber = searchParams.get('bedNumber')
    const token = searchParams.get('token')
    const active = searchParams.get('active') // 'true' para chamados não completados

    let sql = `
      SELECT c.*,
             (SELECT b.room FROM beds b WHERE b.id = c.bed_id LIMIT 1) as bed_room
      FROM calls c
      WHERE 1=1
    `
    const conditions: string[] = []
    const params: unknown[] = []

    if (active === 'true') {
      conditions.push("c.status != 'completed'")
    }
    if (status) {
      conditions.push('c.status = ?')
      params.push(status)
    }
    if (priority) {
      conditions.push('c.priority = ?')
      params.push(priority)
    }
    if (ward) {
      conditions.push('c.ward = ?')
      params.push(ward)
    }
    if (bedNumber) {
      conditions.push('c.bed_number = ?')
      params.push(bedNumber)
    }
    if (token) {
      conditions.push('c.bed_id = ?')
      params.push(token)
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ')
    }

    // Ordenar por prioridade e data de criação
    sql += ` ORDER BY 
      FIELD(c.priority, 'emergency', 'urgent', 'routine'),
      c.created_at ASC`

    const calls = await query<DBCall>(sql, params)

    const response = NextResponse.json<ApiResponse<{ calls: BedCall[] }>>(
      {
        success: true,
        data: { calls: calls.map(mapDBCallToBedCall) },
      },
      { status: 200 }
    )

    // Prevent caching for real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Erro ao listar chamados:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo chamado
export async function POST(request: NextRequest) {
  try {
    const body: CreateCallRequest = await request.json()
    const { bedNumber, patientName, callType, ward, token } = body

    if (!patientName || !callType) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nome do paciente e tipo de chamado são obrigatórios' },
        { status: 400 }
      )
    }

    if (!bedNumber && !token) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Número do leito ou Token de vínculo são obrigatórios' },
        { status: 400 }
      )
    }

    let bed: DBBed | null | undefined;

    // Buscar ID do leito. Se veio por token (id), usa o token. Senão, tenta pelo número/quarto.
    if (token) {
      bed = await queryOne<DBBed>(
        'SELECT id, ward, number, room FROM beds WHERE id = ? LIMIT 1',
        [token]
      )
    } else if (bedNumber) {
      bed = await queryOne<DBBed>(
        'SELECT id, ward, number, room FROM beds WHERE number = ? OR room = ? LIMIT 1',
        [bedNumber, bedNumber]
      )
    }

    if (!bed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Local não encontrado no sistema' },
        { status: 404 }
      )
    }

    // O bedNumber a ser salvo será o number do leito, ou se não tiver, o nome do quarto.
    const finalBedNumber = bed.number || bed.room || 'Desconhecido';

    // Verificar se já existe chamado ativo do mesmo tipo para este leito
    const existingCall = await queryOne<DBCall>(
      `SELECT id FROM calls 
       WHERE bed_id = ? AND call_type = ? AND status != 'completed'`,
      [bed.id, callType]
    )

    if (existingCall) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Já existe um chamado ativo deste tipo para este leito' },
        { status: 400 }
      )
    }

    const callId = uuidv4()
    const priority = CALL_TYPE_PRIORITY[callType] || 'routine'
    const callWard = bed.ward || ward

    await execute(
      `INSERT INTO calls (id, bed_id, bed_number, patient_name, call_type, priority, status, ward) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [callId, bed.id, finalBedNumber, patientName, callType, priority, callWard]
    )

    const newCall: BedCall = {
      id: callId,
      bedId: bed.id,
      bedNumber: finalBedNumber,
      patientName,
      callType,
      priority,
      status: 'pending',
      ward: callWard,
      createdAt: new Date(),
    }

    return NextResponse.json<ApiResponse<{ call: BedCall }>>(
      {
        success: true,
        data: { call: newCall },
        message: 'Chamado criado com sucesso',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar chamado:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, execute } from '@/lib/db'
import type { DBAdminUser, ApiResponse, AdminUser } from '@/lib/types'

// GET - Listar todos os usuários
export async function GET() {
  try {
    const users = await query<DBAdminUser>(
      'SELECT id, name, email, created_at FROM admin_users ORDER BY created_at DESC'
    )

    const adminUsers: AdminUser[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    }))

    return NextResponse.json<ApiResponse<{ users: AdminUser[] }>>(
      {
        success: true,
        data: { users: adminUsers },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo usuário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await queryOne<DBAdminUser>(
      'SELECT id FROM admin_users WHERE email = ?',
      [email]
    )

    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Este email já está cadastrado' },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)
    const userId = uuidv4()

    await execute(
      'INSERT INTO admin_users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [userId, name, email, hashedPassword]
    )

    const newUser: AdminUser = {
      id: userId,
      name,
      email,
      createdAt: new Date(),
    }

    return NextResponse.json<ApiResponse<{ user: AdminUser }>>(
      {
        success: true,
        data: { user: newUser },
        message: 'Usuário criado com sucesso',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

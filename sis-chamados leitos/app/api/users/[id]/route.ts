import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne, execute, query } from '@/lib/db'
import type { DBAdminUser, ApiResponse, AdminUser } from '@/lib/types'

// GET - Buscar usuário por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await queryOne<DBAdminUser>(
      'SELECT id, name, email, created_at FROM admin_users WHERE id = ?',
      [id]
    )

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
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
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, password } = body

    // Verificar se usuário existe
    const existingUser = await queryOne<DBAdminUser>(
      'SELECT id FROM admin_users WHERE id = ?',
      [id]
    )

    if (!existingUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Se email foi alterado, verificar duplicidade
    if (email) {
      const emailExists = await queryOne<DBAdminUser>(
        'SELECT id FROM admin_users WHERE email = ? AND id != ?',
        [email, id]
      )

      if (emailExists) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Este email já está cadastrado' },
          { status: 400 }
        )
      }
    }

    // Montar query de atualização
    const updates: string[] = []
    const values: unknown[] = []

    if (name) {
      updates.push('name = ?')
      values.push(name)
    }
    if (email) {
      updates.push('email = ?')
      values.push(email)
    }
    if (password) {
      if (password.length < 6) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'A senha deve ter pelo menos 6 caracteres' },
          { status: 400 }
        )
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.push('password = ?')
      values.push(hashedPassword)
    }

    if (updates.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    values.push(id)
    await execute(
      `UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Usuário atualizado com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir usuário
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se é o último administrador
    const users = await query<DBAdminUser>('SELECT id FROM admin_users')
    
    if (users.length <= 1) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Não é possível excluir o último administrador' },
        { status: 400 }
      )
    }

    // Verificar se usuário existe
    const existingUser = await queryOne<DBAdminUser>(
      'SELECT id FROM admin_users WHERE id = ?',
      [id]
    )

    if (!existingUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Excluir sessões do usuário primeiro
    await execute('DELETE FROM sessions WHERE user_id = ?', [id])
    
    // Excluir usuário
    await execute('DELETE FROM admin_users WHERE id = ?', [id])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Usuário excluído com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

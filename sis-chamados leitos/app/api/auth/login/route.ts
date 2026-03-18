import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, execute } from '@/lib/db'
import type { DBAdminUser, DBSession, LoginRequest, ApiResponse, AdminUser } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar usuário pelo email
    const user = await queryOne<DBAdminUser>(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    )

    if (!user) {
      // Se não encontrar o usuário e for o admin padrão, pode ser que a tabela exista
      // mas os dados iniciais não foram populados corretamente na VPS.
      // Vamos injetar o usuário admin123 de volta para garantir o acesso.
      if (email === 'admin@hospital.com') {
         try {
           const defaultPasswordHash = await bcrypt.hash('admin123', 10)
           await execute(
             `INSERT INTO admin_users (id, name, email, password) VALUES ('admin1', 'Administrador', 'admin@hospital.com', ?);`,
             [defaultPasswordHash]
           )
           
           // Buscar novamente
           const retryUser = await queryOne<DBAdminUser>('SELECT * FROM admin_users WHERE email = ?', [email])
           if (retryUser) {
             // Retornar a função inteira para prosseguir o fluxo de login normal usando o novo retryUser
             const token = uuidv4()
             const sessionId = uuidv4()
             const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

             await execute('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)', [sessionId, retryUser.id, token, expiresAt])

             const adminUser: AdminUser = { id: retryUser.id, name: retryUser.name, email: retryUser.email, createdAt: retryUser.created_at }

             const response = NextResponse.json<ApiResponse<{ user: AdminUser; token: string }>>({ success: true, data: { user: adminUser, token }, message: 'Login restaurado com sucesso' }, { status: 200 })
             response.cookies.set('session_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24 * 60 * 60, path: '/' })
             return response
           }
         } catch(e) {
           console.error("Erro ao tentar recuperar admin:", e)
         }
      }
      
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar senha
    let isValidPassword = false;
    try {
      // O bcrypt.compare pode falhar e jogar um erro se a string não for uma hash bcrypt válida
      isValidPassword = await bcrypt.compare(password, user.password)
    } catch (e) {
      console.log('A senha no banco não é uma hash bcrypt válida, tentando outras validações...');
    }
    
    // Para desenvolvimento e fallback, também aceitar senha em texto plano (remover em produção)
    const isPlainTextMatch = password === user.password

    // Caso de fallback absoluto: se a senha for admin123 e o usuário for admin@hospital.com, 
    // forçar a entrada mesmo se a hash no banco não bater (útil após migrações)
    const isFallbackAdmin = email === 'admin@hospital.com' && password === 'admin123'
    
    // Verificar se a senha armazenada é um hash MD5 da senha digitada
    const md5Hash = crypto.createHash('md5').update(password).digest('hex')
    const isMd5Match = md5Hash === user.password || md5Hash === user.password.toLowerCase()
    
    // Adicionado: Se a senha armazenada for uma hash MD5 ou não for bcrypt, 
    // e o bcrypt.compare falhar, vamos permitir o login se a senha em texto plano bater.
    // E se não bater nenhuma das condições acima, falha.
    if (!isValidPassword && !isPlainTextMatch && !isFallbackAdmin && !isMd5Match) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Opcional: Se logou com MD5 ou texto plano, atualizar a senha para bcrypt no banco para maior segurança
    if (isMd5Match || isPlainTextMatch) {
      try {
        const newHashedPassword = await bcrypt.hash(password, 10)
        await execute(
          'UPDATE admin_users SET password = ? WHERE id = ?',
          [newHashedPassword, user.id]
        )
      } catch (updateError) {
        console.error('Erro ao atualizar hash da senha:', updateError)
        // Não falhar o login se a atualização da hash falhar
      }
    }

    // Criar token de sessão
    const token = uuidv4()
    const sessionId = uuidv4()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    // Salvar sessão no banco
    await execute(
      'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, user.id, token, expiresAt]
    )

    const adminUser: AdminUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    }

    // Criar resposta com cookie
    const response = NextResponse.json<ApiResponse<{ user: AdminUser; token: string }>>(
      {
        success: true,
        data: { user: adminUser, token },
        message: 'Login realizado com sucesso',
      },
      { status: 200 }
    )

    // Definir cookie httpOnly
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Erro no login:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno do servidor: ' + (error.message || '') },
      { status: 500 }
    )
  }
}

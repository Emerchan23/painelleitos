import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const fileContent = await file.text()
    const backupData = JSON.parse(fileContent)

    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Desativar verificação de chave estrangeira para limpar e restaurar
      await connection.execute('SET FOREIGN_KEY_CHECKS=0')

      const tables = [
        'wards',
        'call_types',
        'admin_users',
        'beds',
        'device_settings',
        'refresh_settings',
        'sound_settings',
        'system_settings',
        'calls',
        'call_history'
      ]

      for (const table of tables) {
        if (backupData[table] && Array.isArray(backupData[table])) {
          // Limpar a tabela
          await connection.execute(`TRUNCATE TABLE ${table}`)
          
          const rows = backupData[table]
          if (rows.length > 0) {
            // Obter as colunas da primeira linha
            const columns = Object.keys(rows[0])
            
            // Construir a query de insert
            const placeholders = columns.map(() => '?').join(', ')
            const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
            
            // Inserir linha por linha (poderia ser em lote para otimização, mas assim é mais seguro contra erros de sintaxe)
            for (const row of rows) {
              const values = columns.map(col => {
                const val = row[col]
                // Se for data em string ISO, manter, o driver mysql2 converte adequadamente
                // Se for objeto (como data parseada por algum motivo), tentar formatar
                if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                   // Tratamento de buffer / data
                   if (val.type === 'Buffer') {
                     return Buffer.from(val.data)
                   }
                }
                if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(val)) {
                   // Passar Date para o mysql2 formatar corretamente
                   return new Date(val);
                }
                return val
              })
              await connection.execute(query, values)
            }
          }
        }
      }

      // Reativar verificação de chave estrangeira
      await connection.execute('SET FOREIGN_KEY_CHECKS=1')

      await connection.commit()
      
      return NextResponse.json({ success: true, message: 'Restauração concluída com sucesso' })
    } catch (error) {
      await connection.rollback()
      await connection.execute('SET FOREIGN_KEY_CHECKS=1') // Garantir reativação em caso de erro
      throw error
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao restaurar backup: ' + error.message }, { status: 500 })
  }
}

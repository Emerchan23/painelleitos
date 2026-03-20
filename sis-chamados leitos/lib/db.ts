import mysql from 'mysql2/promise'

// Configuração do banco de dados MariaDB
const dbConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hospital_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
}

// Pool de conexões
let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

// Função auxiliar para executar queries
export async function query<T = unknown>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const connection = await getPool().getConnection()
  try {
    const [rows] = await connection.execute(sql, params)
    return rows as T[]
  } finally {
    connection.release()
  }
}

// Função auxiliar para executar uma query e retornar um único resultado
export async function queryOne<T = unknown>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const results = await query<T>(sql, params)
  return results.length > 0 ? results[0] : null
}

// Função auxiliar para inserir e retornar o ID
export async function insert(
  sql: string,
  params?: any[]
): Promise<{ insertId: number; affectedRows: number }> {
  const connection = await getPool().getConnection()
  try {
    const [result] = await connection.execute(sql, params)
    const insertResult = result as mysql.ResultSetHeader
    return {
      insertId: insertResult.insertId,
      affectedRows: insertResult.affectedRows,
    }
  } finally {
    connection.release()
  }
}

// Função auxiliar para update/delete
export async function execute(
  sql: string,
  params?: any[]
): Promise<{ affectedRows: number }> {
  const connection = await getPool().getConnection()
  try {
    const [result] = await connection.execute(sql, params)
    const executeResult = result as mysql.ResultSetHeader
    return {
      affectedRows: executeResult.affectedRows,
    }
  } finally {
    connection.release()
  }
}

// Função para transações
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// Testar conexão
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await getPool().getConnection()
    await connection.ping()
    connection.release()
    return true
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error)
    return false
  }
}

// Fechar pool de conexões
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

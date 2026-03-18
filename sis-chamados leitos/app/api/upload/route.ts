import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Apenas imagens são permitidas' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Caminho para salvar o arquivo
    // No Docker, isso mapeia para o volume montado em /app/public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    
    // Garantir que o diretório existe
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Ignorar erro se diretório já existe
    }

    // Gerar nome único para o arquivo
    const extension = file.name.split('.').pop() || 'png'
    const fileName = `logo-${uuidv4()}.${extension}`
    const filePath = join(uploadDir, fileName)

    // Salvar arquivo
    await writeFile(filePath, buffer)

    // Retornar URL pública
    const fileUrl = `/uploads/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      message: 'Upload realizado com sucesso'
    })
  } catch (error: any) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer upload: ' + error.message },
      { status: 500 }
    )
  }
}

"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { Bed } from "@/lib/hospital-context"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

function PrintWardContent() {
  const searchParams = useSearchParams()
  const wardName = searchParams.get("ward")
  const [beds, setBeds] = useState<Bed[]>([])
  const [roomTokens, setRoomTokens] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBedsAndTokens = async () => {
      try {
        const response = await fetch('/api/beds')
        const data = await response.json()
        if (data.success && wardName) {
          const wardBeds = data.data.beds.filter((b: Bed) => b.ward === wardName)
          setBeds(wardBeds)
          
          // Fetch tokens for each unique room
          const uniqueRooms = Array.from(new Set(wardBeds.map((b: Bed) => b.room)))
          const tokens: Record<string, string> = {}
          
          for (const room of uniqueRooms) {
            try {
              const tokenRes = await fetch(`/api/rooms/token?ward=${encodeURIComponent(wardName)}&room=${encodeURIComponent(room as string)}`)
              const tokenData = await tokenRes.json()
              if (tokenData.success && tokenData.data?.token) {
                tokens[room as string] = tokenData.data.token
              }
            } catch (err) {
              console.error(`Error fetching token for room ${room}`, err)
            }
          }
          
          setRoomTokens(tokens)
        }
      } catch (error) {
        console.error("Error fetching beds", error)
      } finally {
        setLoading(false)
      }
    }

    if (wardName) {
      fetchBedsAndTokens()
    }
  }, [wardName])

  useEffect(() => {
    // Auto-print after a small delay to allow QR codes to render
    if (!loading && beds.length > 0) {
      const timer = setTimeout(() => {
        window.print()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [loading, beds])

  if (loading) return <div className="p-8 text-center flex flex-col items-center justify-center min-h-screen"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-xl">Carregando códigos...</p></div>
  if (!wardName) return <div className="p-8 text-center">Ala não especificada.</div>
  if (beds.length === 0) return <div className="p-8 text-center">Nenhum leito encontrado para a ala {wardName}.</div>

  // Agrupa leitos por quarto
  const roomsMap = new Map<string, typeof beds>();
  beds.forEach(bed => {
    if (!roomsMap.has(bed.room)) roomsMap.set(bed.room, []);
    roomsMap.get(bed.room)!.push(bed);
  });
  const rooms = Array.from(roomsMap.entries()).map(([name, beds]) => ({ name, beds }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-white min-h-screen">
      {/* Non-printable controls */}
      <div className="print:hidden p-4 bg-muted border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Painel
          </Button>
        </Link>
        <div className="text-center font-medium">
          Pré-visualização de Impressão: Ala {wardName}
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir Agora
        </Button>
      </div>

      {/* Printable Area */}
      <div className="p-8 text-black print:p-0">
        <div className="mb-10 text-center print:mt-4">
          <h1 className="text-4xl font-black uppercase border-b-4 border-black pb-4 inline-block px-12">Ala: {wardName}</h1>
          <p className="text-gray-500 mt-2">Códigos QR para configuração de Tablets</p>
        </div>

        {rooms.map((room, roomIndex) => (
          <div key={room.name} className={`mb-12 ${roomIndex > 0 ? 'print:break-before-page' : ''}`}>
            <h2 className="text-3xl font-bold mb-6 bg-gray-200 p-4 rounded-lg">Quarto {room.name}</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 print:grid-cols-2">
              {/* QR Code do Quarto (Múltiplos Leitos) */}
              {roomTokens[room.name] && (
                <div className="flex flex-col items-center justify-center p-6 border-4 border-black rounded-2xl text-center bg-gray-50 page-break-inside-avoid">
                  <h3 className="font-black text-2xl mb-2">QR Code do Quarto</h3>
                  <p className="text-sm font-medium mb-6 text-gray-600">(Para tablet único na parede)</p>
                  <div className="bg-white p-4 rounded-xl mb-4">
                    <QRCodeSVG 
                      value={roomTokens[room.name]} 
                      size={180} 
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-xs font-mono bg-white px-3 py-2 rounded border w-full truncate">
                    {roomTokens[room.name]}
                  </div>
                </div>
              )}

              {/* QR Codes dos Leitos Individuais */}
              {room.beds.sort((a,b) => a.number.localeCompare(b.number)).map(bed => (
                <div key={bed.id} className="flex flex-col items-center justify-center p-6 border-2 border-gray-400 rounded-2xl text-center page-break-inside-avoid">
                  <h3 className="font-bold text-xl mb-2">Leito {bed.number}</h3>
                  <p className="text-xs text-gray-500 mb-6">(Quarto {bed.room})</p>
                  <div className="bg-white p-4 rounded-xl mb-4">
                    <QRCodeSVG 
                      value={bed.id} 
                      size={150} 
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded w-full truncate text-gray-500">
                    {bed.id.substring(0, 16)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PrintWardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando visualização...</div>}>
      <PrintWardContent />
    </Suspense>
  )
}

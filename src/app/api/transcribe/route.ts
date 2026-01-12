import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json()

    if (!audioUrl) {
      return NextResponse.json({ success: false, error: "URL do áudio é obrigatória" }, { status: 400 })
    }

    // Convert audio URL to base64 for Hugging Face API
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error("Erro ao baixar áudio")
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString("base64")

    // Call Hugging Face Whisper model via MCP
    // Note: This will be handled by the MCP server in production
    // For now, we'll use a direct API call
    const hfResponse = await fetch("https://api-inference.huggingface.co/models/openai/whisper-large-v3", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: audioBase64,
        parameters: {
          language: "portuguese",
          task: "transcribe",
        },
      }),
    })

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text()
      console.error("Hugging Face API error:", errorText)
      throw new Error("Erro ao processar transcrição")
    }

    const result = await hfResponse.json()
    
    // Extract transcription text
    const transcription = result.text || result[0]?.text || ""

    return NextResponse.json({
      success: true,
      transcription,
    })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao transcrever áudio",
      },
      { status: 500 }
    )
  }
}

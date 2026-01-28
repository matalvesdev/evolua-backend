import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Configuration
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Hugging Face limit)
const ALLOWED_FORMATS = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];

// Hugging Face API Configuration
const HF_API_URL = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

/**
 * POST /api/transcribe
 * Transcribe audio file to text using Hugging Face Whisper model
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Hugging Face API key is configured
    if (!HF_API_KEY) {
      return NextResponse.json(
        { error: 'Hugging Face API key not configured' },
        { status: 500 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const language = (formData.get('language') as string) || 'pt';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Validate file format
    if (!ALLOWED_FORMATS.includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Invalid audio format. Supported: webm, wav, mp3, ogg' },
        { status: 400 }
      );
    }

    // Update session status to 'processing' if sessionId provided
    if (sessionId) {
      await supabase
        .from('audio_sessions')
        .update({ transcription_status: 'processing' })
        .eq('id', sessionId);
    }

    // Convert file to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer();

    // Call Hugging Face API
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': audioFile.type,
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);

      // Update session status to 'failed' if sessionId provided
      if (sessionId) {
        await supabase
          .from('audio_sessions')
          .update({
            transcription_status: 'failed',
            processing_error: `API error: ${response.status}`,
          })
          .eq('id', sessionId);
      }

      // Check if model is loading
      if (response.status === 503) {
        return NextResponse.json(
          {
            error:
              'Model is currently loading. Please try again in a few moments.',
            retry: true,
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Transcription service error' },
        { status: response.status }
      );
    }

    // Parse transcription result
    const result = await response.json();
    const transcriptionText = result.text || '';
    const confidence = result.confidence || 0.0;

    // Update session with transcription if sessionId provided
    if (sessionId) {
      await supabase
        .from('audio_sessions')
        .update({
          transcription_status: 'completed',
          transcription_text: transcriptionText,
          transcription_confidence: confidence,
          transcription_language: language,
        })
        .eq('id', sessionId);
    }

    return NextResponse.json({
      success: true,
      transcription: transcriptionText,
      confidence,
      language,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transcribe/status
 * Get transcription status for a session
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const { data: session, error } = await supabase
      .from('audio_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: session.transcription_status,
      transcription: session.transcription_text,
      confidence: session.transcription_confidence,
      error: session.processing_error,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

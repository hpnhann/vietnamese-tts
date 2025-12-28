import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, voice, speed } = await request.json();

    // Validate
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text không được để trống' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text không được vượt quá 5000 ký tự' },
        { status: 400 }
      );
    }

    const API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GOOGLE_CLOUD_API_KEY' },
        { status: 500 }
      );
    }

    // Gọi Google Cloud TTS REST API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text: text },
          voice: {
            languageCode: 'vi-VN',
            name: voice || 'vi-VN-Neural2-A',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speed || 1.0,
            pitch: 0,
            volumeGainDb: 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google TTS API Error:', errorData);
      
      return NextResponse.json(
        { 
          error: 'Lỗi từ Google TTS API', 
          details: errorData.error?.message || 'Unknown error'
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Google trả về base64 audio
    const audioContent = data.audioContent;
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioContent, 'base64');

    // Trả về audio
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('TTS Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Lỗi khi tạo giọng nói', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}   
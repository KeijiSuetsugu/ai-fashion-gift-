import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(req: NextRequest){
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
  }
  const { prompt } = await req.json();
  if(!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  const full = `Photorealistic, ${prompt}. Please ensure subject is centered with some headroom for face overlay; keep background clean.`;

  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: full,
    size: '1024x1365',
    quality: 'high'
    // background: 'transparent' // 必要なら有効化（編集時のみ有効な場合あり）
  });

  const b64 = (result as any).data?.[0]?.b64_json;
  if(!b64) return NextResponse.json({ error: 'image generation failed' }, { status: 500 });
  return NextResponse.json({ b64 });
}

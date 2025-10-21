import { NextRequest, NextResponse } from 'next/server';
import { openai, ensureKey } from '@/lib/openai';


export async function POST(req: NextRequest){
ensureKey();
const { prompt } = await req.json();
if(!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });
const full = `Photorealistic, ${prompt}. Please ensure subject is centered with some headroom for face overlay; keep background clean.`;


const result = await openai.images.generate({
model: 'gpt-image-1',
prompt: full,
size: '1024x1365', // 縦長でInstagramに合う
quality: 'high',
background: 'transparent'
});


const b64 = (result as any).data?.[0]?.b64_json;
return NextResponse.json({ b64 });
}

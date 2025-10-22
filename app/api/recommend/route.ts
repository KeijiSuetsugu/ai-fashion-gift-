// app/api/recommend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

// Edge だと env が拾えない環境があるため Node.js 実行を明示
export const runtime = 'nodejs';

// 失敗時に画面で読めるメッセージを返すためユーティリティ
function errorJSON(message: string, detail?: any, status = 500) {
  return NextResponse.json(
    { error: message, detail: typeof detail === 'string' ? detail : JSON.stringify(detail ?? {}) },
    { status }
  );
}

// 最低限のスキーマ検証（壊れたJSONへの保険）
function sanitize(data: any) {
  const safe = { outfits: [] as any[] };
  if (data && Array.isArray(data.outfits)) {
    safe.outfits = data.outfits
      .filter((o) => o && typeof o === 'object')
      .map((o) => ({
        name: String(o.name ?? ''),
        vibe: String(o.vibe ?? ''),
        items: Array.isArray(o.items) ? o.items.map((x: any) => String(x)) : [],
        colors: Array.isArray(o.colors) ? o.colors.map((x: any) => String(x)) : [],
        accessories: Array.isArray(o.accessories) ? o.accessories.map((x: any) => String(x)) : [],
        occasion: String(o.occasion ?? ''),
        price_range: String(o.price_range ?? ''),
        caption: String(o.caption ?? ''),
        prompt: String(o.prompt ?? ''),
      }));
  }
  return safe;
}

// 最終手段：AIが落ちてもUXが続くよう、サンプルを生成
function mockOutfits(input: {
  style: string; colors: string; budget: string; occasion: string;
}) {
  const base = (name: string, vibe: string, items: string[], col: string[], occ: string, price: string) => ({
    name, vibe, items, colors: col,
    accessories: ['simple earrings', 'leather mini shoulder'],
    occasion: occ, price_range: price,
    caption: `Tried a ${vibe} look! #ootd #style #fashion`,
    prompt: `full-body fashion model, studio backdrop, soft key light, natural pose; wearing ${items.join(', ')} in ${col.join(', ')}; ${vibe} style`
  });
  const c = input.colors || 'black, beige, white';
  const cols = c.split(/[、,]/).map(s => s.trim()).filter(Boolean);
  const occ = input.occasion || 'dinner';
  const price = input.budget || '¥10,000–¥20,000';

  return {
    outfits: [
      base('Smart casual set', 'clean & modern',
        ['tailored blazer', 'silk-like blouse', 'straight trousers', 'pointed-toe pumps'], cols.slice(0,3), occ, price),
      base('Relaxed weekend', 'cozy chic',
        ['knit cardigan', 'boat-neck tee', 'satin skirt', 'ballet flats'], cols.slice(0,3), occ, price),
      base('Monotone mode', 'minimal mode',
        ['boxy jacket', 'tucked top', 'tapered pants', 'chunky loafers'], cols.slice(0,3), occ, price),
    ]
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return errorJSON('OPENAI_API_KEY is not set on Vercel → Project → Settings → Environment Variables.');
    }

    const { age, style, sizes, budget, colors, occasion, notes } = await req.json();

    const systemText =
      'You are a top personal stylist. Create exactly 3 outfit options for a woman based on the conditions. ' +
      'Return ONLY JSON that matches the schema. Each outfit must include: name, vibe, items (array), colors (array), accessories (array), occasion, price_range, caption, prompt. ' +
      'The "prompt" must be an English full-body fashion image prompt including camera angle, lighting, setting, and pose.';

    const userText = `
[CONDITIONS]
Age: ${age}
Style: ${style}
Sizes: ${sizes}
Colors: ${colors}
Budget: ${budget}
Occasion: ${occasion}
Notes: ${notes}

[OUTPUT SCHEMA]
{
  "outfits": [
    {
      "name": "string",
      "vibe": "string",
      "items": ["string"],
      "colors": ["string"],
      "accessories": ["string"],
      "occasion": "string",
      "price_range": "string",
      "caption": "string",
      "prompt": "string"
    }
  ]
}
Only return the JSON object above (no prose).
`.trim();

    // Chat Completions を使用（型の不一致を避ける & JSON固定）
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 900,
    });

    const text = completion.choices?.[0]?.message?.content ?? '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // もし ```json … ``` に包まれていた場合の救済
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      parsed = start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : { outfits: [] };
    }

    const safe = sanitize(parsed);
    if (!safe.outfits.length) {
      // 返却が空ならサンプルで補完（UXを止めない）
      return NextResponse.json(mockOutfits({ style, colors, budget, occasion }));
    }
    return NextResponse.json(safe);
  } catch (err: any) {
    // APIエラーなどはクライアントで表示できるよう詳細を返す
    return errorJSON('Failed to get recommendations from AI.', err?.message ?? err);
  }
}

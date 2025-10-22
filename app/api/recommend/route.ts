// app/api/recommend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export const runtime = 'nodejs';

// ---- helpers ----
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

function mockOutfits(input: { style: string; colors: string; budget: string; occasion: string }) {
  const base = (name: string, vibe: string, items: string[], col: string[], occ: string, price: string) => ({
    name,
    vibe,
    items,
    colors: col,
    accessories: ['simple earrings', 'leather mini shoulder'],
    occasion: occ,
    price_range: price,
    caption: `Tried a ${vibe} look! #ootd #style #fashion`,
    prompt: `full-body fashion model, studio backdrop, soft key light, natural pose; wearing ${items.join(
      ', '
    )} in ${col.join(', ')}; ${vibe} style`,
  });
  const c = input.colors || 'black, beige, white';
  const cols = c.split(/[、,]/).map((s) => s.trim()).filter(Boolean);
  const occ = input.occasion || 'dinner';
  const price = input.budget || '¥10,000–¥20,000';

  return {
    outfits: [
      base('Smart casual set', 'clean & modern', ['tailored blazer', 'silk-like blouse', 'straight trousers', 'pumps'], cols.slice(0, 3), occ, price),
      base('Relaxed weekend', 'cozy chic', ['knit cardigan', 'boat-neck tee', 'satin skirt', 'ballet flats'], cols.slice(0, 3), occ, price),
      base('Monotone mode', 'minimal mode', ['boxy jacket', 'tucked top', 'tapered pants', 'chunky loafers'], cols.slice(0, 3), occ, price),
    ],
  };
}

function extractJSON(text: string) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s >= 0 && e > s) return text.slice(s, e + 1);
  return text;
}

async function chatJSON(messages: { role: 'system' | 'user'; content: string }[]) {
  const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']; // 段階的フォールバック
  let lastErr: any;
  for (const model of models) {
    try {
      const c = await openai.chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 900,
      });
      const text = c.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(extractJSON(text));
      return { parsed, modelUsed: model };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ---- API ----
export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // 200でサンプルを返す（UIを止めない）
      return NextResponse.json({
        ...mockOutfits({ style: '', colors: '', budget: '', occasion: '' }),
        warning: 'OPENAI_API_KEY is not set. Returned sample outfits.',
      });
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

    // OpenAI 呼び出し（失敗したら catch でサンプル）
    const { parsed, modelUsed } = await chatJSON([
      { role: 'system', content: systemText },
      { role: 'user', content: userText },
    ]);

    const safe = sanitize(parsed);
    if (!safe.outfits.length) {
      return NextResponse.json({
        ...mockOutfits({ style, colors, budget, occasion }),
        warning: 'AI returned empty. Showing sample outfits.',
        modelUsed,
      });
    }
    return NextResponse.json(safe);
  } catch (err: any) {
    // どんな失敗でも 200 + サンプルで返す（フロントは失敗表示にならない）
    const message = typeof err?.message === 'string' ? err.message : String(err);
    return NextResponse.json({
      ...mockOutfits({ style: '', colors: '', budget: '', occasion: '' }),
      warning: `AI call failed. Showing sample outfits. Detail: ${message}`,
    });
  }
}

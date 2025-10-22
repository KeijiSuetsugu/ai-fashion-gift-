import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

type Outfit = {
  name: string;
  vibe: string;
  items: string[];
  colors: string[];
  accessories?: string[];
  occasion: string;
  price_range: string;
  caption: string;
  prompt: string;
};
type OutfitList = { outfits: Outfit[] };

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content ?? '{}';

    let data: OutfitList;
    try {
      data = JSON.parse(text) as OutfitList;
    } catch {
      data = { outfits: [] };
    }

    // 念のため最低限の検証
    if (!Array.isArray(data.outfits)) data.outfits = [];
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
}

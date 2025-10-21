import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

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

Return 3 outfits only.
`.trim();

    const resp = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: [{ type: 'text', text: systemText }] },
        { role: 'user',   content: [{ type: 'text', text: userText }] },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'OutfitList',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              outfits: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    vibe: { type: 'string' },
                    items: { type: 'array', items: { type: 'string' } },
                    colors:{ type: 'array', items: { type: 'string' } },
                    accessories:{ type: 'array', items: { type: 'string' } },
                    occasion:{ type: 'string' },
                    price_range:{ type: 'string' },
                    caption:{ type: 'string' },
                    prompt:{ type: 'string' }
                  },
                  required: ['name','vibe','items','colors','occasion','price_range','caption','prompt']
                }
              }
            },
            required: ['outfits']
          },
          strict: true
        }
      }
    });

    const jsonText = resp.output_text ?? '{}';
    let data: any;
    try { data = JSON.parse(jsonText); } catch { data = { outfits: [] }; }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
}

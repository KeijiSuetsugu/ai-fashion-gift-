import { NextRequest, NextResponse } from 'next/server';
type: 'object',
properties: {
outfits: {
type: 'array',
items: {
type: 'object',
properties: {
name: { type: 'string' },
vibe: { type: 'string' },
items: { type: 'array', items: { type: 'string' } },
colors: { type: 'array', items: { type: 'string' } },
accessories: { type: 'array', items: { type: 'string' } },
occasion: { type: 'string' },
price_range: { type: 'string' },
caption: { type: 'string' },
prompt: { type: 'string' },
},
required: ['name','vibe','items','colors','occasion','price_range','caption','prompt']
}
}
},
required: ['outfits'],
additionalProperties: false
}
} as const;


const user = `
条件:
- 年齢の目安: ${age}
- スタイル: ${style}
- サイズ: ${sizes}
- 好きな色: ${colors}
- 予算めやす: ${budget}
- シーン: ${occasion}
- 特記事項: ${notes}


返答要件:
- トップス/ボトム/アウター/靴/バッグ/アクセの構成で3案
- カラー配色も明記
- 価格帯はざっくり
- Instagram向けの短いキャプションも用意（#を3〜6個、絵文字可）
- 画像生成用の英語プロンプトも付ける（camera angle/lighting/setting/poseを含める）
例: "full-body fashion model, clean studio backdrop, soft key light, natural pose, wearing ..."
`;


const response = await openai.responses.create({
model: 'gpt-4o-mini',
input: [
{ role: 'system', content: system },
{ role: 'user', content: user }
],
response_format: {
type: 'json_schema',
json_schema: { name: schema.name, schema: schema.schema, strict: true }
}
});


const text = response.output_text || '{}';
let data: any = {};
try { data = JSON.parse(text); } catch {}
return NextResponse.json(data);
}

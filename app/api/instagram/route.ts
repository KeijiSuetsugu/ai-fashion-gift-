import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest){
const token = process.env.IG_ACCESS_TOKEN;
const userId = process.env.IG_USER_ID;
if(!token || !userId){
return NextResponse.json({ error: 'Instagram not configured. Provide IG_ACCESS_TOKEN and IG_USER_ID.' }, { status: 400 });
}
const { image_url, caption } = await req.json();


// 1) コンテナ作成（公開URLの画像が必要）
const createRes = await fetch(`https://graph.facebook.com/v21.0/${userId}/media?image_url=${encodeURIComponent(image_url)}&caption=${encodeURIComponent(caption)}&access_token=${token}`, { method:'POST' });
const createJson = await createRes.json();
if(!createRes.ok){ return NextResponse.json({ error: createJson }, { status: 400 }); }


// 2) 公開
const publishRes = await fetch(`https://graph.facebook.com/v21.0/${userId}/media_publish?creation_id=${createJson.id}&access_token=${token}`, { method:'POST' });
const publishJson = await publishRes.json();
if(!publishRes.ok){ return NextResponse.json({ error: publishJson }, { status: 400 }); }


return NextResponse.json({ ok:true, published: publishJson });
}

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
      'Return ONLY JSON that matches the schema. Each outfit must include: name, vibe, items (array), colors (array), accessories (array), occasion, pric

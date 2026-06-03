import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from('families')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/families]', error);
    return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin()
      .from('families')
      .insert({
        name:        body.name.trim(),
        description: body.description || null,
        updated_at:  new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[POST /api/families]', error);
    return NextResponse.json({ error: 'Failed to create family' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin()
      .from('families')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/families/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch family' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { data, error } = await supabaseAdmin()
      .from('families')
      .update({
        ...(body.name        !== undefined && { name:        body.name.trim() }),
        ...(body.description !== undefined && { description: body.description || null }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[PATCH /api/families/[id]]', error);
    return NextResponse.json({ error: 'Failed to update family' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin()
      .from('families')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/families/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete family' }, { status: 500 });
  }
}

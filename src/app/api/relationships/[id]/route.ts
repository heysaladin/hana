import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin()
      .from('relationships')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/relationships/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete relationship' }, { status: 500 });
  }
}

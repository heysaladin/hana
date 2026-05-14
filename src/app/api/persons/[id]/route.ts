import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin()
      .from('persons')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/persons/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { data, error } = await supabaseAdmin()
      .from('persons')
      .update({
        name:                   body.name?.trim(),
        nickname:               body.nickname || null,
        honorific:              body.honorific || null,
        gender:                 body.gender || null,
        birth_date:             body.birth_date || null,
        is_dead:                body.is_dead ?? false,
        death_date:             body.death_date || null,
        photo_url:              body.photo_url || null,
        additional_information: body.additional_information || null,
        address_short:          body.address_short || null,
        age:                    body.age != null && body.age !== '' ? Number(body.age) : null,
        order_index:            body.order_index != null ? Number(body.order_index) : undefined,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[PATCH /api/persons/[id]]', error);
    return NextResponse.json({ error: 'Failed to update person' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin()
      .from('persons')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/persons/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}

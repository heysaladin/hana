import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from('persons')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/persons]', error);
    return NextResponse.json({ error: 'Failed to fetch persons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin()
      .from('persons')
      .insert({
        name:                   body.name.trim(),
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
        order_index:            body.order_index != null ? Number(body.order_index) : 0,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[POST /api/persons]', error);
    return NextResponse.json({ error: 'Failed to create person' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const familyId = request.nextUrl.searchParams.get('family_id');
    if (familyId) {
      const { data: familyPersons, error: pErr } = await supabaseAdmin()
        .from('persons')
        .select('id')
        .eq('family_id', familyId);
      if (pErr) throw pErr;
      const ids = (familyPersons ?? []).map(p => p.id);
      if (ids.length === 0) return NextResponse.json([]);
      const { data, error } = await supabaseAdmin()
        .from('relationships')
        .select('*')
        .in('person1_id', ids)
        .in('person2_id', ids)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return NextResponse.json(data);
    }
    const { data, error } = await supabaseAdmin()
      .from('relationships')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/relationships]', error);
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.person1_id || !body.person2_id || !body.relationship_type) {
      return NextResponse.json({ error: 'person1_id, person2_id and relationship_type are required' }, { status: 400 });
    }
    if (body.person1_id === body.person2_id) {
      return NextResponse.json({ error: 'Cannot create relationship with self' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin()
      .from('relationships')
      .insert({
        person1_id:        body.person1_id,
        person2_id:        body.person2_id,
        relationship_type: body.relationship_type,
        updated_at:        new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[POST /api/relationships]', error);
    return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 });
  }
}

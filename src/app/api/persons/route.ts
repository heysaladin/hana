import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const persons = await prisma.person.findMany({
      orderBy: { created_at: 'asc' },
    });
    return NextResponse.json(persons);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[GET /api/persons]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const person = await prisma.person.create({
      data: {
        name: body.name,
        nickname: body.nickname || null,
        honorific: body.honorific || null,
        gender: body.gender || null,
        birth_date: body.birth_date ? new Date(body.birth_date) : null,
        is_dead: body.is_dead || false,
        death_date: body.death_date ? new Date(body.death_date) : null,
        photo_url: body.photo_url || null,
        additional_information: body.additional_information || null,
        order_index: body.order_index != null ? Number(body.order_index) : 0,
      },
    });
    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/persons]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

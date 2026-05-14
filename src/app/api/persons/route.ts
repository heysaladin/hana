import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const persons = await prisma.person.findMany({ orderBy: { created_at: 'asc' } });
  return NextResponse.json(persons);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const person = await prisma.person.create({
    data: {
      name:                   body.name.trim(),
      nickname:               body.nickname || null,
      honorific:              body.honorific || null,
      gender:                 body.gender || null,
      birth_date:             body.birth_date ? new Date(body.birth_date) : null,
      is_dead:                body.is_dead ?? false,
      death_date:             body.death_date ? new Date(body.death_date) : null,
      photo_url:              body.photo_url || null,
      additional_information: body.additional_information || null,
      address_short:          body.address_short || null,
      age:                    body.age != null && body.age !== '' ? Number(body.age) : null,
      order_index:            body.order_index != null ? Number(body.order_index) : 0,
    },
  });

  return NextResponse.json(person, { status: 201 });
}

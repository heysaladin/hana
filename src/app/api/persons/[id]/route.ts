import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(person);
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();

  const person = await prisma.person.update({
    where: { id },
    data: {
      name:                   body.name?.trim(),
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
      order_index:            body.order_index != null ? Number(body.order_index) : undefined,
    },
  });

  return NextResponse.json(person);
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

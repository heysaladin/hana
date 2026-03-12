import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const person = await prisma.person.findUnique({ where: { id: params.id } });
    if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(person);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const person = await prisma.person.update({
      where: { id: params.id },
      data: {
        name: body.name,
        nickname: body.nickname || null,
        honorific: body.honorific || null,
        gender: body.gender || null,
        birth_date: body.birth_date ? new Date(body.birth_date) : null,
        is_dead: body.is_dead ?? false,
        death_date: body.death_date ? new Date(body.death_date) : null,
        photo_url: body.photo_url || null,
        additional_information: body.additional_information || null,
        order_index: body.order_index != null ? Number(body.order_index) : undefined,
      },
    });
    return NextResponse.json(person);
  } catch {
    return NextResponse.json({ error: 'Failed to update person' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.person.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}

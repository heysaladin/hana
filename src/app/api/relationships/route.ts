import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const relationships = await prisma.relationship.findMany({ orderBy: { created_at: 'asc' } });
  return NextResponse.json(relationships);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.person1_id || !body.person2_id || !body.relationship_type) {
    return NextResponse.json({ error: 'person1_id, person2_id and relationship_type are required' }, { status: 400 });
  }

  if (body.person1_id === body.person2_id) {
    return NextResponse.json({ error: 'Cannot create relationship with self' }, { status: 400 });
  }

  const relationship = await prisma.relationship.create({
    data: {
      person1_id:        body.person1_id,
      person2_id:        body.person2_id,
      relationship_type: body.relationship_type,
    },
  });

  return NextResponse.json(relationship, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const relationships = await prisma.relationship.findMany({
      orderBy: { created_at: 'asc' },
    });
    return NextResponse.json(relationships);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const relationship = await prisma.relationship.create({
      data: {
        person1_id: body.person1_id,
        person2_id: body.person2_id,
        relationship_type: body.relationship_type,
      },
    });
    return NextResponse.json(relationship, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await prisma.relationship.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

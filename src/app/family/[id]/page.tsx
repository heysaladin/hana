import FamilyTree from '@/components/FamilyTree';

export default async function FamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FamilyTree familyId={id} />;
}

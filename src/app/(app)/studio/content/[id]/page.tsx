import { ContentDetail } from "@/components/studio";

interface ContentPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudioContentRoute({ params }: ContentPageProps) {
  const { id } = await params;
  return <ContentDetail pieceId={id} />;
}

import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/modules/legal";
import { getCurrentLegalRelease } from "@/server/legal";

interface Props {
	params: Promise<{ slug: string }>;
}

export default async function LegalDocumentRoute({ params }: Props) {
	const { slug } = await params;
	const release = await getCurrentLegalRelease();
	const document = release.documents.find((doc) => doc.key === slug);

	if (!document) {
		notFound();
	}

	return <LegalDocumentPage document={document} />;
}

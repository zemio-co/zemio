import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/modules/legal";
import {
	getCurrentLegalRelease,
	getImprint,
	IMPRINT_DOCUMENT_KEY,
} from "@/server/legal";

interface Props {
	params: Promise<{ slug: string }>;
}

export default async function LegalDocumentRoute({ params }: Props) {
	const { slug } = await params;
	const document =
		slug === IMPRINT_DOCUMENT_KEY
			? await getImprint()
			: (await getCurrentLegalRelease()).documents.find((doc) => doc.key === slug);

	if (!document) {
		notFound();
	}

	return <LegalDocumentPage document={document} />;
}

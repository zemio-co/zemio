import { RejectUpload, type Router, route } from "@better-upload/server";
import { custom } from "@better-upload/server/clients";
import { env } from "@/env";
import { auth } from "@/server/better-auth";

// Get configuration values
const storageHost = env.STORAGE_HOST;
const storageRegion = env.STORAGE_REGION;
const storageBucket = env.STORAGE_BUCKET;
const storageSecure = env.STORAGE_SECURE;
const storageForcePathStyle = env.STORAGE_FORCE_PATH_STYLE;
const maxFileSize = 5 * 1024 * 1024;
const maxFiles = 5;

function getFileExtension(filename: string): string {
	const lastDotIndex = filename.lastIndexOf(".");
	const hasExtension = lastDotIndex > 0 && lastDotIndex < filename.length - 1;

	if (!hasExtension) {
		return "";
	}

	return filename.slice(lastDotIndex + 1).toLowerCase();
}

const s3 = custom({
	host: storageHost,
	accessKeyId: env.STORAGE_ACCESS_KEY_ID,
	secretAccessKey: env.STORAGE_ACCESS_KEY,
	region: storageRegion,
	secure: storageSecure,
	forcePathStyle: storageForcePathStyle,
});

export const router: Router = {
	client: s3,
	bucketName: storageBucket,
	routes: {
		attachments: route({
			multipleFiles: true,
			maxFiles: maxFiles,
			maxFileSize: maxFileSize,
			async onBeforeUpload({ req }) {
				const session = await auth.api.getSession({
					headers: req.headers,
				});

				if (!session?.user) {
					throw new RejectUpload("Unauthorized");
				}

				const orgId = session.session.activeOrganizationId;
				if (!orgId) {
					throw new RejectUpload("No active organization");
				}

				return {
					generateObjectInfo: ({ file }) => {
						const extension = getFileExtension(file.name);
						const uniqueFilename = extension
							? `${crypto.randomUUID()}.${extension}`
							: crypto.randomUUID();

						return {
							key: `attachment/${orgId}/${uniqueFilename}`,
						};
					},
				};
			},
		}),
	},
};

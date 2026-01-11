import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

const isProduction = process.env.NODE_ENV === "production";

let s3Client: S3Client | null = null;

if (isProduction && region && accessKeyId && secretAccessKey) {
    s3Client = new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

/**
 * Uploads a file to local storage or S3.
 * Local path: public/media/[random-id]/[filename]
 * S3 Path: [folder]/[random-id]/[filename]
 */
export async function uploadFile(file: File, folder: string = "profiles"): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const randomId = uuidv4();
    const cleanFileName = file.name.replace(/\s+/g, "-");

    // For both environments, we use a random ID to ensure isolation
    const relativeKey = `${folder}/${randomId}/${cleanFileName}`;

    if (isProduction && s3Client && bucketName) {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: relativeKey,
                Body: buffer,
                ContentType: file.type,
            },
        });

        await upload.done();
        return `https://${bucketName}.s3.${region}.amazonaws.com/${relativeKey}`;
    } else {
        // Local storage for development: public/media/[randomId]/[fileName]
        // We put the folder name as part of the random ID segment to keep it descriptive but flat under /media
        const baseMediaDir = "media";
        const localRelativePath = `${baseMediaDir}/${folder}-${randomId}`;
        const uploadsDir = path.join(process.cwd(), "public", localRelativePath);

        try {
            await fs.access(uploadsDir);
        } catch {
            await fs.mkdir(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, cleanFileName);
        await fs.writeFile(filePath, buffer);

        return `/${localRelativePath}/${cleanFileName}`;
    }
}

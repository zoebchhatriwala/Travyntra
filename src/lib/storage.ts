
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Retrieve the AWS region from environment variables
const region = process.env.AWS_REGION;

// Retrieve the AWS access key ID from environment variables
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;

// Retrieve the AWS secret access key from environment variables
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Retrieve the AWS S3 bucket name from environment variables
const bucketName = process.env.AWS_S3_BUCKET_NAME;

// Retrieve the current node environment
const nodeEnv = process.env.NODE_ENV;

// Determine if the application is running in production mode
const isProduction = nodeEnv === "production";

// Initialize the S3 client variable
let s3Client: S3Client | null = null;

// Check if production environment and AWS credentials are provided
const hasRegion = !!region;
const hasAccessKey = !!accessKeyId;
const hasSecret = !!secretAccessKey;
const hasAwsCreds = hasRegion && hasAccessKey && hasSecret;

// If in production and credentials are valid
if (isProduction) {
    // Further check for credentials
    if (hasAwsCreds) {
        // Configuration for S3 credentials
        const credentials = {
            accessKeyId: accessKeyId as string,
            secretAccessKey: secretAccessKey as string,
        };

        // Configuration for the S3 client
        const s3Config = {
            region: region as string,
            credentials,
        };

        // Create a new S3 client instance
        s3Client = new S3Client(s3Config);
    }
}

/**
 * Uploads a file to local storage or S3.
 * Local path: public/media/[random-id]/[filename]
 * S3 Path: [folder]/[random-id]/[filename]
 * 
 * @param {File} file - The file object to be uploaded.
 * @param {string} [folder="profiles"] - The directory or folder name in the storage system.
 * @returns {Promise<string>} The URL or path to the uploaded file.
 */
export async function uploadFile(file: File, folder: string = "profiles"): Promise<string> {
    // Get the array buffer from the file
    const arrayBuffer = await file.arrayBuffer();

    // Convert the array buffer to a Node.js Buffer
    const buffer = Buffer.from(arrayBuffer);

    // Generate a unique identifier for the file upload
    const randomId = uuidv4();

    // Retrieve the original filename
    const originalName = file.name;

    // Replace whitespace characters with hyphens to create a clean filename
    const cleanFileName = originalName.replace(/\s+/g, "-");

    // Construct the relative path or key for the storage system
    const relativeKey = `${folder}/${randomId}/${cleanFileName}`;

    // Check if the file should be uploaded to S3
    const hasS3Client = !!s3Client;
    const hasBucket = !!bucketName;
    const useS3 = isProduction && hasS3Client && hasBucket;

    // If S3 upload is enabled
    if (useS3) {
        // Parameters for the S3 upload operation
        const uploadParams = {
            Bucket: bucketName as string,
            Key: relativeKey,
            Body: buffer,
            ContentType: file.type,
        };

        // Configuration for the S3 upload helper
        const uploadOptions = {
            client: s3Client as S3Client,
            params: uploadParams,
        };

        // Initialize the S3 upload process
        const upload = new Upload(uploadOptions);

        // Wait for the upload to complete
        await upload.done();

        // Construct the S3 public URL
        const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${relativeKey}`;

        // Return the S3 URL
        return s3Url;
    } else {
        // Local storage for development: public/media/[randomId]/[fileName]
        const baseMediaDir = "media";

        // Construct a unique local directory segment
        const localDirSegment = `${folder}-${randomId}`;

        // Construct the relative path for local storage
        const localRelativePath = `${baseMediaDir}/${localDirSegment}`;

        // Get the current working directory
        const cwd = process.cwd();

        // Target directory for the upload in the public folder
        const uploadsDir = path.join(cwd, "public", localRelativePath);

        try {
            // Check if the directory already exists
            await fs.access(uploadsDir);
        } catch {
            // Config for directory creation
            const mkdirOptions = { recursive: true };
            // Create the directory recursively if it does not exist
            await fs.mkdir(uploadsDir, mkdirOptions);
        }

        // Construct the full file path for local storage
        const filePath = path.join(uploadsDir, cleanFileName);

        // Write the buffer to the local filesystem
        await fs.writeFile(filePath, buffer);

        // Construct the relative URL for the local file
        const localUrl = `/${localRelativePath}/${cleanFileName}`;

        // Return the local URL
        return localUrl;
    }
}

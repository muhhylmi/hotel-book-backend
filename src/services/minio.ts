import { Client } from 'minio';

const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'ACCESSKEY',
    secretKey: process.env.MINIO_SECRET_KEY || 'SECRETKEY'
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'hotel-images';

export async function initializeBucket() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');

            // Set bucket policy to allow public read access
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
                    }
                ]
            };

            await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
        }
    } catch (error) {
        console.error('Error initializing MinIO bucket:', error);
    }
}

export async function uploadImage(file: Buffer, fileName: string, contentType: string): Promise<string> {
    try {
        const objectName = `${Date.now()}-${fileName}`;

        await minioClient.putObject(BUCKET_NAME, objectName, file, file.length, {
            'Content-Type': contentType
        });

        // Return the public URL
        const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
        const port = process.env.MINIO_PORT !== '80' && process.env.MINIO_PORT !== '443'
            ? `:${process.env.MINIO_PORT}`
            : '';

        return `${protocol}://${process.env.MINIO_ENDPOINT}${port}/${BUCKET_NAME}/${objectName}`;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image');
    }
}

export async function deleteImage(imageUrl: string): Promise<void> {
    try {
        // Extract object name from URL
        const urlParts = imageUrl.split('/');
        const objectName = urlParts[urlParts.length - 1];

        await minioClient.removeObject(BUCKET_NAME, objectName);
    } catch (error) {
        console.error('Error deleting image:', error);
    }
}
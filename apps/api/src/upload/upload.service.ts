import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

/**
 * Upload service for Cloudflare R2 (S3-compatible object storage).
 *
 * In Phase 1, this is a stub that returns a placeholder URL.
 * Full R2 integration requires the @aws-sdk/client-s3 package
 * and valid R2 credentials.
 *
 * To enable R2 uploads:
 *   1. pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *   2. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env
 *   3. Replace the stub methods with real S3 client calls
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.bucketName = this.config.get<string>('R2_BUCKET_NAME', 'hotel-photos');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '');
    this.isConfigured = !!(
      this.config.get<string>('R2_ACCOUNT_ID') &&
      this.config.get<string>('R2_ACCESS_KEY_ID') &&
      this.config.get<string>('R2_SECRET_ACCESS_KEY')
    );

    if (!this.isConfigured) {
      this.logger.warn(
        'R2 not configured — uploads will return placeholder URLs. ' +
          'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env to enable.',
      );
    }
  }

  /**
   * Generate a pre-signed upload URL for direct client-to-R2 uploads.
   * The frontend uploads the file directly to R2, bypassing the API server.
   *
   * @returns { uploadUrl, fileUrl, fileId }
   */
  async getUploadUrl(
    hostId: string,
    fileType: string,
    folder: 'rooms' | 'properties' | 'avatars',
  ) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      throw new BadRequestException(
        `File type ${fileType} not allowed. Accepted: ${allowedTypes.join(', ')}`,
      );
    }

    const fileId = `${folder}/${hostId}/${randomUUID()}`;
    const extension = fileType.split('/')[1];
    const key = `${fileId}.${extension}`;

    if (!this.isConfigured) {
      // Return a placeholder when R2 is not configured
      const placeholderUrl = `https://placehold.co/800x600/e7e5e4/78716c?text=${encodeURIComponent(folder)}`;
      return {
        uploadUrl: null, // Frontend should skip direct upload
        fileUrl: placeholderUrl,
        fileId: key,
        isStub: true,
      };
    }

    // ── Real R2 pre-signed URL generation ─────────────────────────────
    // TODO: Implement when R2 credentials are configured
    //
    // const s3 = new S3Client({
    //   region: 'auto',
    //   endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    //   credentials: {
    //     accessKeyId: R2_ACCESS_KEY_ID,
    //     secretAccessKey: R2_SECRET_ACCESS_KEY,
    //   },
    // });
    //
    // const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
    //   Bucket: this.bucketName,
    //   Key: key,
    //   ContentType: fileType,
    // }), { expiresIn: 300 }); // 5 minutes

    const fileUrl = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucketName}.r2.dev/${key}`;

    return {
      uploadUrl: null, // TODO: Replace with real pre-signed URL
      fileUrl,
      fileId: key,
      isStub: true,
    };
  }

  /**
   * Delete a file from R2.
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(`R2 not configured, skipping delete: ${fileId}`);
      return;
    }

    // TODO: Implement when R2 credentials are configured
    this.logger.log(`Deleted file: ${fileId}`);
  }
}

import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface GetUploadUrlDto {
  fileType: string;
  folder: 'rooms' | 'properties' | 'avatars';
}

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Get a pre-signed URL for direct client-to-R2 upload.
   *
   * POST /api/v1/upload/url
   * Body: { fileType: "image/jpeg", folder: "rooms" }
   *
   * Returns: { uploadUrl, fileUrl, fileId }
   *
   * Flow:
   * 1. Frontend calls this endpoint to get a pre-signed URL
   * 2. Frontend uploads the file directly to R2 using the URL
   * 3. Frontend saves the fileUrl to the room/property
   */
  @Post('url')
  async getUploadUrl(
    @CurrentUser('sub') hostId: string,
    @Body() dto: GetUploadUrlDto,
  ) {
    const result = await this.uploadService.getUploadUrl(
      hostId,
      dto.fileType,
      dto.folder,
    );
    return { success: true, data: result };
  }
}

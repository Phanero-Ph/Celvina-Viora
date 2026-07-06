import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const uploadRoot = join(process.cwd(), 'uploads');

@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!file.mimetype?.startsWith('image/')) {
        callback(new BadRequestException('Only image uploads are allowed'), false);
        return;
      }
      callback(null, true);
    },
  }))
  uploadImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!existsSync(uploadRoot)) {
      mkdirSync(uploadRoot, { recursive: true });
    }

    const extension = extname(file.originalname || '').toLowerCase() || '.jpg';
    const filename = `${randomUUID()}${extension}`;
    const fullPath = join(uploadRoot, filename);
    writeFileSync(fullPath, file.buffer);

    return {
      url: `http://localhost:3001/uploads/${filename}`,
      filename,
      originalName: file.originalname,
      size: file.size,
    };
  }
}

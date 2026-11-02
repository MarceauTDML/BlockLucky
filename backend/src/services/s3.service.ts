import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.config';
import logger from '../utils/logger.util';

export class S3Service {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: env.AWS_REGION,
      endpoint: env.AWS_S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  public async uploadFile(
    key: string,
    body: Buffer | string,
    contentType = 'application/octet-stream'
  ): Promise<{ key: string; url: string }> {
    try {
      if (env.NODE_ENV !== 'test') {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: env.AWS_S3_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
          })
        );
      }
    } catch (error) {
      logger.warn(`S3 upload fallback local pour ${key}`, { error });
    }
    return {
      key,
      url: `${env.AWS_S3_ENDPOINT}/${env.AWS_S3_BUCKET}/${key}`,
    };
  }

  public async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    } catch {
      return `${env.AWS_S3_ENDPOINT}/${env.AWS_S3_BUCKET}/${key}?expires=${expiresInSeconds}`;
    }
  }
}

export const s3Service = new S3Service();
export default s3Service;

import express, { NextFunction, Request, Response } from 'express';

export const IDENTITY_UPLOAD_BODY_LIMIT = '12mb';
const DEFAULT_BODY_LIMIT = '1mb';
const IDENTITY_UPLOAD_PATH = /^\/api\/(v1\/)?user\/identity\/?$/;
const WEBHOOK_PATH = /^\/api\/(v1\/)?webhooks\//;

const defaultJsonParser = express.json({
  limit: DEFAULT_BODY_LIMIT,
  verify: (req, _res, buf) => {
    const url = (req as Request).originalUrl ?? '';
    if (WEBHOOK_PATH.test(url)) (req as Request).rawBody = Buffer.from(buf);
  },
});

export const isIdentityUpload = (req: Request): boolean =>
  req.method === 'POST' && IDENTITY_UPLOAD_PATH.test(req.path);

export const globalJsonParser = (req: Request, res: Response, next: NextFunction): void => {
  if (isIdentityUpload(req)) {
    next();
    return;
  }
  defaultJsonParser(req, res, next);
};

export const identityUploadJsonParser = express.json({ limit: IDENTITY_UPLOAD_BODY_LIMIT });

export const globalUrlencodedParser = express.urlencoded({ extended: true, limit: DEFAULT_BODY_LIMIT });

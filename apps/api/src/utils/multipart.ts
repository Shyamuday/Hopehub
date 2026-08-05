import Busboy from 'busboy';
import type { Request } from 'express';

export type MultipartFile = {
  fieldName: string;
  fileName: string | null;
  mimeType: string;
  buffer: Buffer;
  byteSize: number;
};

export type MultipartForm = {
  fields: Record<string, string>;
  file: MultipartFile | null;
};

export function isMultipartRequest(req: Request) {
  return String(req.headers['content-type'] || '')
    .toLowerCase()
    .startsWith('multipart/form-data');
}

export function parseMultipartForm(req: Request, options: { maxFileBytes: number }) {
  return new Promise<MultipartForm>((resolve, reject) => {
    const fields: Record<string, string> = {};
    let file: MultipartFile | null = null;
    let rejected = false;

    const parser = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: options.maxFileBytes,
        fields: 20,
        parts: 25
      }
    });

    parser.on('field', (name, value) => {
      fields[name] = value;
    });

    parser.on('file', (fieldName, stream, info) => {
      const chunks: Buffer[] = [];
      let byteSize = 0;
      let limited = false;

      stream.on('data', (chunk: Buffer) => {
        byteSize += chunk.length;
        chunks.push(chunk);
      });

      stream.on('limit', () => {
        limited = true;
        rejected = true;
        reject(new Error('FILE_TOO_LARGE'));
      });

      stream.on('end', () => {
        if (limited || rejected) return;
        file = {
          fieldName,
          fileName: info.filename || null,
          mimeType: info.mimeType,
          buffer: Buffer.concat(chunks),
          byteSize
        };
      });
    });

    parser.on('error', (error) => {
      rejected = true;
      reject(error);
    });

    parser.on('finish', () => {
      if (rejected) return;
      resolve({ fields, file });
    });

    req.pipe(parser);
  });
}

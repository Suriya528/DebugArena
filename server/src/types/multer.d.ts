import { RequestHandler } from 'express';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination?: string;
        filename?: string;
        path?: string;
        buffer?: Buffer;
      }
    }

    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

declare module 'multer' {
  namespace multer {
    type File = Express.Multer.File;

    interface StorageEngine {
      _handleFile(req: any, file: any, cb: any): void;
      _removeFile(req: any, file: any, cb: any): void;
    }

    interface Options {
      dest?: string;
      storage?: StorageEngine;
      limits?: {
        fieldNameSize?: number;
        fieldSize?: number;
        fields?: number;
        fileSize?: number;
        files?: number;
        parts?: number;
        headerPairs?: number;
      };
      fileFilter?(req: any, file: any, cb: any): void;
    }

    interface Instance {
      single(fieldName: string): RequestHandler;
      array(fieldName: string, maxCount?: number): RequestHandler;
      fields(fields: any[]): RequestHandler;
      none(): RequestHandler;
      any(): RequestHandler;
    }

    function memoryStorage(): StorageEngine;
    function diskStorage(options?: any): StorageEngine;
  }

  function multer(options?: multer.Options): multer.Instance;

  export default multer;
  export = multer;
}

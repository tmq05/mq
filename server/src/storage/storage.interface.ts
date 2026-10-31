export interface StorageProvider {
  uploadFile(file: Express.Multer.File, subFolder: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
}

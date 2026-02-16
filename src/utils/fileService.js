// services/fileService.js
import { createClient } from "@supabase/supabase-js";
import mime from 'mime-types';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class FileService {
  constructor() {
    this.bucketName = 'chat-attachments';
  }

  async uploadFile(file, userId, chatId) {
    try {
      const fileExt = mime.extension(file.mimetype);
      const fileName = `${userId}/${chatId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        path: fileName,
        mimeType: file.mimetype,
        fileName: file.originalname,
        size: file.size
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  async deleteFile(filePath) {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return 'document';
    return 'other';
  }
}

export default new FileService();
import * as fs from 'fs-extra';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { Readable } from 'stream';

export class FileService {
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.resolve(filePath);
      const dir = path.dirname(fullPath);
      
      await fs.ensureDir(dir);
      await fs.writeFile(fullPath, content, 'utf8');
      
      console.log(`File written successfully: ${fullPath}`);
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  async extractZip(zipBuffer: ArrayBuffer, extractPath: string): Promise<void> {
    try {
      const fullExtractPath = path.resolve(extractPath);
      await fs.ensureDir(fullExtractPath);
      
      const buffer = Buffer.from(zipBuffer);
      const readable = Readable.from(buffer);
      
      await readable
        .pipe(unzipper.Extract({ path: fullExtractPath }))
        .promise();
      
      console.log(`Zip extracted successfully to: ${fullExtractPath}`);
    } catch (error) {
      console.error(`Error extracting zip to ${extractPath}:`, error);
      throw error;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const items = await fs.readdir(dirPath);
      return items;
    } catch (error) {
      console.error(`Error listing directory ${dirPath}:`, error);
      throw error;
    }
  }
}
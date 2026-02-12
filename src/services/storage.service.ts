/**
 * Storage Service for Local Image Persistence
 *
 * Provides functionality to download and save generated images locally.
 * Ideogram API returns temporary URLs that expire, so this service enables
 * persistent storage of generated images.
 *
 * Features:
 * - Download images from temporary URLs
 * - Save images with unique filenames
 * - Automatic directory creation
 * - Image type detection and proper extensions
 * - Configurable storage directory
 * - Batch download support
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { Logger } from 'pino';

import { config } from '../config/config.js';
import { TIMEOUTS, VALIDATION } from '../config/constants.js';
import {
  createStorageError,
  createDownloadFailedError,
  wrapError,
  IdeogramMCPError,
} from '../utils/error.handler.js';
import { createChildLogger } from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the StorageService.
 */
export interface StorageServiceOptions {
  /**
   * Directory for storing images.
   * @default config.localSaveDir or './ideogram_images'
   */
  storageDir?: string;

  /**
   * Whether local saving is enabled.
   * @default config.enableLocalSave
   */
  enabled?: boolean;

  /**
   * Timeout for image downloads in milliseconds.
   * @default 60000
   */
  downloadTimeoutMs?: number;

  /**
   * Custom logger instance.
   */
  logger?: Logger;
}

/**
 * Result of saving an image locally.
 */
export interface SavedImage {
  /**
   * The absolute path to the saved file.
   */
  filePath: string;

  /**
   * The filename without path.
   */
  filename: string;

  /**
   * Original URL the image was downloaded from.
   */
  originalUrl: string;

  /**
   * Size of the saved file in bytes.
   */
  sizeBytes: number;

  /**
   * Detected MIME type of the image.
   */
  mimeType: string;
}

/**
 * Result of a batch download operation.
 */
export interface BatchSaveResult {
  /**
   * Successfully saved images.
   */
  saved: SavedImage[];

  /**
   * Failed downloads with error information.
   */
  failed: Array<{
    url: string;
    error: string;
  }>;

  /**
   * Total number of images attempted.
   */
  total: number;

  /**
   * Number of successful downloads.
   */
  successCount: number;

  /**
   * Number of failed downloads.
   */
  failureCount: number;
}

/**
 * Options for downloading an image.
 */
export interface DownloadOptions {
  /**
   * Custom filename (without extension). If not provided, generates a unique name.
   */
  filename?: string;

  /**
   * Prefix to add to the filename.
   */
  prefix?: string;

  /**
   * Subdirectory within the storage directory.
   */
  subdir?: string;
}

// =============================================================================
// StorageService Class
// =============================================================================

/**
 * Service for downloading and storing images locally.
 *
 * @example
 * ```typescript
 * const storage = new StorageService();
 *
 * // Download a single image
 * const saved = await storage.downloadImage('https://example.com/image.png');
 * console.log(`Saved to: ${saved.filePath}`);
 *
 * // Download multiple images
 * const results = await storage.downloadImages([
 *   'https://example.com/image1.png',
 *   'https://example.com/image2.png',
 * ]);
 * console.log(`Saved ${results.successCount} of ${results.total} images`);
 * ```
 */
export class StorageService {
  private readonly storageDir: string;
  private readonly enabled: boolean;
  private readonly downloadTimeoutMs: number;
  private readonly log: Logger;
  private initialized: boolean = false;

  /**
   * Creates a new StorageService instance.
   *
   * @param options - Service configuration options
   */
  constructor(options: StorageServiceOptions = {}) {
    this.storageDir = options.storageDir ?? config.localSaveDir ?? './ideogram_images';
    this.enabled = options.enabled ?? config.enableLocalSave ?? true;
    this.downloadTimeoutMs = options.downloadTimeoutMs ?? TIMEOUTS.IMAGE_DOWNLOAD_MS;
    this.log = options.logger ?? createChildLogger('storage');

    this.log.debug(
      { storageDir: this.storageDir, enabled: this.enabled },
      'StorageService initialized'
    );
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Downloads an image from a URL and saves it locally.
   *
   * @param url - The URL to download the image from
   * @param options - Download options
   * @returns Promise resolving to saved image information
   * @throws {IdeogramMCPError} If download or save fails
   *
   * @example
   * ```typescript
   * const result = await storage.downloadImage(
   *   'https://api.ideogram.ai/temp/image.png',
   *   { prefix: 'generated' }
   * );
   * console.log(`Saved: ${result.filename}`);
   * ```
   */
  async downloadImage(url: string, options: DownloadOptions = {}): Promise<SavedImage> {
    if (!this.enabled) {
      throw createStorageError('download', 'Local storage is disabled');
    }

    await this.ensureStorageDirectory(options.subdir);

    const startTime = Date.now();
    this.log.debug({ url }, 'Downloading image');

    try {
      // Download the image
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: this.downloadTimeoutMs,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const buffer = Buffer.from(response.data);

      // Validate size
      if (buffer.length > VALIDATION.IMAGE.MAX_SIZE_BYTES) {
        throw createStorageError(
          'download',
          `Image size ${(buffer.length / (1024 * 1024)).toFixed(2)}MB exceeds maximum 10MB`
        );
      }

      // Detect image type
      const mimeType = this.detectImageType(buffer);
      const extension = this.getExtensionForMimeType(mimeType);

      // Generate filename
      const filename = this.generateFilename(options, extension);

      // Determine full path
      const targetDir = options.subdir
        ? path.join(this.storageDir, options.subdir)
        : this.storageDir;
      const filePath = path.resolve(targetDir, filename);

      // Save the file
      await this.saveFile(filePath, buffer);

      const durationMs = Date.now() - startTime;
      this.log.info({ filename, sizeBytes: buffer.length, durationMs }, 'Image saved successfully');

      return {
        filePath,
        filename,
        originalUrl: url,
        sizeBytes: buffer.length,
        mimeType,
      };
    } catch (error) {
      if (error instanceof IdeogramMCPError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const message = error.response
          ? `HTTP ${error.response.status}: ${error.message}`
          : error.message;
        throw createDownloadFailedError(url, message);
      }

      throw wrapError(error);
    }
  }

  /**
   * Downloads multiple images in parallel.
   *
   * @param urls - Array of URLs to download
   * @param options - Download options applied to all images
   * @returns Promise resolving to batch save result
   *
   * @example
   * ```typescript
   * const results = await storage.downloadImages(
   *   ['https://...', 'https://...'],
   *   { prefix: 'batch' }
   * );
   * if (results.failureCount > 0) {
   *   console.warn(`${results.failureCount} images failed to download`);
   * }
   * ```
   */
  async downloadImages(urls: string[], options: DownloadOptions = {}): Promise<BatchSaveResult> {
    if (!this.enabled) {
      return {
        saved: [],
        failed: urls.map((url) => ({ url, error: 'Local storage is disabled' })),
        total: urls.length,
        successCount: 0,
        failureCount: urls.length,
      };
    }

    const results: BatchSaveResult = {
      saved: [],
      failed: [],
      total: urls.length,
      successCount: 0,
      failureCount: 0,
    };

    // Download all images in parallel
    const downloadPromises = urls.map(async (url, index) => {
      try {
        // Generate unique options for each image
        const imageOptions: DownloadOptions = {
          ...options,
          // Add index to prefix if multiple images
          prefix: options.prefix ? `${options.prefix}_${index + 1}` : `image_${index + 1}`,
        };

        const saved = await this.downloadImage(url, imageOptions);
        return { success: true as const, url, saved };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false as const, url, error: errorMessage };
      }
    });

    const downloadResults = await Promise.all(downloadPromises);

    // Process results
    for (const result of downloadResults) {
      if (result.success) {
        results.saved.push(result.saved);
        results.successCount++;
      } else {
        results.failed.push({ url: result.url, error: result.error });
        results.failureCount++;
      }
    }

    this.log.info(
      {
        total: results.total,
        success: results.successCount,
        failed: results.failureCount,
      },
      'Batch download completed'
    );

    return results;
  }

  /**
   * Saves raw image data to a file.
   *
   * @param data - Image data as Buffer or base64 string
   * @param options - Save options
   * @returns Promise resolving to saved image information
   * @throws {IdeogramMCPError} If save fails
   *
   * @example
   * ```typescript
   * const imageBuffer = Buffer.from(base64Data, 'base64');
   * const result = await storage.saveImage(imageBuffer, { prefix: 'edited' });
   * ```
   */
  async saveImage(data: Buffer | string, options: DownloadOptions = {}): Promise<SavedImage> {
    if (!this.enabled) {
      throw createStorageError('save', 'Local storage is disabled');
    }

    await this.ensureStorageDirectory(options.subdir);

    // Convert string (base64) to buffer
    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;

    // Validate size
    if (buffer.length > VALIDATION.IMAGE.MAX_SIZE_BYTES) {
      throw createStorageError(
        'save',
        `Image size ${(buffer.length / (1024 * 1024)).toFixed(2)}MB exceeds maximum 10MB`
      );
    }

    // Detect image type
    const mimeType = this.detectImageType(buffer);
    const extension = this.getExtensionForMimeType(mimeType);

    // Generate filename
    const filename = this.generateFilename(options, extension);

    // Determine full path
    const targetDir = options.subdir ? path.join(this.storageDir, options.subdir) : this.storageDir;
    const filePath = path.resolve(targetDir, filename);

    // Save the file
    await this.saveFile(filePath, buffer);

    this.log.info({ filename, sizeBytes: buffer.length }, 'Image saved');

    return {
      filePath,
      filename,
      originalUrl: 'local',
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  /**
   * Checks if local storage is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Gets the configured storage directory.
   */
  getStorageDir(): string {
    return path.resolve(this.storageDir);
  }

  /**
   * Checks if a file exists in the storage directory.
   *
   * @param filename - The filename to check
   * @param subdir - Optional subdirectory
   */
  async fileExists(filename: string, subdir?: string): Promise<boolean> {
    const targetDir = subdir ? path.join(this.storageDir, subdir) : this.storageDir;
    const filePath = path.resolve(targetDir, filename);

    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a file from the storage directory.
   *
   * @param filename - The filename to delete
   * @param subdir - Optional subdirectory
   * @returns True if deleted, false if file didn't exist
   */
  async deleteFile(filename: string, subdir?: string): Promise<boolean> {
    const targetDir = subdir ? path.join(this.storageDir, subdir) : this.storageDir;
    const filePath = path.resolve(targetDir, filename);

    try {
      await fs.promises.unlink(filePath);
      this.log.debug({ filename }, 'File deleted');
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw createStorageError('delete', `Failed to delete file: ${filename}`);
    }
  }

  /**
   * Lists files in the storage directory.
   *
   * @param subdir - Optional subdirectory
   * @returns Array of filenames
   */
  async listFiles(subdir?: string): Promise<string[]> {
    const targetDir = subdir ? path.join(this.storageDir, subdir) : this.storageDir;
    const resolvedDir = path.resolve(targetDir);

    try {
      const entries = await fs.promises.readdir(resolvedDir, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw createStorageError('list', 'Failed to list storage directory');
    }
  }

  /**
   * Gets the total size of files in the storage directory.
   *
   * @param subdir - Optional subdirectory
   * @returns Total size in bytes
   */
  async getStorageSize(subdir?: string): Promise<number> {
    const targetDir = subdir ? path.join(this.storageDir, subdir) : this.storageDir;
    const resolvedDir = path.resolve(targetDir);

    try {
      const entries = await fs.promises.readdir(resolvedDir, { withFileTypes: true });
      let totalSize = 0;

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(resolvedDir, entry.name);
          const stats = await fs.promises.stat(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return 0;
      }
      throw createStorageError('size', 'Failed to calculate storage size');
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Ensures the storage directory exists, creating it if necessary.
   */
  private async ensureStorageDirectory(subdir?: string): Promise<void> {
    const targetDir = subdir ? path.join(this.storageDir, subdir) : this.storageDir;
    const resolvedDir = path.resolve(targetDir);

    if (this.initialized && !subdir) {
      return;
    }

    try {
      await fs.promises.mkdir(resolvedDir, { recursive: true });
      if (!subdir) {
        this.initialized = true;
      }
      this.log.debug({ dir: resolvedDir }, 'Storage directory ready');
    } catch (error) {
      throw createStorageError(
        'init',
        `Failed to create storage directory: ${(error as Error).message}`
      );
    }
  }

  /**
   * Saves data to a file.
   */
  private async saveFile(filePath: string, data: Buffer): Promise<void> {
    try {
      await fs.promises.writeFile(filePath, data);
    } catch (error) {
      throw createStorageError('write', `Failed to write file: ${(error as Error).message}`);
    }
  }

  /**
   * Generates a unique filename for an image.
   */
  private generateFilename(options: DownloadOptions, extension: string): string {
    // Use provided filename if available
    if (options.filename) {
      return `${options.filename}.${extension}`;
    }

    // Generate unique filename with timestamp and UUID
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uuid = randomUUID().slice(0, 8);

    if (options.prefix) {
      return `${options.prefix}_${timestamp}_${uuid}.${extension}`;
    }

    return `ideogram_${timestamp}_${uuid}.${extension}`;
  }

  /**
   * Detects the image type from the first few bytes (magic numbers).
   */
  private detectImageType(buffer: Buffer): string {
    if (buffer.length < 4) {
      return 'image/png'; // Default
    }

    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'image/gif';
    }

    // Default to PNG if unknown
    return 'image/png';
  }

  /**
   * Gets the file extension for a MIME type.
   */
  private getExtensionForMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return extensions[mimeType] ?? 'png';
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a new StorageService with default configuration.
 *
 * @param options - Optional service configuration
 * @returns A new StorageService instance
 *
 * @example
 * ```typescript
 * // Using defaults from config
 * const storage = createStorageService();
 *
 * // With custom options
 * const storage = createStorageService({
 *   storageDir: './my-images',
 *   enabled: true,
 * });
 * ```
 */
export function createStorageService(options?: StorageServiceOptions): StorageService {
  return new StorageService(options);
}

/**
 * Creates a storage service with a specific directory.
 * Convenience function for quick setup.
 *
 * @param storageDir - The directory to use for storage
 * @returns A new StorageService instance
 */
export function createStorageServiceWithDir(storageDir: string): StorageService {
  return new StorageService({ storageDir, enabled: true });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats a file size in bytes to a human-readable string.
 *
 * @param bytes - Size in bytes
 * @returns Human-readable size string
 *
 * @example
 * ```typescript
 * formatFileSize(1024);        // "1.00 KB"
 * formatFileSize(1048576);     // "1.00 MB"
 * formatFileSize(1073741824);  // "1.00 GB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Checks if a URL looks like an Ideogram temporary URL.
 *
 * @param url - The URL to check
 * @returns True if the URL appears to be an Ideogram temporary URL
 */
export function isIdeogramTempUrl(url: string): boolean {
  return (
    url.includes('ideogram.ai') || url.includes('ideogram-api') || url.includes('cdn.ideogram')
  );
}

/**
 * Extracts a suggested filename from a URL.
 *
 * @param url - The URL to extract from
 * @returns A suggested filename or undefined if not determinable
 */
export function extractFilenameFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && lastSegment.includes('.')) {
      // Remove query params and return
      return lastSegment.split('?')[0];
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Prediction Store for Local Async Job Queue Management
 *
 * Since the Ideogram API is synchronous only (no native async/webhook endpoints),
 * this service provides a LOCAL implementation for async operations:
 *
 * - Queue jobs internally for background processing
 * - Track job state locally (queued, processing, completed, failed, cancelled)
 * - Execute Ideogram API calls synchronously in background workers
 * - Manage prediction lifecycle and cleanup
 *
 * The `ideogram_generate_async`, `ideogram_get_prediction`, and
 * `ideogram_cancel_prediction` tools use this store for their functionality.
 */

import { randomUUID } from 'crypto';
import type { Logger } from 'pino';

import type {
  Prediction,
  PredictionStatus,
  GenerateRequest,
  GenerateResponse,
  EditResponse,
} from '../types/api.types.js';
import { PREDICTION_QUEUE } from '../config/constants.js';
import {
  createPredictionNotFoundError,
  createInternalError,
  IdeogramMCPError,
} from '../utils/error.handler.js';
import { createChildLogger } from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the PredictionStore.
 */
export interface PredictionStoreOptions {
  /**
   * Maximum number of predictions to keep in the queue.
   * @default 100
   */
  maxQueueSize?: number;

  /**
   * Timeout for individual predictions in milliseconds.
   * @default 300000 (5 minutes)
   */
  predictionTimeoutMs?: number;

  /**
   * Age at which completed/failed predictions are cleaned up (in ms).
   * @default 86400000 (24 hours)
   */
  cleanupAgeMs?: number;

  /**
   * Whether to enable automatic cleanup of old predictions.
   * @default true
   */
  enableAutoCleanup?: boolean;

  /**
   * Interval for automatic cleanup in milliseconds.
   * @default 3600000 (1 hour)
   */
  cleanupIntervalMs?: number;

  /**
   * Custom logger instance.
   */
  logger?: Logger;
}

/**
 * Options for creating a new prediction.
 */
export interface CreatePredictionOptions {
  /**
   * Request parameters for the prediction.
   */
  request: GenerateRequest;

  /**
   * Type of prediction (generate or edit).
   */
  type: 'generate' | 'edit';

  /**
   * Optional webhook URL for notifications (future use).
   */
  webhookUrl?: string;
}

/**
 * Options for updating a prediction.
 */
export interface UpdatePredictionOptions {
  /**
   * New status for the prediction.
   */
  status?: PredictionStatus;

  /**
   * Progress percentage (0-100).
   */
  progress?: number;

  /**
   * Estimated time remaining in seconds.
   */
  etaSeconds?: number;

  /**
   * Result data if completed.
   */
  result?: GenerateResponse | EditResponse;

  /**
   * Error information if failed.
   */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Result of querying predictions.
 */
export interface PredictionQueryResult {
  /**
   * Predictions matching the query.
   */
  predictions: Prediction[];

  /**
   * Total count of matching predictions.
   */
  total: number;
}

/**
 * Statistics about the prediction store.
 */
export interface PredictionStoreStats {
  /**
   * Total number of predictions in the store.
   */
  total: number;

  /**
   * Number of queued predictions.
   */
  queued: number;

  /**
   * Number of processing predictions.
   */
  processing: number;

  /**
   * Number of completed predictions.
   */
  completed: number;

  /**
   * Number of failed predictions.
   */
  failed: number;

  /**
   * Number of cancelled predictions.
   */
  cancelled: number;
}

/**
 * Callback type for prediction processing.
 */
export type PredictionProcessor = (
  prediction: Prediction
) => Promise<GenerateResponse | EditResponse>;

// =============================================================================
// PredictionStore Class
// =============================================================================

/**
 * In-memory store for managing async prediction jobs.
 *
 * This class provides a complete job queue implementation for the local
 * async functionality, since the Ideogram API is synchronous only.
 *
 * @example
 * ```typescript
 * const store = new PredictionStore();
 *
 * // Queue a new prediction
 * const prediction = store.create({
 *   request: { prompt: 'A beautiful sunset' },
 *   type: 'generate',
 * });
 *
 * // Check status
 * const status = store.get(prediction.id);
 * console.log(status?.status); // 'queued'
 *
 * // Cancel if still queued
 * const cancelled = store.cancel(prediction.id);
 * ```
 */
export class PredictionStore {
  private readonly predictions: Map<string, Prediction> = new Map();
  private readonly maxQueueSize: number;
  private readonly predictionTimeoutMs: number;
  private readonly cleanupAgeMs: number;
  private readonly enableAutoCleanup: boolean;
  private readonly cleanupIntervalMs: number;
  private readonly log: Logger;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private processor: PredictionProcessor | null = null;
  private processingQueue: boolean = false;

  /**
   * Creates a new PredictionStore instance.
   *
   * @param options - Store configuration options
   */
  constructor(options: PredictionStoreOptions = {}) {
    this.maxQueueSize = options.maxQueueSize ?? PREDICTION_QUEUE.MAX_QUEUE_SIZE;
    this.predictionTimeoutMs = options.predictionTimeoutMs ?? PREDICTION_QUEUE.PREDICTION_TIMEOUT_MS;
    this.cleanupAgeMs = options.cleanupAgeMs ?? PREDICTION_QUEUE.CLEANUP_AGE_MS;
    this.enableAutoCleanup = options.enableAutoCleanup ?? true;
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? 60 * 60 * 1000; // 1 hour default
    this.log = options.logger ?? createChildLogger('prediction-store');

    if (this.enableAutoCleanup) {
      this.startAutoCleanup();
    }

    this.log.debug(
      {
        maxQueueSize: this.maxQueueSize,
        predictionTimeoutMs: this.predictionTimeoutMs,
        cleanupAgeMs: this.cleanupAgeMs,
      },
      'PredictionStore initialized'
    );
  }

  // ===========================================================================
  // Public Methods - CRUD Operations
  // ===========================================================================

  /**
   * Creates a new prediction and adds it to the queue.
   *
   * @param options - Prediction creation options
   * @returns The created prediction
   * @throws {IdeogramMCPError} If the queue is full
   *
   * @example
   * ```typescript
   * const prediction = store.create({
   *   request: {
   *     prompt: 'A serene mountain landscape',
   *     num_images: 2,
   *   },
   *   type: 'generate',
   * });
   * console.log(`Prediction ID: ${prediction.id}`);
   * ```
   */
  create(options: CreatePredictionOptions): Prediction {
    // Check queue capacity
    const queuedCount = this.getQueuedCount();
    if (queuedCount >= this.maxQueueSize) {
      throw createInternalError(
        `Queue is full (max ${this.maxQueueSize} predictions). Try again later.`
      );
    }

    const now = new Date().toISOString();
    const id = this.generatePredictionId();

    const prediction: Prediction = {
      id,
      status: 'queued',
      request: options.request,
      type: options.type,
      created_at: now,
      progress: 0,
      eta_seconds: this.estimateEta(options.request),
    };

    this.predictions.set(id, prediction);

    this.log.info(
      { predictionId: id, type: options.type },
      'Prediction created and queued'
    );

    // Trigger processing if a processor is registered
    this.processNextIfIdle();

    return prediction;
  }

  /**
   * Gets a prediction by ID.
   *
   * @param id - The prediction ID
   * @returns The prediction or undefined if not found
   *
   * @example
   * ```typescript
   * const prediction = store.get('pred_abc123');
   * if (prediction) {
   *   console.log(`Status: ${prediction.status}`);
   * }
   * ```
   */
  get(id: string): Prediction | undefined {
    return this.predictions.get(id);
  }

  /**
   * Gets a prediction by ID, throwing an error if not found.
   *
   * @param id - The prediction ID
   * @returns The prediction
   * @throws {IdeogramMCPError} If the prediction is not found
   */
  getOrThrow(id: string): Prediction {
    const prediction = this.get(id);
    if (!prediction) {
      throw createPredictionNotFoundError(id);
    }
    return prediction;
  }

  /**
   * Updates a prediction with new data.
   *
   * @param id - The prediction ID
   * @param updates - Fields to update
   * @returns The updated prediction
   * @throws {IdeogramMCPError} If the prediction is not found
   *
   * @example
   * ```typescript
   * const updated = store.update('pred_abc123', {
   *   status: 'processing',
   *   progress: 50,
   *   etaSeconds: 15,
   * });
   * ```
   */
  update(id: string, updates: UpdatePredictionOptions): Prediction {
    const prediction = this.getOrThrow(id);

    // Update status and related timestamps
    if (updates.status !== undefined) {
      prediction.status = updates.status;

      if (updates.status === 'processing' && !prediction.started_at) {
        prediction.started_at = new Date().toISOString();
      }

      if (
        updates.status === 'completed' ||
        updates.status === 'failed' ||
        updates.status === 'cancelled'
      ) {
        prediction.completed_at = new Date().toISOString();
      }
    }

    // Update progress
    if (updates.progress !== undefined) {
      prediction.progress = Math.min(100, Math.max(0, updates.progress));
    }

    // Update ETA
    if (updates.etaSeconds !== undefined) {
      prediction.eta_seconds = updates.etaSeconds;
    }

    // Update result (for completed predictions)
    if (updates.result !== undefined) {
      prediction.result = updates.result;
      prediction.status = 'completed';
      prediction.progress = 100;
      prediction.eta_seconds = 0;
      prediction.completed_at = new Date().toISOString();
    }

    // Update error (for failed predictions)
    if (updates.error !== undefined) {
      prediction.error = updates.error;
      prediction.status = 'failed';
      prediction.completed_at = new Date().toISOString();
    }

    this.predictions.set(id, prediction);

    this.log.debug(
      { predictionId: id, status: prediction.status, progress: prediction.progress },
      'Prediction updated'
    );

    return prediction;
  }

  /**
   * Marks a prediction as processing.
   *
   * @param id - The prediction ID
   * @returns The updated prediction
   */
  markProcessing(id: string): Prediction {
    return this.update(id, { status: 'processing', progress: 10 });
  }

  /**
   * Marks a prediction as completed with results.
   *
   * @param id - The prediction ID
   * @param result - The generation/edit result
   * @returns The updated prediction
   */
  markCompleted(id: string, result: GenerateResponse | EditResponse): Prediction {
    const prediction = this.update(id, { result });

    this.log.info(
      { predictionId: id, imageCount: result.data.length },
      'Prediction completed successfully'
    );

    // Process next queued prediction
    this.processNextIfIdle();

    return prediction;
  }

  /**
   * Marks a prediction as failed with error information.
   *
   * @param id - The prediction ID
   * @param error - Error information
   * @returns The updated prediction
   */
  markFailed(
    id: string,
    error: { code: string; message: string; retryable: boolean }
  ): Prediction {
    const prediction = this.update(id, { error });

    this.log.warn(
      { predictionId: id, errorCode: error.code, errorMessage: error.message },
      'Prediction failed'
    );

    // Process next queued prediction
    this.processNextIfIdle();

    return prediction;
  }

  /**
   * Cancels a prediction if it's still queued.
   * Predictions already processing or completed cannot be cancelled.
   *
   * @param id - The prediction ID
   * @returns Object indicating success and current status
   * @throws {IdeogramMCPError} If the prediction is not found
   *
   * @example
   * ```typescript
   * const result = store.cancel('pred_abc123');
   * if (result.success) {
   *   console.log('Prediction cancelled');
   * } else {
   *   console.log(`Cannot cancel: ${result.status}`);
   * }
   * ```
   */
  cancel(id: string): { success: boolean; status: PredictionStatus; message: string } {
    const prediction = this.getOrThrow(id);

    // Can only cancel queued predictions
    if (prediction.status !== 'queued') {
      const statusMessages: Record<PredictionStatus, string> = {
        queued: 'Prediction is queued',
        processing: 'Prediction is already being processed by the Ideogram API',
        completed: 'Prediction has already completed',
        failed: 'Prediction has already failed',
        cancelled: 'Prediction was already cancelled',
      };

      return {
        success: false,
        status: prediction.status,
        message: statusMessages[prediction.status],
      };
    }

    // Cancel the prediction
    prediction.status = 'cancelled';
    prediction.completed_at = new Date().toISOString();
    this.predictions.set(id, prediction);

    this.log.info({ predictionId: id }, 'Prediction cancelled');

    return {
      success: true,
      status: 'cancelled',
      message: 'Prediction successfully cancelled',
    };
  }

  /**
   * Deletes a prediction from the store.
   *
   * @param id - The prediction ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): boolean {
    const existed = this.predictions.has(id);
    this.predictions.delete(id);

    if (existed) {
      this.log.debug({ predictionId: id }, 'Prediction deleted');
    }

    return existed;
  }

  // ===========================================================================
  // Public Methods - Query Operations
  // ===========================================================================

  /**
   * Gets all predictions.
   *
   * @returns Array of all predictions
   */
  getAll(): Prediction[] {
    return Array.from(this.predictions.values());
  }

  /**
   * Gets predictions by status.
   *
   * @param status - The status to filter by
   * @returns Array of matching predictions
   */
  getByStatus(status: PredictionStatus): Prediction[] {
    return this.getAll().filter((p) => p.status === status);
  }

  /**
   * Gets the next queued prediction (FIFO).
   *
   * @returns The oldest queued prediction or undefined
   */
  getNextQueued(): Prediction | undefined {
    const queued = this.getByStatus('queued');
    if (queued.length === 0) {
      return undefined;
    }

    // Sort by created_at ascending (oldest first)
    return queued.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
  }

  /**
   * Gets store statistics.
   *
   * @returns Statistics about the store contents
   *
   * @example
   * ```typescript
   * const stats = store.getStats();
   * console.log(`Queued: ${stats.queued}, Processing: ${stats.processing}`);
   * ```
   */
  getStats(): PredictionStoreStats {
    const all = this.getAll();

    return {
      total: all.length,
      queued: all.filter((p) => p.status === 'queued').length,
      processing: all.filter((p) => p.status === 'processing').length,
      completed: all.filter((p) => p.status === 'completed').length,
      failed: all.filter((p) => p.status === 'failed').length,
      cancelled: all.filter((p) => p.status === 'cancelled').length,
    };
  }

  /**
   * Checks if a prediction exists.
   *
   * @param id - The prediction ID
   * @returns True if the prediction exists
   */
  has(id: string): boolean {
    return this.predictions.has(id);
  }

  /**
   * Gets the count of queued predictions.
   */
  getQueuedCount(): number {
    return this.getByStatus('queued').length;
  }

  /**
   * Gets the count of processing predictions.
   */
  getProcessingCount(): number {
    return this.getByStatus('processing').length;
  }

  // ===========================================================================
  // Public Methods - Processing
  // ===========================================================================

  /**
   * Registers a processor function for handling predictions.
   * When a processor is registered, queued predictions will be processed automatically.
   *
   * @param processor - Function that processes a prediction and returns the result
   *
   * @example
   * ```typescript
   * store.setProcessor(async (prediction) => {
   *   // Call Ideogram API here
   *   return await client.generate(prediction.request);
   * });
   * ```
   */
  setProcessor(processor: PredictionProcessor): void {
    this.processor = processor;
    this.log.debug('Processor registered');

    // Start processing any queued predictions
    this.processNextIfIdle();
  }

  /**
   * Processes the next queued prediction if one is available and not already processing.
   * This is called automatically when predictions are created or completed.
   */
  async processNextIfIdle(): Promise<void> {
    // Skip if no processor or already processing
    if (!this.processor || this.processingQueue) {
      return;
    }

    const next = this.getNextQueued();
    if (!next) {
      return;
    }

    this.processingQueue = true;

    try {
      await this.processOne(next);
    } finally {
      this.processingQueue = false;

      // Check for more queued predictions
      if (this.getQueuedCount() > 0) {
        // Use setImmediate to avoid stack overflow with many queued items
        setImmediate(() => this.processNextIfIdle());
      }
    }
  }

  // ===========================================================================
  // Public Methods - Cleanup
  // ===========================================================================

  /**
   * Cleans up old completed/failed/cancelled predictions.
   *
   * @returns Number of predictions removed
   */
  cleanup(): number {
    const now = Date.now();
    const cutoff = now - this.cleanupAgeMs;
    let removed = 0;

    for (const [id, prediction] of this.predictions) {
      // Only cleanup terminal states
      if (
        prediction.status !== 'completed' &&
        prediction.status !== 'failed' &&
        prediction.status !== 'cancelled'
      ) {
        continue;
      }

      const completedAt = prediction.completed_at
        ? new Date(prediction.completed_at).getTime()
        : 0;

      if (completedAt < cutoff) {
        this.predictions.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.log.info({ removedCount: removed }, 'Cleaned up old predictions');
    }

    return removed;
  }

  /**
   * Clears all predictions from the store.
   */
  clear(): void {
    const count = this.predictions.size;
    this.predictions.clear();
    this.log.info({ count }, 'All predictions cleared');
  }

  /**
   * Stops the automatic cleanup timer.
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.log.debug('Auto cleanup stopped');
    }
  }

  /**
   * Disposes the store, stopping timers and clearing data.
   */
  dispose(): void {
    this.stopAutoCleanup();
    this.clear();
    this.processor = null;
    this.log.debug('PredictionStore disposed');
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Generates a unique prediction ID.
   */
  private generatePredictionId(): string {
    return `pred_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  /**
   * Estimates the ETA for a prediction based on request parameters.
   */
  private estimateEta(request: GenerateRequest): number {
    // Base estimate in seconds
    let eta = 30; // 30 seconds base

    // Adjust based on number of images
    const numImages = request.num_images ?? 1;
    eta += (numImages - 1) * 10; // +10 seconds per additional image

    // Adjust based on rendering speed
    const renderingSpeed = request.rendering_speed ?? 'DEFAULT';
    const speedMultipliers: Record<string, number> = {
      FLASH: 0.5,
      TURBO: 0.75,
      DEFAULT: 1.0,
      QUALITY: 2.0,
    };
    eta *= speedMultipliers[renderingSpeed] ?? 1.0;

    return Math.round(eta);
  }

  /**
   * Processes a single prediction.
   */
  private async processOne(prediction: Prediction): Promise<void> {
    if (!this.processor) {
      return;
    }

    const { id } = prediction;

    try {
      // Mark as processing
      this.markProcessing(id);

      // Update progress periodically (simulated)
      const progressInterval = setInterval(() => {
        const current = this.get(id);
        if (current && current.status === 'processing' && (current.progress ?? 0) < 90) {
          this.update(id, { progress: (current.progress ?? 0) + 20 });
        }
      }, 5000);

      try {
        // Execute the processor
        const result = await this.processor(prediction);

        // Mark as completed
        this.markCompleted(id, result);
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error) {
      // Handle errors
      const errorInfo = this.extractErrorInfo(error);
      this.markFailed(id, errorInfo);
    }
  }

  /**
   * Extracts error information from an unknown error.
   */
  private extractErrorInfo(error: unknown): {
    code: string;
    message: string;
    retryable: boolean;
  } {
    if (error instanceof IdeogramMCPError) {
      return {
        code: error.code,
        message: error.userMessage,
        retryable: error.retryable,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'PROCESSING_ERROR',
        message: error.message,
        retryable: false,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      retryable: false,
    };
  }

  /**
   * Starts the automatic cleanup timer.
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }

    this.log.debug(
      { intervalMs: this.cleanupIntervalMs },
      'Auto cleanup started'
    );
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a new PredictionStore with default configuration.
 *
 * @param options - Optional store configuration
 * @returns A new PredictionStore instance
 *
 * @example
 * ```typescript
 * // Using defaults
 * const store = createPredictionStore();
 *
 * // With custom options
 * const store = createPredictionStore({
 *   maxQueueSize: 50,
 *   enableAutoCleanup: false,
 * });
 * ```
 */
export function createPredictionStore(
  options?: PredictionStoreOptions
): PredictionStore {
  return new PredictionStore(options);
}

/**
 * Creates a PredictionStore with a processor already registered.
 *
 * @param processor - The prediction processor function
 * @param options - Optional store configuration
 * @returns A new PredictionStore instance with the processor registered
 */
export function createPredictionStoreWithProcessor(
  processor: PredictionProcessor,
  options?: PredictionStoreOptions
): PredictionStore {
  const store = new PredictionStore(options);
  store.setProcessor(processor);
  return store;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Checks if a prediction is in a terminal state.
 *
 * @param prediction - The prediction to check
 * @returns True if the prediction is completed, failed, or cancelled
 */
export function isPredictionTerminal(prediction: Prediction): boolean {
  return (
    prediction.status === 'completed' ||
    prediction.status === 'failed' ||
    prediction.status === 'cancelled'
  );
}

/**
 * Checks if a prediction can be cancelled.
 *
 * @param prediction - The prediction to check
 * @returns True if the prediction is still queued
 */
export function isPredictionCancellable(prediction: Prediction): boolean {
  return prediction.status === 'queued';
}

/**
 * Gets the elapsed time for a prediction in seconds.
 *
 * @param prediction - The prediction
 * @returns Elapsed time in seconds, or 0 if not started
 */
export function getPredictionElapsedTime(prediction: Prediction): number {
  if (!prediction.started_at) {
    return 0;
  }

  const startTime = new Date(prediction.started_at).getTime();
  const endTime = prediction.completed_at
    ? new Date(prediction.completed_at).getTime()
    : Date.now();

  return Math.round((endTime - startTime) / 1000);
}

/**
 * Formats a prediction status for display.
 *
 * @param status - The prediction status
 * @returns Human-readable status string
 */
export function formatPredictionStatus(status: PredictionStatus): string {
  const statusLabels: Record<PredictionStatus, string> = {
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };
  return statusLabels[status];
}

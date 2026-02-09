/**
 * Type Definitions Index
 *
 * This module re-exports all type definitions for the Ideogram MCP Server.
 * Import from this file for convenient access to all types.
 *
 * @example
 * ```typescript
 * import { GenerateRequest, GenerateInput, GenerateOutput } from './types';
 * ```
 */

// =============================================================================
// API Types
// =============================================================================
// Types for Ideogram API request/response structures

export type {
  // Enums and Literal Types
  AspectRatio,
  RenderingSpeed,
  MagicPrompt,
  StyleType,
  Model,
  Resolution,
  PredictionStatus,
  // Request Types
  BaseImageRequest,
  GenerateRequest,
  LegacyGenerateRequest,
  // Response Types
  GeneratedImage,
  GenerateResponse,
  EditResponse,
  // Error Response Types
  ApiErrorResponse,
  RateLimitInfo,
  // Prediction Types
  Prediction,
  // Cost Tracking Types
  CostEstimate,
  GenerateResponseWithCost,
  EditResponseWithCost,
} from './api.types.js';

// Export type guards and utility functions from API types
export {
  isValidAspectRatio,
  isValidRenderingSpeed,
  isValidStyleType,
  isValidMagicPrompt,
} from './api.types.js';

// =============================================================================
// Tool Types
// =============================================================================
// Zod schemas and types for MCP tool inputs and outputs

// Zod Schemas
export {
  // Shared Schema Components
  AspectRatioSchema,
  RenderingSpeedSchema,
  MagicPromptSchema,
  StyleTypeSchema,
  ModelSchema,
  PredictionStatusSchema,
  // Tool Input Schemas
  GenerateInputSchema,
  GenerateAsyncInputSchema,
  EditInputSchema,
  GetPredictionInputSchema,
  CancelPredictionInputSchema,
  // Tool Schema Exports
  ToolSchemas,
  // Type Guards
  isToolError,
  isPredictionCompleted,
  isPredictionProcessing,
  isPredictionFailed,
  isCancellationSuccessful,
} from './tool.types.js';

// Tool Input Types (inferred from Zod schemas)
export type {
  GenerateInput,
  GenerateAsyncInput,
  EditInput,
  GetPredictionInput,
  CancelPredictionInput,
} from './tool.types.js';

// Tool Output Types
export type {
  CostEstimateOutput,
  GeneratedImageOutput,
  GenerateOutput,
  GenerateAsyncOutput,
  EditOutput,
  GetPredictionProcessingOutput,
  GetPredictionCompletedOutput,
  GetPredictionFailedOutput,
  GetPredictionOutput,
  CancelPredictionSuccessOutput,
  CancelPredictionFailedOutput,
  CancelPredictionOutput,
  ToolErrorOutput,
} from './tool.types.js';

# v3.0.0 Full Ideogram API Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 new Ideogram API tools (Describe, Upscale, Remix, Reframe, Replace Background) and Character Reference support, releasing as v3.0.0.

**Architecture:** Each tool follows the established pattern: Zod input schema in `tool.types.ts`, API types in `api.types.ts`, client method in `ideogram.client.ts`, tool handler in `src/tools/<name>.ts`, registration in `tools/index.ts`. All new tools are synchronous only. Cost calculator is extended for new operation types.

**Tech Stack:** TypeScript strict mode, Zod validation, Axios + FormData for API calls, Vitest for testing, Pino logging.

---

### Task 1: Add API Endpoint Constants and New API Types

**Files:**
- Modify: `src/config/constants.ts`
- Modify: `src/types/api.types.ts`

**Step 1: Add new endpoint constants to `constants.ts`**

In `src/config/constants.ts`, add new endpoints to the `API_ENDPOINTS` object:

```diff
 export const API_ENDPOINTS = {
   /** V3 Generate endpoint */
   GENERATE_V3: '/v1/ideogram-v3/generate',
   /** Legacy Edit endpoint (inpainting only) */
   EDIT_LEGACY: '/edit',
   /** Legacy V2 Generate endpoint */
   GENERATE_LEGACY: '/generate',
+  /** V3 Remix endpoint */
+  REMIX_V3: '/v1/ideogram-v3/remix',
+  /** V3 Reframe endpoint */
+  REFRAME_V3: '/v1/ideogram-v3/reframe',
+  /** V3 Replace Background endpoint */
+  REPLACE_BACKGROUND_V3: '/v1/ideogram-v3/replace-background',
+  /** V3 Edit endpoint */
+  EDIT_V3: '/v1/ideogram-v3/edit',
+  /** Upscale endpoint */
+  UPSCALE: '/upscale',
+  /** Describe endpoint */
+  DESCRIBE: '/describe',
 } as const;
```

Add new cost rate constants after `EDIT_CREDITS_PER_IMAGE`:

```typescript
/**
 * Credits cost for upscale operations per image.
 */
export const UPSCALE_CREDITS_PER_IMAGE: Record<'DEFAULT', number> = {
  DEFAULT: 0.12,
} as const;

/**
 * Credits cost for remix operations per image (same as generate).
 */
export const REMIX_CREDITS_PER_IMAGE: Record<RenderingSpeed, number> = {
  FLASH: 0.04,
  TURBO: 0.08,
  DEFAULT: 0.1,
  QUALITY: 0.2,
} as const;

/**
 * Credits cost for reframe operations per image (same as edit).
 */
export const REFRAME_CREDITS_PER_IMAGE: Record<RenderingSpeed, number> = {
  FLASH: 0.06,
  TURBO: 0.1,
  DEFAULT: 0.12,
  QUALITY: 0.24,
} as const;

/**
 * Credits cost for replace-background operations per image (same as edit).
 */
export const REPLACE_BG_CREDITS_PER_IMAGE: Record<RenderingSpeed, number> = {
  FLASH: 0.06,
  TURBO: 0.1,
  DEFAULT: 0.12,
  QUALITY: 0.24,
} as const;
```

Add a `DescribeModelVersion` to the validation section:

```typescript
/**
 * Describe model version options.
 */
export const DESCRIBE_MODEL_VERSIONS: readonly DescribeModelVersion[] = ['V_2', 'V_3'] as const;
```

**Step 2: Add new types to `api.types.ts`**

Add `DescribeModelVersion` type after the existing `Model` type:

```typescript
/**
 * Model versions for describe endpoint
 */
export type DescribeModelVersion = 'V_2' | 'V_3';
```

Add new response type for Describe:

```typescript
/**
 * Response from describe endpoint
 */
export interface DescribeResponse {
  /** Array of generated descriptions */
  descriptions: Array<{ text: string }>;
}
```

Add `StyleTypeV3` (V3 endpoints don't support RENDER_3D and ANIME):

```typescript
/**
 * Style type for V3 image generation endpoints.
 * V3 only supports AUTO, GENERAL, REALISTIC, DESIGN, FICTION.
 */
export type StyleTypeV3 = 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION';
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no new types are consumed yet)

**Step 4: Commit**

```bash
git add src/config/constants.ts src/types/api.types.ts
git commit -m "feat: add API endpoint constants and types for v3 tools"
```

---

### Task 2: Extend Cost Calculator for New Operation Types

**Files:**
- Modify: `src/services/cost.calculator.ts`
- Modify: `src/__tests__/unit/cost.calculator.test.ts` (if it exists, otherwise `tools.test.ts`)

**Step 1: Write failing tests for new cost functions**

Add tests to the existing cost calculator test or create a new section in `tools.test.ts`:

```typescript
import {
  calculateUpscaleCost,
  calculateRemixCost,
  calculateReframeCost,
  calculateReplaceBgCost,
} from '../../services/cost.calculator.js';

describe('New Cost Calculation Functions', () => {
  it('should calculate upscale cost', () => {
    const cost = calculateUpscaleCost({ numImages: 1 });
    expect(cost.credits_used).toBeGreaterThan(0);
    expect(cost.estimated_usd).toBeGreaterThan(0);
    expect(cost.num_images).toBe(1);
  });

  it('should calculate remix cost with rendering speed', () => {
    const cost = calculateRemixCost({ numImages: 2, renderingSpeed: 'QUALITY' });
    expect(cost.credits_used).toBe(0.4);
    expect(cost.num_images).toBe(2);
    expect(cost.pricing_tier).toBe('QUALITY');
  });

  it('should calculate reframe cost', () => {
    const cost = calculateReframeCost({ numImages: 1, renderingSpeed: 'DEFAULT' });
    expect(cost.credits_used).toBe(0.12);
  });

  it('should calculate replace-background cost', () => {
    const cost = calculateReplaceBgCost({ numImages: 1, renderingSpeed: 'DEFAULT' });
    expect(cost.credits_used).toBe(0.12);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run`
Expected: FAIL — functions not exported

**Step 3: Implement new cost functions in `cost.calculator.ts`**

Add imports at top of `cost.calculator.ts`:

```typescript
import {
  CREDITS_PER_IMAGE,
  EDIT_CREDITS_PER_IMAGE,
  UPSCALE_CREDITS_PER_IMAGE,
  REMIX_CREDITS_PER_IMAGE,
  REFRAME_CREDITS_PER_IMAGE,
  REPLACE_BG_CREDITS_PER_IMAGE,
  USD_PER_CREDIT,
  DEFAULTS,
} from '../config/constants.js';
```

Add four new functions (same pattern as existing `calculateCost` and `calculateEditCost`):

```typescript
/**
 * Parameters for calculating upscale cost.
 */
export interface UpscaleCostParams {
  numImages?: number;
}

/**
 * Calculates the estimated cost for an upscale operation.
 */
export function calculateUpscaleCost(params: UpscaleCostParams = {}): CostEstimate {
  const numImages = params.numImages ?? DEFAULTS.NUM_IMAGES;
  const creditsPerImage = UPSCALE_CREDITS_PER_IMAGE.DEFAULT;
  const creditsUsed = creditsPerImage * numImages;
  const estimatedUsd = creditsUsed * USD_PER_CREDIT;

  return {
    credits_used: roundCredits(creditsUsed),
    estimated_usd: roundUsd(estimatedUsd),
    pricing_tier: 'DEFAULT',
    num_images: numImages,
  };
}

/**
 * Calculates the estimated cost for a remix operation (same rates as generate).
 */
export function calculateRemixCost(params: GenerateCostParams = {}): CostEstimate {
  const numImages = params.numImages ?? DEFAULTS.NUM_IMAGES;
  const renderingSpeed = params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED;
  const creditsPerImage = REMIX_CREDITS_PER_IMAGE[renderingSpeed];
  const creditsUsed = creditsPerImage * numImages;
  const estimatedUsd = creditsUsed * USD_PER_CREDIT;

  return {
    credits_used: roundCredits(creditsUsed),
    estimated_usd: roundUsd(estimatedUsd),
    pricing_tier: renderingSpeed,
    num_images: numImages,
  };
}

/**
 * Calculates the estimated cost for a reframe operation (same rates as edit).
 */
export function calculateReframeCost(params: EditCostParams = {}): CostEstimate {
  const numImages = params.numImages ?? DEFAULTS.NUM_IMAGES;
  const renderingSpeed = params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED;
  const creditsPerImage = REFRAME_CREDITS_PER_IMAGE[renderingSpeed];
  const creditsUsed = creditsPerImage * numImages;
  const estimatedUsd = creditsUsed * USD_PER_CREDIT;

  return {
    credits_used: roundCredits(creditsUsed),
    estimated_usd: roundUsd(estimatedUsd),
    pricing_tier: renderingSpeed,
    num_images: numImages,
  };
}

/**
 * Calculates the estimated cost for a replace-background operation (same rates as edit).
 */
export function calculateReplaceBgCost(params: EditCostParams = {}): CostEstimate {
  const numImages = params.numImages ?? DEFAULTS.NUM_IMAGES;
  const renderingSpeed = params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED;
  const creditsPerImage = REPLACE_BG_CREDITS_PER_IMAGE[renderingSpeed];
  const creditsUsed = creditsPerImage * numImages;
  const estimatedUsd = creditsUsed * USD_PER_CREDIT;

  return {
    credits_used: roundCredits(creditsUsed),
    estimated_usd: roundUsd(estimatedUsd),
    pricing_tier: renderingSpeed,
    num_images: numImages,
  };
}
```

Also add methods to the `CostCalculator` class:

```typescript
calculateUpscaleCost(numImages: number = 1): CostEstimate {
  const cost = calculateUpscaleCost({ numImages });
  this.addCost(cost);
  return cost;
}

calculateRemixCost(
  numImages: number = 1,
  renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
): CostEstimate {
  const cost = calculateRemixCost({ numImages, renderingSpeed });
  this.addCost(cost);
  return cost;
}

calculateReframeCost(
  numImages: number = 1,
  renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
): CostEstimate {
  const cost = calculateReframeCost({ numImages, renderingSpeed });
  this.addCost(cost);
  return cost;
}

calculateReplaceBgCost(
  numImages: number = 1,
  renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
): CostEstimate {
  const cost = calculateReplaceBgCost({ numImages, renderingSpeed });
  this.addCost(cost);
  return cost;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:run`
Expected: PASS

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/services/cost.calculator.ts src/__tests__/
git commit -m "feat: add cost calculation for upscale, remix, reframe, replace-background"
```

---

### Task 3: Add Zod Schemas for New Tools in `tool.types.ts`

**Files:**
- Modify: `src/types/tool.types.ts`

**Step 1: Add new Zod schemas and output types**

Add these schemas after the existing `CancelPredictionInputSchema`:

```typescript
// =============================================================================
// V3 Tool Shared Schema Components
// =============================================================================

/**
 * Style type for V3 endpoints (no RENDER_3D or ANIME)
 */
export const StyleTypeV3Schema = z.enum([
  'AUTO',
  'GENERAL',
  'REALISTIC',
  'DESIGN',
  'FICTION',
]);

/**
 * Describe model version options.
 */
export const DescribeModelVersionSchema = z.enum(['V_2', 'V_3']);

// =============================================================================
// New Tool Input Schemas
// =============================================================================

/**
 * Input schema for ideogram_describe tool.
 * Generates text descriptions from images.
 */
export const DescribeInputSchema = z.object({
  /** Source image: URL, file path, or base64 data URL */
  image: z.string().min(1, 'Image is required'),

  /** Model version to use for description */
  describe_model_version: DescribeModelVersionSchema.optional().default('V_3'),
});

/**
 * Input schema for ideogram_upscale tool.
 * Upscales images with optional prompt guidance.
 */
export const UpscaleInputSchema = z.object({
  /** Source image: URL, file path, or base64 data URL */
  image: z.string().min(1, 'Image is required'),

  /** Optional guidance text for upscaling */
  prompt: z
    .string()
    .max(10000, 'Prompt must be 10000 characters or less')
    .optional(),

  /** Similarity to original (0-100) */
  resemblance: z
    .number()
    .int('Resemblance must be an integer')
    .min(0, 'Resemblance must be at least 0')
    .max(100, 'Resemblance must be at most 100')
    .optional()
    .default(50),

  /** Detail enhancement level (0-100) */
  detail: z
    .number()
    .int('Detail must be an integer')
    .min(0, 'Detail must be at least 0')
    .max(100, 'Detail must be at most 100')
    .optional()
    .default(50),

  /** Magic prompt enhancement option */
  magic_prompt: MagicPromptSchema.optional(),

  /** Number of images to generate (1-8) */
  num_images: z
    .number()
    .int('Number of images must be an integer')
    .min(1, 'Must generate at least 1 image')
    .max(8, 'Cannot generate more than 8 images')
    .optional()
    .default(1),

  /** Random seed for reproducible generation (0-2147483647) */
  seed: z
    .number()
    .int('Seed must be an integer')
    .min(0, 'Seed must be non-negative')
    .max(2147483647, 'Seed must be at most 2147483647')
    .optional(),

  /** Whether to save generated images locally */
  save_locally: z.boolean().optional().default(true),
});

/**
 * Input schema for ideogram_remix tool.
 * Remixes existing images based on a new prompt.
 */
export const RemixInputSchema = z.object({
  /** Source image: URL, file path, or base64 data URL */
  image: z.string().min(1, 'Image is required'),

  /** Text prompt describing the desired remix */
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(10000, 'Prompt must be 10000 characters or less'),

  /** How much influence the original image has (0-100) */
  image_weight: z
    .number()
    .int('Image weight must be an integer')
    .min(0, 'Image weight must be at least 0')
    .max(100, 'Image weight must be at most 100')
    .optional()
    .default(50),

  /** Negative prompt to guide what not to include */
  negative_prompt: z
    .string()
    .max(10000, 'Negative prompt must be 10000 characters or less')
    .optional(),

  /** Aspect ratio for the remixed image */
  aspect_ratio: AspectRatioSchema.optional(),

  /** Number of images to generate (1-8) */
  num_images: z
    .number()
    .int('Number of images must be an integer')
    .min(1, 'Must generate at least 1 image')
    .max(8, 'Cannot generate more than 8 images')
    .optional()
    .default(1),

  /** Random seed for reproducible generation (0-2147483647) */
  seed: z
    .number()
    .int('Seed must be an integer')
    .min(0, 'Seed must be non-negative')
    .max(2147483647, 'Seed must be at most 2147483647')
    .optional(),

  /** Rendering speed/quality tradeoff */
  rendering_speed: RenderingSpeedSchema.optional().default('DEFAULT'),

  /** Magic prompt enhancement option */
  magic_prompt: MagicPromptSchema.optional().default('AUTO'),

  /** Style type for the image (V3 subset) */
  style_type: StyleTypeV3Schema.optional(),

  /** Whether to save generated images locally */
  save_locally: z.boolean().optional().default(true),
});

/**
 * Input schema for ideogram_reframe tool.
 * Extends images to new resolutions via intelligent outpainting.
 */
export const ReframeInputSchema = z.object({
  /** Source image: URL, file path, or base64 data URL */
  image: z.string().min(1, 'Image is required'),

  /** Target resolution (e.g. "1024x768"). Required. */
  resolution: z.string().min(1, 'Resolution is required'),

  /** Number of images to generate (1-8) */
  num_images: z
    .number()
    .int('Number of images must be an integer')
    .min(1, 'Must generate at least 1 image')
    .max(8, 'Cannot generate more than 8 images')
    .optional()
    .default(1),

  /** Random seed for reproducible generation (0-2147483647) */
  seed: z
    .number()
    .int('Seed must be an integer')
    .min(0, 'Seed must be non-negative')
    .max(2147483647, 'Seed must be at most 2147483647')
    .optional(),

  /** Rendering speed/quality tradeoff */
  rendering_speed: RenderingSpeedSchema.optional().default('DEFAULT'),

  /** Whether to save generated images locally */
  save_locally: z.boolean().optional().default(true),
});

/**
 * Input schema for ideogram_replace_background tool.
 * Replaces image backgrounds while preserving foreground.
 */
export const ReplaceBackgroundInputSchema = z.object({
  /** Source image: URL, file path, or base64 data URL */
  image: z.string().min(1, 'Image is required'),

  /** Text prompt describing the desired new background */
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(10000, 'Prompt must be 10000 characters or less'),

  /** Magic prompt enhancement option */
  magic_prompt: MagicPromptSchema.optional().default('AUTO'),

  /** Number of images to generate (1-8) */
  num_images: z
    .number()
    .int('Number of images must be an integer')
    .min(1, 'Must generate at least 1 image')
    .max(8, 'Cannot generate more than 8 images')
    .optional()
    .default(1),

  /** Random seed for reproducible generation (0-2147483647) */
  seed: z
    .number()
    .int('Seed must be an integer')
    .min(0, 'Seed must be non-negative')
    .max(2147483647, 'Seed must be at most 2147483647')
    .optional(),

  /** Rendering speed/quality tradeoff */
  rendering_speed: RenderingSpeedSchema.optional().default('DEFAULT'),

  /** Whether to save generated images locally */
  save_locally: z.boolean().optional().default(true),
});
```

Add inferred types after the existing ones:

```typescript
export type DescribeInput = z.infer<typeof DescribeInputSchema>;
export type UpscaleInput = z.infer<typeof UpscaleInputSchema>;
export type RemixInput = z.infer<typeof RemixInputSchema>;
export type ReframeInput = z.infer<typeof ReframeInputSchema>;
export type ReplaceBackgroundInput = z.infer<typeof ReplaceBackgroundInputSchema>;
```

Add output types:

```typescript
/**
 * Output from ideogram_describe tool
 */
export interface DescribeOutput {
  /** Success indicator */
  success: true;
  /** Array of generated descriptions */
  descriptions: Array<{ text: string }>;
}

/**
 * Output from ideogram_upscale tool (same shape as GenerateOutput)
 */
export type UpscaleOutput = GenerateOutput;

/**
 * Output from ideogram_remix tool (same shape as GenerateOutput)
 */
export type RemixOutput = GenerateOutput;

/**
 * Output from ideogram_reframe tool (same shape as GenerateOutput)
 */
export type ReframeOutput = GenerateOutput;

/**
 * Output from ideogram_replace_background tool (same shape as GenerateOutput)
 */
export type ReplaceBackgroundOutput = GenerateOutput;
```

Update `ToolSchemas` to include new schemas:

```typescript
export const ToolSchemas = {
  generate: GenerateInputSchema,
  generateAsync: GenerateAsyncInputSchema,
  edit: EditInputSchema,
  getPrediction: GetPredictionInputSchema,
  cancelPrediction: CancelPredictionInputSchema,
  describe: DescribeInputSchema,
  upscale: UpscaleInputSchema,
  remix: RemixInputSchema,
  reframe: ReframeInputSchema,
  replaceBackground: ReplaceBackgroundInputSchema,
} as const;
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/types/tool.types.ts
git commit -m "feat: add Zod input schemas and output types for 5 new tools"
```

---

### Task 4: Add IdeogramClient Methods for Describe and Upscale

**Files:**
- Modify: `src/services/ideogram.client.ts`

**Step 1: Add DescribeParams and UpscaleParams interfaces**

Add after the existing `EditParams` interface:

```typescript
/**
 * Parameters for image description.
 */
export interface DescribeParams {
  /**
   * The image to describe.
   * Can be a URL, base64 data URL, or Buffer.
   */
  image: string | Buffer;

  /**
   * Model version for description.
   * @default 'V_3'
   */
  describeModelVersion?: 'V_2' | 'V_3';
}

/**
 * Parameters for image upscaling.
 */
export interface UpscaleParams {
  /**
   * The image to upscale.
   * Can be a URL, base64 data URL, or Buffer.
   */
  image: string | Buffer;

  /**
   * Optional guidance text for upscaling.
   */
  prompt?: string;

  /**
   * Similarity to original (0-100).
   * @default 50
   */
  resemblance?: number;

  /**
   * Detail enhancement level (0-100).
   * @default 50
   */
  detail?: number;

  /**
   * Magic prompt enhancement option.
   */
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';

  /**
   * Number of images to generate (1-8).
   * @default 1
   */
  numImages?: number;

  /**
   * Random seed for reproducible generation.
   */
  seed?: number;
}
```

**Step 2: Add `describe()` and `upscale()` methods to `IdeogramClient` class**

Import `DescribeResponse` from api.types at the top. Add the methods after the existing `edit()` method:

```typescript
/**
 * Describes an image, generating text descriptions.
 *
 * @param params - Describe parameters including the image
 * @returns Promise resolving to text descriptions
 * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
 */
async describe(params: DescribeParams): Promise<DescribeResponse> {
  const endpoint = API_ENDPOINTS.DESCRIBE;
  const startTime = Date.now();

  // Prepare image for upload
  const preparedImage = await this.prepareImage(params.image, 'image_file');

  // Create multipart form data
  const formData = new FormData();
  formData.append('image_file', preparedImage.data, {
    contentType: preparedImage.contentType,
    filename: preparedImage.filename,
  });

  if (params.describeModelVersion !== undefined) {
    formData.append('describe_model_version', params.describeModelVersion);
  }

  // Log request
  const requestContext: ApiRequestLogContext = {
    endpoint,
    method: 'POST',
    hasImage: true,
    hasMask: false,
  };
  logApiRequest(this.log, requestContext);

  // Execute with retry
  const response = await this.executeWithRetry<DescribeResponse>(
    endpoint,
    formData,
    this.timeoutMs,
    'describe'
  );

  // Log response
  const responseContext: ApiResponseLogContext = {
    endpoint,
    statusCode: 200,
    durationMs: Date.now() - startTime,
    imageCount: 0,
  };
  logApiResponse(this.log, responseContext);

  return response;
}

/**
 * Upscales an image with optional prompt guidance.
 *
 * @param params - Upscale parameters
 * @returns Promise resolving to the upscaled image response
 * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
 */
async upscale(params: UpscaleParams): Promise<GenerateResponse> {
  const endpoint = API_ENDPOINTS.UPSCALE;
  const startTime = Date.now();

  // Prepare image for upload
  const preparedImage = await this.prepareImage(params.image, 'image_file');

  // Build image_request JSON (legacy endpoint uses JSON wrapper)
  const imageRequest: Record<string, unknown> = {};
  if (params.prompt !== undefined) {
    imageRequest.prompt = params.prompt;
  }
  imageRequest.resemblance = params.resemblance ?? 50;
  imageRequest.detail = params.detail ?? 50;
  if (params.magicPrompt !== undefined) {
    imageRequest.magic_prompt_option = params.magicPrompt;
  }
  imageRequest.num_images = params.numImages ?? DEFAULTS.NUM_IMAGES;
  if (params.seed !== undefined) {
    imageRequest.seed = params.seed;
  }

  // Create multipart form data
  const formData = new FormData();
  formData.append('image_request', JSON.stringify(imageRequest), {
    contentType: 'application/json',
  });
  formData.append('image_file', preparedImage.data, {
    contentType: preparedImage.contentType,
    filename: preparedImage.filename,
  });

  // Log request
  const requestContext: ApiRequestLogContext = {
    endpoint,
    method: 'POST',
    hasImage: true,
    hasMask: false,
  };
  logApiRequest(this.log, requestContext);

  // Execute with retry
  const response = await this.executeWithRetry<GenerateResponse>(
    endpoint,
    formData,
    TIMEOUTS.LONG_REQUEST_MS,
    'upscale'
  );

  // Log response
  const responseContext: ApiResponseLogContext = {
    endpoint,
    statusCode: 200,
    durationMs: Date.now() - startTime,
    imageCount: response.data.length,
  };
  logApiResponse(this.log, responseContext);

  return response;
}
```

Update the `executeWithRetry` type signature to accept `DescribeResponse` as well — it should already work since it's generic `<T>`.

Also update the `DescribeResponse` import at the top of the file:

```typescript
import type {
  GenerateRequest,
  GenerateResponse,
  EditResponse,
  DescribeResponse,
  RenderingSpeed,
  AspectRatio,
  ApiErrorResponse,
  Model,
  StyleType,
} from '../types/api.types.js';
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/ideogram.client.ts
git commit -m "feat: add describe() and upscale() methods to IdeogramClient"
```

---

### Task 5: Add IdeogramClient Methods for Remix, Reframe, Replace Background

**Files:**
- Modify: `src/services/ideogram.client.ts`

**Step 1: Add param interfaces**

Add after `UpscaleParams`:

```typescript
/**
 * Parameters for image remixing.
 */
export interface RemixParams {
  /** The source image to remix */
  image: string | Buffer;
  /** Text prompt describing the desired remix */
  prompt: string;
  /** How much influence the original image has (0-100) */
  imageWeight?: number;
  /** Negative prompt */
  negativePrompt?: string;
  /** Aspect ratio */
  aspectRatio?: string;
  /** Number of images (1-8) */
  numImages?: number;
  /** Random seed */
  seed?: number;
  /** Rendering speed */
  renderingSpeed?: RenderingSpeed;
  /** Magic prompt option */
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';
  /** Style type (V3 subset) */
  styleType?: StyleType;
}

/**
 * Parameters for image reframing.
 */
export interface ReframeParams {
  /** The source image to reframe */
  image: string | Buffer;
  /** Target resolution (e.g. "1024x768") */
  resolution: string;
  /** Number of images (1-8) */
  numImages?: number;
  /** Random seed */
  seed?: number;
  /** Rendering speed */
  renderingSpeed?: RenderingSpeed;
}

/**
 * Parameters for background replacement.
 */
export interface ReplaceBackgroundParams {
  /** The source image */
  image: string | Buffer;
  /** Description of desired new background */
  prompt: string;
  /** Magic prompt option */
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';
  /** Number of images (1-8) */
  numImages?: number;
  /** Random seed */
  seed?: number;
  /** Rendering speed */
  renderingSpeed?: RenderingSpeed;
}
```

**Step 2: Add the three methods to `IdeogramClient`**

```typescript
/**
 * Remixes an existing image based on a new prompt.
 */
async remix(params: RemixParams): Promise<GenerateResponse> {
  const endpoint = API_ENDPOINTS.REMIX_V3;
  const startTime = Date.now();

  // Prepare image for upload
  const preparedImage = await this.prepareImage(params.image, 'image');

  // Create multipart form data (V3 uses flat fields)
  const formData = new FormData();
  formData.append('image', preparedImage.data, {
    contentType: preparedImage.contentType,
    filename: preparedImage.filename,
  });
  formData.append('prompt', params.prompt);
  formData.append('image_weight', String(params.imageWeight ?? 50));
  formData.append('num_images', String(params.numImages ?? DEFAULTS.NUM_IMAGES));
  formData.append('rendering_speed', params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED);
  formData.append('magic_prompt', params.magicPrompt ?? DEFAULTS.MAGIC_PROMPT);

  if (params.negativePrompt !== undefined) {
    formData.append('negative_prompt', params.negativePrompt);
  }
  const normalizedAspectRatio = this.normalizeAspectRatio(params.aspectRatio);
  if (normalizedAspectRatio !== undefined) {
    formData.append('aspect_ratio', normalizedAspectRatio);
  }
  if (params.seed !== undefined) {
    formData.append('seed', String(params.seed));
  }
  if (params.styleType !== undefined) {
    formData.append('style_type', params.styleType);
  }

  const requestContext: ApiRequestLogContext = {
    endpoint,
    method: 'POST',
    hasImage: true,
    hasMask: false,
  };
  logApiRequest(this.log, requestContext);

  const timeout = this.getTimeoutForRenderingSpeed(params.renderingSpeed);
  const response = await this.executeWithRetry<GenerateResponse>(
    endpoint, formData, timeout, 'remix'
  );

  const responseContext: ApiResponseLogContext = {
    endpoint,
    statusCode: 200,
    durationMs: Date.now() - startTime,
    imageCount: response.data.length,
  };
  logApiResponse(this.log, responseContext);

  return response;
}

/**
 * Reframes an image to a new resolution via intelligent outpainting.
 */
async reframe(params: ReframeParams): Promise<GenerateResponse> {
  const endpoint = API_ENDPOINTS.REFRAME_V3;
  const startTime = Date.now();

  const preparedImage = await this.prepareImage(params.image, 'image');

  const formData = new FormData();
  formData.append('image', preparedImage.data, {
    contentType: preparedImage.contentType,
    filename: preparedImage.filename,
  });
  formData.append('resolution', params.resolution);
  formData.append('num_images', String(params.numImages ?? DEFAULTS.NUM_IMAGES));
  formData.append('rendering_speed', params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED);

  if (params.seed !== undefined) {
    formData.append('seed', String(params.seed));
  }

  const requestContext: ApiRequestLogContext = {
    endpoint,
    method: 'POST',
    hasImage: true,
    hasMask: false,
  };
  logApiRequest(this.log, requestContext);

  const timeout = this.getTimeoutForRenderingSpeed(params.renderingSpeed);
  const response = await this.executeWithRetry<GenerateResponse>(
    endpoint, formData, timeout, 'reframe'
  );

  const responseContext: ApiResponseLogContext = {
    endpoint,
    statusCode: 200,
    durationMs: Date.now() - startTime,
    imageCount: response.data.length,
  };
  logApiResponse(this.log, responseContext);

  return response;
}

/**
 * Replaces the background of an image while preserving the foreground subject.
 */
async replaceBackground(params: ReplaceBackgroundParams): Promise<GenerateResponse> {
  const endpoint = API_ENDPOINTS.REPLACE_BACKGROUND_V3;
  const startTime = Date.now();

  const preparedImage = await this.prepareImage(params.image, 'image');

  const formData = new FormData();
  formData.append('image', preparedImage.data, {
    contentType: preparedImage.contentType,
    filename: preparedImage.filename,
  });
  formData.append('prompt', params.prompt);
  formData.append('magic_prompt', params.magicPrompt ?? DEFAULTS.MAGIC_PROMPT);
  formData.append('num_images', String(params.numImages ?? DEFAULTS.NUM_IMAGES));
  formData.append('rendering_speed', params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED);

  if (params.seed !== undefined) {
    formData.append('seed', String(params.seed));
  }

  const requestContext: ApiRequestLogContext = {
    endpoint,
    method: 'POST',
    hasImage: true,
    hasMask: false,
  };
  logApiRequest(this.log, requestContext);

  const timeout = this.getTimeoutForRenderingSpeed(params.renderingSpeed);
  const response = await this.executeWithRetry<GenerateResponse>(
    endpoint, formData, timeout, 'replaceBackground'
  );

  const responseContext: ApiResponseLogContext = {
    endpoint,
    statusCode: 200,
    durationMs: Date.now() - startTime,
    imageCount: response.data.length,
  };
  logApiResponse(this.log, responseContext);

  return response;
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/ideogram.client.ts
git commit -m "feat: add remix(), reframe(), replaceBackground() methods to IdeogramClient"
```

---

### Task 6: Create Describe Tool Handler

**Files:**
- Create: `src/tools/describe.ts`

**Step 1: Create the describe tool handler**

Follow the exact same pattern as `src/tools/generate.ts`, but simpler since there's no cost calculation or local storage.

Create `src/tools/describe.ts`:

```typescript
/**
 * ideogram_describe Tool
 *
 * Generates text descriptions from images using the Ideogram API.
 * Useful for understanding image composition and generating prompts.
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  DescribeInputSchema,
  type DescribeInput,
  type DescribeOutput,
  type ToolErrorOutput,
} from '../types/tool.types.js';
import {
  IdeogramClient,
  createIdeogramClient,
  type IdeogramClientOptions,
} from '../services/ideogram.client.js';
import { IdeogramMCPError, wrapError } from '../utils/error.handler.js';
import { createChildLogger, logToolInvocation, logToolResult, logError } from '../utils/logger.js';

export const TOOL_NAME = 'ideogram_describe';

export const TOOL_DESCRIPTION = `Generate text descriptions from images using Ideogram AI.

Analyzes an image and returns detailed text descriptions. Useful for:
- Understanding image composition and elements
- Generating prompts to recreate similar images
- Creating searchable descriptions for image libraries
- Deconstructing visual elements for style replication

Input image can be provided as a URL, file path, or base64 data URL.
Supports V_2 and V_3 model versions (V_3 is default and recommended).

Returns one or more text descriptions of the image.`;

export const TOOL_SCHEMA = DescribeInputSchema;

export interface DescribeToolOptions {
  client?: IdeogramClient;
  clientOptions?: IdeogramClientOptions;
  logger?: Logger;
}

export type DescribeToolResult = DescribeOutput | ToolErrorOutput;

export function createDescribeHandler(
  options: DescribeToolOptions = {}
): (input: DescribeInput) => Promise<DescribeToolResult> {
  const log = options.logger ?? createChildLogger('tool:describe');
  const client = options.client ?? createIdeogramClient(options.clientOptions);

  return async function ideogramDescribeHandler(input: DescribeInput): Promise<DescribeToolResult> {
    const startTime = Date.now();

    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        describe_model_version: input.describe_model_version,
      },
    });

    try {
      const describeParams: Parameters<typeof client.describe>[0] = {
        image: input.image,
      };

      if (input.describe_model_version !== undefined) {
        describeParams.describeModelVersion = input.describe_model_version;
      }

      const response = await client.describe(describeParams);

      const result: DescribeOutput = {
        success: true,
        descriptions: response.descriptions,
      };

      const durationMs = Date.now() - startTime;
      logToolResult(log, {
        tool: TOOL_NAME,
        success: true,
        durationMs,
      });

      return result;
    } catch (error) {
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Describe failed', { tool: TOOL_NAME, durationMs });
      logToolResult(log, {
        tool: TOOL_NAME,
        success: false,
        durationMs,
        errorCode: mcpError.code,
      });
      return mcpError.toToolError();
    }
  };
}

let defaultHandler: ((input: DescribeInput) => Promise<DescribeToolResult>) | null = null;

export function getDefaultHandler(): (input: DescribeInput) => Promise<DescribeToolResult> {
  if (!defaultHandler) {
    defaultHandler = createDescribeHandler();
  }
  return defaultHandler;
}

export function resetDefaultHandler(): void {
  defaultHandler = null;
}

export async function ideogramDescribe(input: DescribeInput): Promise<DescribeToolResult> {
  return getDefaultHandler()(input);
}

export const ideogramDescribeTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramDescribe,
} as const;

export type DescribeToolSchema = z.infer<typeof DescribeInputSchema>;
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/tools/describe.ts
git commit -m "feat: add ideogram_describe tool handler"
```

---

### Task 7: Create Upscale Tool Handler

**Files:**
- Create: `src/tools/upscale.ts`

**Step 1: Create the upscale tool handler**

Follow the same pattern as `generate.ts` with cost calculation and local storage support. Create `src/tools/upscale.ts` following the exact same structure as `describe.ts` but:

- Import `UpscaleInputSchema`, `UpscaleInput`, `GenerateOutput` (aliased as `UpscaleOutput`), `GeneratedImageOutput` from tool.types
- Import `calculateUpscaleCost`, `toCostEstimateOutput` from cost.calculator
- Import `StorageService`, `createStorageService` from storage.service
- Build `UpscaleParams` from input and pass to `client.upscale()`
- Process images same as generate handler (download if `save_locally` is true)
- Return `GenerateOutput` shape with cost estimate

The tool name is `'ideogram_upscale'`.

The tool description should mention upscaling, resemblance/detail controls, and optional prompt guidance.

Follow the identical pattern from `generate.ts` lines 151-330 for the handler implementation, replacing `client.generate()` with `client.upscale()` and `calculateCost()` with `calculateUpscaleCost()`.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/tools/upscale.ts
git commit -m "feat: add ideogram_upscale tool handler"
```

---

### Task 8: Create Remix Tool Handler

**Files:**
- Create: `src/tools/remix.ts`

**Step 1: Create the remix tool handler**

Same pattern as upscale but with `RemixInputSchema`/`RemixInput`. Key differences:
- Prompt is required (not optional)
- Has `image_weight` parameter
- Uses `calculateRemixCost()` with `renderingSpeed`
- Has `aspect_ratio`, `negative_prompt`, `style_type` parameters
- Client call: `client.remix()`

Tool name: `'ideogram_remix'`

Map input fields to client params:
- `input.image_weight` → `params.imageWeight`
- `input.negative_prompt` → `params.negativePrompt`
- `input.aspect_ratio` → `params.aspectRatio`
- `input.rendering_speed` → `params.renderingSpeed`
- `input.magic_prompt` → `params.magicPrompt`
- `input.style_type` → `params.styleType`

**Step 2: Run typecheck and commit**

```bash
npm run typecheck
git add src/tools/remix.ts
git commit -m "feat: add ideogram_remix tool handler"
```

---

### Task 9: Create Reframe Tool Handler

**Files:**
- Create: `src/tools/reframe.ts`

**Step 1: Create the reframe tool handler**

Same pattern. Key differences:
- No prompt parameter
- `resolution` is required
- Uses `calculateReframeCost()`
- Client call: `client.reframe()`
- Tool name: `'ideogram_reframe'`

Map input:
- `input.resolution` → `params.resolution`
- `input.rendering_speed` → `params.renderingSpeed`

**Step 2: Run typecheck and commit**

```bash
npm run typecheck
git add src/tools/reframe.ts
git commit -m "feat: add ideogram_reframe tool handler"
```

---

### Task 10: Create Replace Background Tool Handler

**Files:**
- Create: `src/tools/replace-background.ts`

**Step 1: Create the replace-background tool handler**

Same pattern. Key differences:
- Prompt is required
- Has `magic_prompt` parameter
- Uses `calculateReplaceBgCost()`
- Client call: `client.replaceBackground()`
- Tool name: `'ideogram_replace_background'`

**Step 2: Run typecheck and commit**

```bash
npm run typecheck
git add src/tools/replace-background.ts
git commit -m "feat: add ideogram_replace_background tool handler"
```

---

### Task 11: Register All New Tools in `tools/index.ts`

**Files:**
- Modify: `src/tools/index.ts`

**Step 1: Add imports and re-exports for all 5 new tools**

Add import and re-export blocks for each new tool (following the exact pattern of existing tools). For example:

```typescript
// Describe Tool
export {
  TOOL_NAME as DESCRIBE_TOOL_NAME,
  TOOL_DESCRIPTION as DESCRIBE_TOOL_DESCRIPTION,
  TOOL_SCHEMA as DESCRIBE_TOOL_SCHEMA,
  createDescribeHandler,
  getDefaultHandler as getDescribeDefaultHandler,
  resetDefaultHandler as resetDescribeDefaultHandler,
  ideogramDescribe,
  ideogramDescribeTool,
  type DescribeToolOptions,
  type DescribeToolResult,
  type DescribeToolSchema,
} from './describe.js';
```

Repeat for upscale, remix, reframe, replace-background.

**Step 2: Add tool definition imports and update `allTools` array**

```typescript
import { ideogramDescribeTool } from './describe.js';
import { ideogramUpscaleTool } from './upscale.js';
import { ideogramRemixTool } from './remix.js';
import { ideogramReframeTool } from './reframe.js';
import { ideogramReplaceBackgroundTool } from './replace-background.js';

export const allTools = [
  ideogramGenerateTool,
  ideogramEditTool,
  ideogramGenerateAsyncTool,
  ideogramGetPredictionTool,
  ideogramCancelPredictionTool,
  ideogramDescribeTool,
  ideogramUpscaleTool,
  ideogramRemixTool,
  ideogramReframeTool,
  ideogramReplaceBackgroundTool,
] as const;
```

**Step 3: Update `resetAllHandlers` to include new tools**

Add reset calls for the 5 new tools.

**Step 4: Update `registerTools` JSDoc to list all 10 tools**

**Step 5: Run typecheck and tests**

Run: `npm run typecheck && npm run test:run`
Expected: PASS (existing tests should still pass)

**Step 6: Commit**

```bash
git add src/tools/index.ts
git commit -m "feat: register all 5 new tools in tools/index.ts"
```

---

### Task 12: Write Unit Tests for Describe Tool

**Files:**
- Modify: `src/__tests__/unit/tools.test.ts`

**Step 1: Add describe tool tests**

Follow the existing pattern for generate tool tests. Add a new `describe('ideogram_describe Tool', ...)` block.

Update the mock for `ideogram.client.js` to include the `describe` method:

```typescript
vi.mock('../../services/ideogram.client.js', () => ({
  IdeogramClient: vi.fn().mockImplementation(() => ({
    generate: vi.fn(),
    edit: vi.fn(),
    describe: vi.fn(),
    upscale: vi.fn(),
    remix: vi.fn(),
    reframe: vi.fn(),
    replaceBackground: vi.fn(),
    testConnection: vi.fn(),
    getMaskedApiKey: vi.fn(),
  })),
  createIdeogramClient: vi.fn(() => ({
    generate: vi.fn(),
    edit: vi.fn(),
    describe: vi.fn(),
    upscale: vi.fn(),
    remix: vi.fn(),
    reframe: vi.fn(),
    replaceBackground: vi.fn(),
    testConnection: vi.fn(),
    getMaskedApiKey: vi.fn(),
  })),
}));
```

Tests to write:
1. Tool constants (name, description, schema, tool definition)
2. `createDescribeHandler()` — creates handler with default/custom options
3. Successful describe with model V_3
4. Successful describe with model V_2
5. Error handling — API error returns `ToolErrorOutput`

Mock response:

```typescript
function createMockDescribeResponse() {
  return {
    descriptions: [
      { text: 'A beautiful sunset over mountains with orange and purple hues' },
    ],
  };
}
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add src/__tests__/unit/tools.test.ts
git commit -m "test: add unit tests for ideogram_describe tool"
```

---

### Task 13: Write Unit Tests for Upscale, Remix, Reframe, Replace Background Tools

**Files:**
- Modify: `src/__tests__/unit/tools.test.ts`

**Step 1: Add test blocks for each new tool**

For each of the 4 tools, add a `describe()` block with tests:

1. **ideogram_upscale**:
   - Tool constants
   - Successful upscale with default params (resemblance=50, detail=50)
   - Upscale with custom resemblance and detail
   - Upscale with local save
   - Error handling

2. **ideogram_remix**:
   - Tool constants
   - Successful remix with minimal input (image + prompt)
   - Remix with all optional params (image_weight, aspect_ratio, rendering_speed, etc.)
   - Remix with local save
   - Error handling

3. **ideogram_reframe**:
   - Tool constants
   - Successful reframe with required params (image + resolution)
   - Reframe with optional params
   - Error handling

4. **ideogram_replace_background**:
   - Tool constants
   - Successful replace with image + prompt
   - Replace with optional params
   - Error handling

Use the same `createMockGenerateResponse()` helper for all image-output tools.

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Run coverage**

Run: `npm run test:coverage`
Expected: Coverage targets met (90% statements, 85% branches, 75% functions)

**Step 4: Commit**

```bash
git add src/__tests__/unit/tools.test.ts
git commit -m "test: add unit tests for upscale, remix, reframe, replace-background tools"
```

---

### Task 14: Write Client Method Tests

**Files:**
- Modify: `src/__tests__/unit/ideogram.client.test.ts`

**Step 1: Add tests for new client methods**

Add test blocks for `describe()`, `upscale()`, `remix()`, `reframe()`, `replaceBackground()`.

Each should test:
1. Successful request with correct endpoint
2. Correct FormData construction (right fields, image handling)
3. Error handling (API error, network error)

**Step 2: Run tests and commit**

```bash
npm run test:run
git add src/__tests__/unit/ideogram.client.test.ts
git commit -m "test: add client method tests for 5 new API methods"
```

---

### Task 15: Write Validation Tests for New Schemas

**Files:**
- Modify: `src/__tests__/unit/validation.test.ts`

**Step 1: Add validation tests for each new schema**

Test each Zod schema for:
1. Valid input passes
2. Missing required fields rejected
3. Invalid types rejected
4. Default values applied correctly
5. Boundary values (min/max for numbers)

Schemas to test: `DescribeInputSchema`, `UpscaleInputSchema`, `RemixInputSchema`, `ReframeInputSchema`, `ReplaceBackgroundInputSchema`.

**Step 2: Run tests and commit**

```bash
npm run test:run
git add src/__tests__/unit/validation.test.ts
git commit -m "test: add validation tests for new tool input schemas"
```

---

### Task 16: Update Integration Tests

**Files:**
- Modify: `src/__tests__/integration/server.test.ts`

**Step 1: Update server integration test**

Update the test that verifies tool registration to expect 10 tools instead of 5. Add specific checks that the new tool names are registered.

**Step 2: Run tests and commit**

```bash
npm run test:run
git add src/__tests__/integration/server.test.ts
git commit -m "test: update integration tests for 10 tools"
```

---

### Task 17: Add Character Reference Support to Generate and Remix

**Files:**
- Modify: `src/types/tool.types.ts`
- Modify: `src/services/ideogram.client.ts`
- Modify: `src/tools/generate.ts`
- Modify: `src/tools/remix.ts`

**Step 1: Add `character_reference_images` to GenerateInputSchema and RemixInputSchema**

In `tool.types.ts`, add to `GenerateInputSchema`:

```typescript
/** Character reference images for maintaining character consistency */
character_reference_images: z
  .array(z.string().min(1, 'Image reference is required'))
  .max(5, 'Maximum 5 character reference images')
  .optional(),
```

Add same to `RemixInputSchema`.

**Step 2: Update GenerateParams and RemixParams in `ideogram.client.ts`**

Add `characterReferenceImages?: (string | Buffer)[];` to both param interfaces.

**Step 3: Update `generate()` method to handle character references**

In `IdeogramClient.generate()`, when `characterReferenceImages` is provided, switch from JSON body to multipart FormData to include the images.

**Step 4: Update `remix()` method similarly**

Add character reference image handling to the FormData construction.

**Step 5: Update tool handlers**

In `generate.ts` and `remix.ts`, pass `input.character_reference_images` through to client params.

**Step 6: Run typecheck and tests**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

**Step 7: Commit**

```bash
git add src/types/tool.types.ts src/services/ideogram.client.ts src/tools/generate.ts src/tools/remix.ts
git commit -m "feat: add character reference support to generate and remix tools"
```

---

### Task 18: Migrate Edit Tool to V3 API

**Files:**
- Modify: `src/services/ideogram.client.ts`
- Modify: `src/types/tool.types.ts`
- Modify: `src/tools/edit.ts`
- Modify: `src/__tests__/unit/tools.test.ts`

**Step 1: Update EditParams for V3**

Replace `model?: Model` with `renderingSpeed?: RenderingSpeed` and add `characterReferenceImages`.

**Step 2: Update `edit()` method**

Switch from `API_ENDPOINTS.EDIT_LEGACY` to `API_ENDPOINTS.EDIT_V3`. Update FormData construction to match V3 format (same as remix/reframe pattern).

**Step 3: Update EditInputSchema**

Replace `model` field with `rendering_speed` field. Add `character_reference_images`.

**Step 4: Update edit handler**

Update parameter mapping in `edit.ts` to use new field names.

**Step 5: Update edit tests**

Update mocks and assertions in tests to match new V3 API format.

**Step 6: Run full test suite**

Run: `npm run test:run`
Expected: PASS

**Step 7: Commit**

```bash
git add src/services/ideogram.client.ts src/types/tool.types.ts src/tools/edit.ts src/__tests__/
git commit -m "feat!: migrate edit tool to V3 API with character reference support

BREAKING CHANGE: ideogram_edit now uses V3 API endpoint. The 'model' parameter
is replaced with 'rendering_speed'. Character reference images are now supported."
```

---

### Task 19: Update Documentation

**Files:**
- Modify: `docs/API.md`
- Modify: `README.md`

**Step 1: Update `docs/API.md`**

Add full reference for all 5 new tools following the existing format:
- Tool name and description
- Input parameters table
- Output format
- Example usage
- Error handling

Update Character Reference section for Generate, Edit, Remix.

**Step 2: Update `README.md`**

- Update tool count from 5 to 10
- Add new tools to feature list
- Add Character Reference feature highlight
- Update version badge to v3.0.0

**Step 3: Commit**

```bash
git add docs/API.md README.md
git commit -m "docs: update API reference and README for v3.0.0 with 10 tools"
```

---

### Task 20: Final Verification and Lint

**Files:** All

**Step 1: Run full type check**

Run: `npm run typecheck`
Expected: PASS with zero errors

**Step 2: Run full test suite with coverage**

Run: `npm run test:coverage`
Expected: PASS with coverage targets met (90/85/75)

**Step 3: Run linter**

Run: `npm run lint`
Expected: PASS

**Step 4: Run formatter check**

Run: `npm run format:check`
Expected: PASS (or run `npm run format` to auto-fix)

**Step 5: Build**

Run: `npm run build`
Expected: PASS — `dist/index.js` produced

**Step 6: Test with MCP Inspector**

Run: `npm run inspect`
Expected: All 10 tools visible in inspector

**Step 7: Final commit if any formatting changes**

```bash
git add -A
git commit -m "chore: format and lint cleanup for v3.0.0"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | API constants + types | constants.ts, api.types.ts |
| 2 | Cost calculator extension | cost.calculator.ts |
| 3 | Zod schemas for new tools | tool.types.ts |
| 4 | Client: describe + upscale | ideogram.client.ts |
| 5 | Client: remix + reframe + replace-bg | ideogram.client.ts |
| 6 | Describe tool handler | tools/describe.ts |
| 7 | Upscale tool handler | tools/upscale.ts |
| 8 | Remix tool handler | tools/remix.ts |
| 9 | Reframe tool handler | tools/reframe.ts |
| 10 | Replace Background tool handler | tools/replace-background.ts |
| 11 | Register all 10 tools | tools/index.ts |
| 12 | Tests: describe | tools.test.ts |
| 13 | Tests: upscale/remix/reframe/replace-bg | tools.test.ts |
| 14 | Tests: client methods | ideogram.client.test.ts |
| 15 | Tests: validation schemas | validation.test.ts |
| 16 | Tests: integration | server.test.ts |
| 17 | Character Reference support | multiple files |
| 18 | Edit V3 migration | multiple files |
| 19 | Documentation update | API.md, README.md |
| 20 | Final verification | all |

/**
 * Cost Calculator Service
 *
 * Provides local cost estimation for Ideogram API operations.
 *
 * IMPORTANT: The Ideogram API does NOT return cost information in responses.
 * All costs calculated by this service are ESTIMATES based on known pricing tiers.
 * Actual costs may vary depending on your Ideogram subscription plan.
 *
 * Pricing is based on rendering speed:
 * - FLASH: Fastest, lowest cost
 * - TURBO: Fast, moderate cost
 * - DEFAULT: Balanced speed/cost
 * - QUALITY: Slowest, highest cost
 */

import type { RenderingSpeed, CostEstimate } from '../types/api.types.js';
import type { CostEstimateOutput } from '../types/tool.types.js';
import {
  CREDITS_PER_IMAGE,
  EDIT_CREDITS_PER_IMAGE,
  USD_PER_CREDIT,
  DEFAULTS,
} from '../config/constants.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Parameters for calculating generation cost.
 */
export interface GenerateCostParams {
  /**
   * Number of images to generate.
   * @default 1
   */
  numImages?: number;

  /**
   * Rendering speed/quality tier.
   * @default 'DEFAULT'
   */
  renderingSpeed?: RenderingSpeed;
}

/**
 * Parameters for calculating edit cost.
 */
export interface EditCostParams {
  /**
   * Number of images to generate from the edit.
   * @default 1
   */
  numImages?: number;

  /**
   * Rendering speed/quality tier.
   * @default 'DEFAULT'
   */
  renderingSpeed?: RenderingSpeed;
}

/**
 * Options for formatting cost output.
 */
export interface CostFormatOptions {
  /**
   * Number of decimal places for USD formatting.
   * @default 4
   */
  usdDecimals?: number;

  /**
   * Number of decimal places for credits formatting.
   * @default 2
   */
  creditsDecimals?: number;
}

// =============================================================================
// Cost Calculation Functions
// =============================================================================

/**
 * Calculates the estimated cost for an image generation operation.
 *
 * @param params - Generation cost parameters
 * @returns Cost estimate with credits and USD
 *
 * @example
 * ```typescript
 * // Single image with default settings
 * const cost = calculateCost({ numImages: 1 });
 * // { credits_used: 0.1, estimated_usd: 0.005, pricing_tier: 'DEFAULT', num_images: 1 }
 *
 * // Multiple high-quality images
 * const cost = calculateCost({
 *   numImages: 4,
 *   renderingSpeed: 'QUALITY',
 * });
 * // { credits_used: 0.8, estimated_usd: 0.04, pricing_tier: 'QUALITY', num_images: 4 }
 * ```
 */
export function calculateCost(params: GenerateCostParams = {}): CostEstimate {
  const numImages = params.numImages ?? DEFAULTS.NUM_IMAGES;
  const renderingSpeed = params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED;

  // Get credits per image for the rendering speed
  const creditsPerImage = CREDITS_PER_IMAGE[renderingSpeed];

  // Calculate total credits
  const creditsUsed = creditsPerImage * numImages;

  // Calculate estimated USD
  const estimatedUsd = creditsUsed * USD_PER_CREDIT;

  return {
    credits_used: roundCredits(creditsUsed),
    estimated_usd: roundUsd(estimatedUsd),
    pricing_tier: renderingSpeed,
    num_images: numImages,
  };
}

/**
 * Calculates the estimated cost for an image edit operation.
 * Edit operations typically cost more than generation.
 *
 * @param params - Edit cost parameters
 * @returns Cost estimate with credits and USD
 *
 * @example
 * ```typescript
 * // Inpainting with default settings
 * const cost = calculateEditCost({ numImages: 1 });
 * // { credits_used: 0.12, estimated_usd: 0.006, pricing_tier: 'DEFAULT', num_images: 1 }
 *
 * // Outpainting multiple images
 * const cost = calculateEditCost({
 *   numImages: 2,
 *   renderingSpeed: 'TURBO',
 * });
 * // { credits_used: 0.2, estimated_usd: 0.01, pricing_tier: 'TURBO', num_images: 2 }
 * ```
 */
export function calculateEditCost(params: EditCostParams = {}): CostEstimate {
  const numImages = params.numImages ?? DEFAULTS.NUM_IMAGES;
  const renderingSpeed = params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED;

  // Get credits per image for edit operations
  const creditsPerImage = EDIT_CREDITS_PER_IMAGE[renderingSpeed];

  // Calculate total credits
  const creditsUsed = creditsPerImage * numImages;

  // Calculate estimated USD
  const estimatedUsd = creditsUsed * USD_PER_CREDIT;

  return {
    credits_used: roundCredits(creditsUsed),
    estimated_usd: roundUsd(estimatedUsd),
    pricing_tier: renderingSpeed,
    num_images: numImages,
  };
}

/**
 * Gets the credits required per image for a given rendering speed.
 *
 * @param renderingSpeed - The rendering speed tier
 * @returns Credits per image
 *
 * @example
 * ```typescript
 * getCreditsPerImage('FLASH');   // 0.04
 * getCreditsPerImage('TURBO');   // 0.08
 * getCreditsPerImage('DEFAULT'); // 0.1
 * getCreditsPerImage('QUALITY'); // 0.2
 * ```
 */
export function getCreditsPerImage(
  renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
): number {
  return CREDITS_PER_IMAGE[renderingSpeed];
}

/**
 * Gets the edit credits required per image for a given rendering speed.
 *
 * @param renderingSpeed - The rendering speed tier
 * @returns Credits per image for edit operations
 *
 * @example
 * ```typescript
 * getEditCreditsPerImage('FLASH');   // 0.06
 * getEditCreditsPerImage('TURBO');   // 0.1
 * getEditCreditsPerImage('DEFAULT'); // 0.12
 * getEditCreditsPerImage('QUALITY'); // 0.24
 * ```
 */
export function getEditCreditsPerImage(
  renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
): number {
  return EDIT_CREDITS_PER_IMAGE[renderingSpeed];
}

/**
 * Converts credits to estimated USD.
 *
 * @param credits - Number of credits
 * @returns Estimated USD cost
 *
 * @example
 * ```typescript
 * creditsToUsd(1);    // 0.05
 * creditsToUsd(0.5);  // 0.025
 * creditsToUsd(10);   // 0.5
 * ```
 */
export function creditsToUsd(credits: number): number {
  return roundUsd(credits * USD_PER_CREDIT);
}

/**
 * Converts USD to estimated credits.
 *
 * @param usd - USD amount
 * @returns Estimated credits
 *
 * @example
 * ```typescript
 * usdToCredits(0.05);  // 1
 * usdToCredits(0.025); // 0.5
 * usdToCredits(0.5);   // 10
 * ```
 */
export function usdToCredits(usd: number): number {
  return roundCredits(usd / USD_PER_CREDIT);
}

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Formats a cost estimate as a human-readable string.
 *
 * @param cost - The cost estimate to format
 * @returns Human-readable cost string
 *
 * @example
 * ```typescript
 * formatCost({ credits_used: 0.4, estimated_usd: 0.02, pricing_tier: 'DEFAULT', num_images: 4 });
 * // "4 images × DEFAULT: 0.40 credits (~$0.0200 USD)"
 * ```
 */
export function formatCost(cost: CostEstimate | CostEstimateOutput): string {
  const creditsStr = cost.credits_used.toFixed(2);
  const usdStr = cost.estimated_usd.toFixed(4);
  return `${cost.num_images} image${cost.num_images === 1 ? '' : 's'} × ${cost.pricing_tier}: ${creditsStr} credits (~$${usdStr} USD)`;
}

/**
 * Formats a cost estimate as a short summary string.
 *
 * @param cost - The cost estimate to format
 * @returns Short cost summary
 *
 * @example
 * ```typescript
 * formatCostShort({ credits_used: 0.4, estimated_usd: 0.02, pricing_tier: 'DEFAULT', num_images: 4 });
 * // "~$0.02"
 * ```
 */
export function formatCostShort(cost: CostEstimate | CostEstimateOutput): string {
  // Show 2 decimal places for amounts >= $0.01, 4 for smaller amounts
  const decimals = cost.estimated_usd >= 0.01 ? 2 : 4;
  return `~$${cost.estimated_usd.toFixed(decimals)}`;
}

/**
 * Converts a CostEstimate to CostEstimateOutput format for tool responses.
 * These are currently the same structure, but this function provides
 * type safety and future-proofing.
 *
 * @param cost - The cost estimate from calculation
 * @returns Cost estimate in tool output format
 */
export function toCostEstimateOutput(cost: CostEstimate): CostEstimateOutput {
  return {
    credits_used: cost.credits_used,
    estimated_usd: cost.estimated_usd,
    pricing_tier: cost.pricing_tier,
    num_images: cost.num_images,
  };
}

// =============================================================================
// Estimation Functions
// =============================================================================

/**
 * Estimates the maximum number of images that can be generated
 * within a given credit budget.
 *
 * @param creditBudget - Available credits
 * @param renderingSpeed - Rendering speed tier
 * @returns Maximum number of images (floored to whole number)
 *
 * @example
 * ```typescript
 * estimateImagesFromBudget(1, 'DEFAULT'); // 10 images
 * estimateImagesFromBudget(1, 'QUALITY'); // 5 images
 * estimateImagesFromBudget(0.5, 'FLASH'); // 12 images
 * ```
 */
export function estimateImagesFromBudget(
  creditBudget: number,
  renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
): number {
  const creditsPerImage = CREDITS_PER_IMAGE[renderingSpeed];
  return Math.floor(creditBudget / creditsPerImage);
}

/**
 * Estimates the maximum number of edit operations that can be performed
 * within a given credit budget.
 *
 * @param creditBudget - Available credits
 * @param renderingSpeed - Rendering speed tier
 * @returns Maximum number of edit operations (floored to whole number)
 *
 * @example
 * ```typescript
 * estimateEditsFromBudget(1, 'DEFAULT'); // 8 edits
 * estimateEditsFromBudget(1, 'QUALITY'); // 4 edits
 * estimateEditsFromBudget(0.5, 'FLASH'); // 8 edits
 * ```
 */
export function estimateEditsFromBudget(
  creditBudget: number,
  renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
): number {
  const creditsPerImage = EDIT_CREDITS_PER_IMAGE[renderingSpeed];
  return Math.floor(creditBudget / creditsPerImage);
}

/**
 * Compares the cost of different rendering speed options.
 *
 * @param numImages - Number of images to generate
 * @returns Array of cost estimates for each rendering speed, sorted by cost
 *
 * @example
 * ```typescript
 * const comparison = comparePricingTiers(4);
 * // [
 * //   { credits_used: 0.16, estimated_usd: 0.008, pricing_tier: 'FLASH', num_images: 4 },
 * //   { credits_used: 0.32, estimated_usd: 0.016, pricing_tier: 'TURBO', num_images: 4 },
 * //   { credits_used: 0.4, estimated_usd: 0.02, pricing_tier: 'DEFAULT', num_images: 4 },
 * //   { credits_used: 0.8, estimated_usd: 0.04, pricing_tier: 'QUALITY', num_images: 4 },
 * // ]
 * ```
 */
export function comparePricingTiers(numImages: number = 1): CostEstimate[] {
  const speeds: RenderingSpeed[] = ['FLASH', 'TURBO', 'DEFAULT', 'QUALITY'];
  return speeds.map((renderingSpeed) => calculateCost({ numImages, renderingSpeed }));
}

/**
 * Compares the cost of different rendering speed options for edit operations.
 *
 * @param numImages - Number of images to generate from each edit
 * @returns Array of cost estimates for each rendering speed, sorted by cost
 */
export function compareEditPricingTiers(numImages: number = 1): CostEstimate[] {
  const speeds: RenderingSpeed[] = ['FLASH', 'TURBO', 'DEFAULT', 'QUALITY'];
  return speeds.map((renderingSpeed) => calculateEditCost({ numImages, renderingSpeed }));
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Gets the current USD per credit rate used for calculations.
 *
 * @returns USD per credit rate
 */
export function getUsdPerCredit(): number {
  return USD_PER_CREDIT;
}

/**
 * Validates that a rendering speed is a valid option.
 *
 * @param speed - The rendering speed to validate
 * @returns True if valid, false otherwise
 */
export function isValidRenderingSpeed(speed: string): speed is RenderingSpeed {
  return ['FLASH', 'TURBO', 'DEFAULT', 'QUALITY'].includes(speed);
}

/**
 * Gets the default rendering speed.
 *
 * @returns Default rendering speed
 */
export function getDefaultRenderingSpeed(): RenderingSpeed {
  return DEFAULTS.RENDERING_SPEED;
}

// =============================================================================
// Private Helper Functions
// =============================================================================

/**
 * Rounds credits to 2 decimal places to avoid floating point issues.
 */
function roundCredits(credits: number): number {
  return Math.round(credits * 100) / 100;
}

/**
 * Rounds USD to 4 decimal places to maintain precision for small amounts.
 */
function roundUsd(usd: number): number {
  return Math.round(usd * 10000) / 10000;
}

// =============================================================================
// CostCalculator Class (Alternative OOP API)
// =============================================================================

/**
 * Cost calculator class providing an object-oriented interface.
 * Useful when you want to customize the pricing rates or need to
 * track costs across multiple operations.
 *
 * @example
 * ```typescript
 * const calculator = new CostCalculator();
 *
 * // Calculate individual costs
 * const cost1 = calculator.calculateGenerateCost(4, 'QUALITY');
 * const cost2 = calculator.calculateEditCost(2, 'DEFAULT');
 *
 * // Get total
 * console.log(`Total: ${calculator.getTotalCredits()} credits`);
 * console.log(`Total: $${calculator.getTotalUsd()} USD`);
 * ```
 */
export class CostCalculator {
  private totalCredits: number = 0;
  private totalUsd: number = 0;
  private operationCount: number = 0;

  /**
   * Calculates and tracks the cost for a generate operation.
   *
   * @param numImages - Number of images to generate
   * @param renderingSpeed - Rendering speed tier
   * @returns Cost estimate for this operation
   */
  calculateGenerateCost(
    numImages: number = 1,
    renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
  ): CostEstimate {
    const cost = calculateCost({ numImages, renderingSpeed });
    this.addCost(cost);
    return cost;
  }

  /**
   * Calculates and tracks the cost for an edit operation.
   *
   * @param numImages - Number of images to generate
   * @param renderingSpeed - Rendering speed tier
   * @returns Cost estimate for this operation
   */
  calculateEditCost(
    numImages: number = 1,
    renderingSpeed: RenderingSpeed = DEFAULTS.RENDERING_SPEED
  ): CostEstimate {
    const cost = calculateEditCost({ numImages, renderingSpeed });
    this.addCost(cost);
    return cost;
  }

  /**
   * Gets the total credits used across all tracked operations.
   */
  getTotalCredits(): number {
    return roundCredits(this.totalCredits);
  }

  /**
   * Gets the total estimated USD across all tracked operations.
   */
  getTotalUsd(): number {
    return roundUsd(this.totalUsd);
  }

  /**
   * Gets the number of operations tracked.
   */
  getOperationCount(): number {
    return this.operationCount;
  }

  /**
   * Resets the tracked totals to zero.
   */
  reset(): void {
    this.totalCredits = 0;
    this.totalUsd = 0;
    this.operationCount = 0;
  }

  /**
   * Gets a summary of all tracked costs.
   */
  getSummary(): {
    totalCredits: number;
    totalUsd: number;
    operationCount: number;
    formattedTotal: string;
  } {
    return {
      totalCredits: this.getTotalCredits(),
      totalUsd: this.getTotalUsd(),
      operationCount: this.operationCount,
      formattedTotal: `${this.operationCount} operations: ${this.getTotalCredits()} credits (~$${this.getTotalUsd().toFixed(4)} USD)`,
    };
  }

  /**
   * Adds a cost estimate to the running totals.
   */
  private addCost(cost: CostEstimate): void {
    this.totalCredits += cost.credits_used;
    this.totalUsd += cost.estimated_usd;
    this.operationCount++;
  }
}

/**
 * Creates a new CostCalculator instance.
 *
 * @returns New CostCalculator instance
 */
export function createCostCalculator(): CostCalculator {
  return new CostCalculator();
}

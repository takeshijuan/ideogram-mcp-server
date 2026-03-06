# Ideogram MCP Server - API Reference

Complete API reference for all tools provided by the Ideogram MCP Server.

## Table of Contents

- [Overview](#overview)
- [Tools](#tools)
  - [ideogram_generate](#ideogram_generate)
  - [ideogram_generate_async](#ideogram_generate_async)
  - [ideogram_edit](#ideogram_edit)
  - [ideogram_describe](#ideogram_describe)
  - [ideogram_upscale](#ideogram_upscale)
  - [ideogram_remix](#ideogram_remix)
  - [ideogram_reframe](#ideogram_reframe)
  - [ideogram_replace_background](#ideogram_replace_background)
  - [ideogram_get_prediction](#ideogram_get_prediction)
  - [ideogram_cancel_prediction](#ideogram_cancel_prediction)
- [Common Types](#common-types)
  - [Aspect Ratios](#aspect-ratios)
  - [Rendering Speed](#rendering-speed)
  - [Magic Prompt](#magic-prompt)
  - [Style Types](#style-types)
  - [Character Reference Images](#character-reference-images)
  - [Cost Estimates](#cost-estimates)
- [Error Handling](#error-handling)
- [Environment Variables](#environment-variables)

---

## Overview

The Ideogram MCP Server provides 10 tools for AI image generation, editing, and analysis:

| Tool | Purpose | Synchronous |
|------|---------|-------------|
| `ideogram_generate` | Generate images from text prompts | Yes |
| `ideogram_generate_async` | Queue image generation for background processing | No |
| `ideogram_edit` | Edit images using mask-based inpainting (V3 API) | Yes |
| `ideogram_describe` | Generate text descriptions from images | Yes |
| `ideogram_upscale` | Upscale images to higher resolution | Yes |
| `ideogram_remix` | Remix images with a new text prompt | Yes |
| `ideogram_reframe` | Extend images to new resolutions | Yes |
| `ideogram_replace_background` | Replace image backgrounds | Yes |
| `ideogram_get_prediction` | Check status of async generation requests | Yes |
| `ideogram_cancel_prediction` | Cancel queued async requests | Yes |

**Note:** The Ideogram API is synchronous only. The "async" tools (`ideogram_generate_async`, `ideogram_get_prediction`, `ideogram_cancel_prediction`) provide a local job queue implementation for background processing.

---

## Tools

### ideogram_generate

Generate images from text prompts using Ideogram AI v3.

#### Description

Creates high-quality AI-generated images based on text descriptions. Supports various aspect ratios, rendering quality levels, style options, and character reference images for consistency. Returns image URLs, seeds for reproducibility, and cost estimates.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Text description of the desired image (1-10,000 characters) |
| `negative_prompt` | string | No | - | Text describing what to avoid in the image (max 10,000 characters) |
| `aspect_ratio` | string | No | `"1x1"` | Image aspect ratio (see [Aspect Ratios](#aspect-ratios)) |
| `num_images` | integer | No | `1` | Number of images to generate (1-8) |
| `seed` | integer | No | - | Random seed for reproducible generation (0-2,147,483,647) |
| `rendering_speed` | string | No | `"DEFAULT"` | Quality/speed tradeoff (see [Rendering Speed](#rendering-speed)) |
| `magic_prompt` | string | No | `"AUTO"` | Prompt enhancement option (see [Magic Prompt](#magic-prompt)) |
| `style_type` | string | No | `"AUTO"` | Visual style for the image (see [Style Types](#style-types)) |
| `character_reference_images` | string[] | No | - | Up to 5 reference images for character consistency (see [Character Reference Images](#character-reference-images)) |
| `save_locally` | boolean | No | `true` | Whether to save images to local storage |

#### Response

```typescript
// Success Response
{
  success: true,
  created: "2024-01-15T10:30:00Z",  // Timestamp
  images: [
    {
      url: "https://ideogram.ai/...",     // Temporary URL (expires)
      local_path: "./ideogram_images/...", // Local path if save_locally=true
      seed: 12345,                         // Seed used for this image
      is_image_safe: true,                 // Safety filter result
      prompt: "Enhanced prompt...",        // Final prompt (if magic_prompt applied)
      resolution: "1024x1024"              // Image dimensions
    }
  ],
  total_cost: {
    credits_used: 1,
    estimated_usd: 0.04,
    pricing_tier: "DEFAULT",
    num_images: 1
  },
  num_images: 1
}

// Error Response
{
  success: false,
  error_code: "RATE_LIMITED",
  error: "Rate limit exceeded",
  user_message: "Too many requests. Please wait a moment and try again.",
  retryable: true
}
```

#### Examples

**Basic generation:**
```json
{
  "prompt": "A serene Japanese garden with cherry blossoms and a koi pond"
}
```

**High-quality panoramic:**
```json
{
  "prompt": "Dramatic sunset over mountain peaks with golden clouds",
  "aspect_ratio": "16x9",
  "rendering_speed": "QUALITY",
  "style_type": "REALISTIC"
}
```

**Multiple variations:**
```json
{
  "prompt": "Minimalist logo design for a coffee shop",
  "num_images": 4,
  "style_type": "DESIGN"
}
```

**With character reference:**
```json
{
  "prompt": "A warrior standing on a mountain top at sunrise",
  "character_reference_images": [
    "https://example.com/character_front.jpg",
    "https://example.com/character_side.jpg"
  ],
  "aspect_ratio": "16x9"
}
```

**Reproducible generation:**
```json
{
  "prompt": "A futuristic cityscape at night",
  "seed": 42,
  "aspect_ratio": "16x9"
}
```

---

### ideogram_generate_async

Queue an image generation request for background processing.

#### Description

Returns immediately with a `prediction_id` that can be used to poll for status and results using `ideogram_get_prediction`. This is a **local async implementation** since the Ideogram API is synchronous only.

Use this when you want to:
- Queue multiple generations without waiting
- Continue working while images generate in the background
- Have more control over the generation workflow

#### Parameters

All parameters from `ideogram_generate` plus:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `webhook_url` | string (URL) | No | - | Reserved for future notification support |

#### Response

```typescript
{
  success: true,
  prediction_id: "pred_abc123...",  // Unique ID for polling
  status: "queued",                  // Always "queued" on success
  eta_seconds: 30,                   // Estimated time to completion
  message: "Image generation queued successfully..."
}
```

#### Example

```json
{
  "prompt": "An astronaut exploring an alien planet",
  "num_images": 4,
  "rendering_speed": "QUALITY"
}
```

**Response:**
```json
{
  "success": true,
  "prediction_id": "pred_7f8e9d0c",
  "status": "queued",
  "eta_seconds": 45,
  "message": "Image generation queued successfully. Use ideogram_get_prediction with prediction_id \"pred_7f8e9d0c\" to check status and retrieve results."
}
```

---

### ideogram_edit

Edit specific parts of an existing image using mask-based inpainting with the Ideogram V3 API.

#### Description

Uses a mask to define which areas of an image to modify:
- **Black pixels** in mask = areas to edit/regenerate
- **White pixels** in mask = areas to preserve unchanged

The mask must be the same dimensions as the source image and contain only black and white pixels.

> **v3.0.0 Breaking Change:** This tool now uses the Ideogram V3 API. The `model` and `mode` parameters have been replaced with `rendering_speed`. Outpainting has been removed (use `ideogram_reframe` instead). Character reference images are now supported.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | **Yes** | - | Text describing the desired changes (1-10,000 characters) |
| `image` | string | **Yes** | - | Source image: URL, file path, or base64 data URL |
| `mask` | string | **Yes** | - | Mask image (black=edit, white=preserve): URL, file path, or base64 data URL |
| `num_images` | integer | No | `1` | Number of images to generate (1-8) |
| `seed` | integer | No | - | Random seed (0-2,147,483,647) |
| `rendering_speed` | string | No | `"DEFAULT"` | Quality/speed tradeoff (see [Rendering Speed](#rendering-speed)) |
| `magic_prompt` | string | No | `"AUTO"` | Prompt enhancement option (see [Magic Prompt](#magic-prompt)) |
| `style_type` | string | No | `"AUTO"` | Visual style (see [Style Types](#style-types)) |
| `character_reference_images` | string[] | No | - | Up to 5 reference images for character consistency (see [Character Reference Images](#character-reference-images)) |
| `save_locally` | boolean | No | `true` | Save images locally |

#### Response

Same structure as `ideogram_generate`:

```typescript
{
  success: true,
  created: "2024-01-15T10:30:00Z",
  images: [...],
  total_cost: {...},
  num_images: 1
}
```

#### Examples

**Inpainting - Replace sky:**
```json
{
  "prompt": "Replace with a dramatic sunset sky with orange and purple clouds",
  "image": "https://example.com/photo.jpg",
  "mask": "data:image/png;base64,..."
}
```

**Inpainting - Add object:**
```json
{
  "prompt": "Add a hot air balloon floating in the sky",
  "image": "/path/to/local/image.jpg",
  "mask": "/path/to/mask.png",
  "num_images": 3
}
```

**With character reference:**
```json
{
  "prompt": "Replace the person with the reference character",
  "image": "https://example.com/scene.jpg",
  "mask": "https://example.com/person_mask.png",
  "character_reference_images": ["https://example.com/my_character.jpg"],
  "rendering_speed": "QUALITY"
}
```

#### Notes

- The `mask` parameter is **required** for all edit operations.
- Black area in the mask must be at least 10% of the total image area.
- For extending images to new dimensions, use `ideogram_reframe` instead.

---

### ideogram_describe

Generate text descriptions from images using Ideogram AI.

#### Description

Analyzes an image and produces one or more text descriptions of its contents. Useful for understanding image content, generating alt text, or creating prompts based on existing images.

This is the simplest tool: no cost calculation, no local storage.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image` | string | **Yes** | - | Source image: URL, file path, or base64 data URL |
| `describe_model_version` | string | No | `"V_3"` | Model version to use: `"V_2"` or `"V_3"` |

#### Response

```typescript
// Success Response
{
  success: true,
  descriptions: [
    { text: "A serene Japanese garden with cherry blossoms..." },
    { text: "An overhead view of a traditional garden..." }
  ]
}

// Error Response
{
  success: false,
  error_code: "API_ERROR",
  error: "Description generation failed",
  user_message: "Failed to describe image. Please try again.",
  retryable: true
}
```

#### Examples

**Basic describe:**
```json
{
  "image": "https://example.com/photo.jpg"
}
```

**With specific model version:**
```json
{
  "image": "/path/to/local/image.png",
  "describe_model_version": "V_2"
}
```

**From base64:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

#### Notes

- Returns one or more text descriptions per image.
- No cost tracking for this tool (describe calls do not consume generation credits in the same way).
- V_3 model version generally provides more detailed descriptions.

---

### ideogram_upscale

Upscale images to higher resolution using Ideogram AI.

#### Description

Enhances image resolution with optional text prompt guidance for controlling the upscaling process. Supports configurable resemblance (similarity to original) and detail enhancement levels.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image` | string | **Yes** | - | Source image: URL, file path, or base64 data URL |
| `prompt` | string | No | - | Text prompt for guided upscaling |
| `resemblance` | integer | No | `50` | Similarity to original image (0-100, higher = more similar) |
| `detail` | integer | No | `50` | Level of detail enhancement (0-100, higher = more detail) |
| `magic_prompt` | string | No | `"AUTO"` | Prompt enhancement option (see [Magic Prompt](#magic-prompt)) |
| `num_images` | integer | No | `1` | Number of upscaled variants (1-8) |
| `seed` | integer | No | - | Random seed (0-2,147,483,647) |
| `save_locally` | boolean | No | `true` | Save images locally |

#### Response

Same structure as `ideogram_generate`:

```typescript
{
  success: true,
  created: "2024-01-15T10:30:00Z",
  images: [
    {
      url: "https://ideogram.ai/...",
      local_path: "./ideogram_images/...",
      seed: 12345,
      is_image_safe: true,
      prompt: "...",
      resolution: "2048x2048"
    }
  ],
  total_cost: {
    credits_used: 1,
    estimated_usd: 0.04,
    pricing_tier: "UPSCALE",
    num_images: 1
  },
  num_images: 1
}
```

#### Examples

**Basic upscale:**
```json
{
  "image": "https://example.com/low-res-photo.jpg"
}
```

**Guided upscale with high detail:**
```json
{
  "image": "/path/to/image.png",
  "prompt": "High detail landscape photography",
  "resemblance": 70,
  "detail": 80,
  "magic_prompt": "ON"
}
```

**Multiple upscaled variants:**
```json
{
  "image": "https://example.com/photo.jpg",
  "num_images": 3,
  "detail": 90
}
```

#### Notes

- `resemblance` controls how closely the upscaled image matches the original. Lower values allow more creative reinterpretation.
- `detail` controls how much fine detail is added during upscaling. Higher values produce sharper, more detailed results.
- Unlike generation tools, upscale does not have a `rendering_speed` parameter.

---

### ideogram_remix

Remix an existing image based on a new text prompt using Ideogram AI v3.

#### Description

Takes an existing image and transforms it according to a new text description, blending the original image with the new concept. The `image_weight` parameter controls how much influence the original image has on the result.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image` | string | **Yes** | - | Source image: URL, file path, or base64 data URL |
| `prompt` | string | **Yes** | - | Text describing the desired transformation (1-10,000 characters) |
| `image_weight` | integer | No | `50` | Influence of original image (0-100, higher = more influence) |
| `negative_prompt` | string | No | - | Text describing what to avoid (max 10,000 characters) |
| `aspect_ratio` | string | No | - | Image aspect ratio (see [Aspect Ratios](#aspect-ratios)) |
| `num_images` | integer | No | `1` | Number of remixed images (1-8) |
| `seed` | integer | No | - | Random seed (0-2,147,483,647) |
| `rendering_speed` | string | No | `"DEFAULT"` | Quality/speed tradeoff (see [Rendering Speed](#rendering-speed)) |
| `magic_prompt` | string | No | `"AUTO"` | Prompt enhancement option (see [Magic Prompt](#magic-prompt)) |
| `style_type` | string | No | - | Visual style (see [Style Types](#style-types)) |
| `character_reference_images` | string[] | No | - | Up to 5 reference images for character consistency (see [Character Reference Images](#character-reference-images)) |
| `save_locally` | boolean | No | `true` | Save images locally |

#### Response

Same structure as `ideogram_generate`:

```typescript
{
  success: true,
  created: "2024-01-15T10:30:00Z",
  images: [...],
  total_cost: {
    credits_used: 1,
    estimated_usd: 0.04,
    pricing_tier: "DEFAULT",
    num_images: 1
  },
  num_images: 1
}
```

#### Examples

**Basic remix:**
```json
{
  "image": "https://example.com/photo.jpg",
  "prompt": "Transform into a watercolor painting"
}
```

**Style transformation with high original influence:**
```json
{
  "image": "/path/to/portrait.jpg",
  "prompt": "A cyberpunk version of this scene with neon lights",
  "image_weight": 70,
  "aspect_ratio": "16x9",
  "rendering_speed": "QUALITY",
  "style_type": "FICTION"
}
```

**Remix with character reference:**
```json
{
  "image": "https://example.com/scene.jpg",
  "prompt": "Replace the main character with the referenced character in anime style",
  "character_reference_images": ["https://example.com/my_character.jpg"],
  "image_weight": 40,
  "style_type": "GENERAL"
}
```

#### Notes

- `image_weight` at 0 means the result is entirely prompt-driven (ignores original image). At 100, the result closely resembles the original.
- Remix supports all features available in generate (aspect ratios, styles, magic prompt, character references).

---

### ideogram_reframe

Extend images to new resolutions via intelligent outpainting using Ideogram AI v3.

#### Description

Reframes an existing image to fit a new target resolution, intelligently filling in any new areas with contextually appropriate content. This is the V3 replacement for the legacy outpainting feature.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image` | string | **Yes** | - | Source image: URL, file path, or base64 data URL |
| `resolution` | string | **Yes** | - | Target resolution (e.g., `"1024x768"`, `"1920x1080"`) |
| `num_images` | integer | No | `1` | Number of reframed variants (1-8) |
| `seed` | integer | No | - | Random seed (0-2,147,483,647) |
| `rendering_speed` | string | No | `"DEFAULT"` | Quality/speed tradeoff (see [Rendering Speed](#rendering-speed)) |
| `save_locally` | boolean | No | `true` | Save images locally |

#### Response

Same structure as `ideogram_generate`:

```typescript
{
  success: true,
  created: "2024-01-15T10:30:00Z",
  images: [
    {
      url: "https://ideogram.ai/...",
      local_path: "./ideogram_images/...",
      seed: 12345,
      is_image_safe: true,
      resolution: "1920x1080"
    }
  ],
  total_cost: {
    credits_used: 1,
    estimated_usd: 0.04,
    pricing_tier: "DEFAULT",
    num_images: 1
  },
  num_images: 1
}
```

#### Examples

**Extend to widescreen:**
```json
{
  "image": "https://example.com/square-photo.jpg",
  "resolution": "1920x1080"
}
```

**High-quality reframe with variants:**
```json
{
  "image": "/path/to/portrait.jpg",
  "resolution": "1024x768",
  "rendering_speed": "QUALITY",
  "num_images": 3
}
```

#### Notes

- This tool does not accept a `prompt` parameter. The AI automatically generates contextually appropriate content for the extended areas.
- Use this tool instead of the legacy outpainting mode that was previously available in `ideogram_edit`.
- The resolution string format is `"WIDTHxHEIGHT"` (e.g., `"1920x1080"`).

---

### ideogram_replace_background

Replace the background of an image while preserving the foreground subject using Ideogram AI v3.

#### Description

Automatically detects and preserves the foreground subject(s) in an image, then replaces the background based on a text description. No mask is needed -- the AI handles foreground/background separation automatically.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image` | string | **Yes** | - | Source image: URL, file path, or base64 data URL |
| `prompt` | string | **Yes** | - | Text describing the desired new background (1-10,000 characters) |
| `magic_prompt` | string | No | `"AUTO"` | Prompt enhancement option (see [Magic Prompt](#magic-prompt)) |
| `num_images` | integer | No | `1` | Number of variants (1-8) |
| `seed` | integer | No | - | Random seed (0-2,147,483,647) |
| `rendering_speed` | string | No | `"DEFAULT"` | Quality/speed tradeoff (see [Rendering Speed](#rendering-speed)) |
| `save_locally` | boolean | No | `true` | Save images locally |

#### Response

Same structure as `ideogram_generate`:

```typescript
{
  success: true,
  created: "2024-01-15T10:30:00Z",
  images: [...],
  total_cost: {
    credits_used: 1,
    estimated_usd: 0.04,
    pricing_tier: "DEFAULT",
    num_images: 1
  },
  num_images: 1
}
```

#### Examples

**Basic background replacement:**
```json
{
  "image": "https://example.com/portrait.jpg",
  "prompt": "A tropical beach at sunset with palm trees"
}
```

**Professional product shot:**
```json
{
  "image": "/path/to/product.jpg",
  "prompt": "Clean white studio background with soft lighting",
  "rendering_speed": "QUALITY",
  "magic_prompt": "ON"
}
```

**Multiple background variants:**
```json
{
  "image": "https://example.com/selfie.jpg",
  "prompt": "Standing in a futuristic city with flying cars",
  "num_images": 4
}
```

#### Notes

- No mask is required. The AI automatically detects foreground subjects.
- Works best with images that have clear foreground/background separation (e.g., portraits, product photos).
- Does not support `style_type` or `negative_prompt` parameters.

---

### ideogram_get_prediction

Check the status of an async image generation request.

#### Description

Polls the local job queue to check the status of a prediction created with `ideogram_generate_async`. Use this to monitor progress and retrieve completed results.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prediction_id` | string | **Yes** | The unique ID returned from `ideogram_generate_async` |

#### Response

**Processing (queued or in-progress):**
```typescript
{
  success: true,
  prediction_id: "pred_abc123",
  status: "queued" | "processing",
  eta_seconds: 25,      // Estimated time remaining
  progress: 40,         // Percentage complete (0-100)
  message: "Prediction is processing. Please poll again in a few seconds."
}
```

**Completed:**
```typescript
{
  success: true,
  prediction_id: "pred_abc123",
  status: "completed",
  created: "2024-01-15T10:30:00Z",
  images: [
    {
      url: "https://ideogram.ai/...",
      seed: 12345,
      is_image_safe: true,
      prompt: "Enhanced prompt...",
      resolution: "1024x1024"
    }
  ],
  total_cost: {
    credits_used: 1,
    estimated_usd: 0.04,
    pricing_tier: "DEFAULT",
    num_images: 1
  },
  num_images: 1
}
```

**Failed or Cancelled:**
```typescript
{
  success: false,
  prediction_id: "pred_abc123",
  status: "failed" | "cancelled",
  error: {
    code: "API_ERROR",
    message: "Ideogram API returned an error",
    retryable: true
  },
  message: "Prediction failed: Ideogram API returned an error. This error may be retryable."
}
```

#### Example Workflow

```typescript
// 1. Queue an async generation
const queueResult = await ideogram_generate_async({
  prompt: "A magical forest"
});
const predictionId = queueResult.prediction_id;

// 2. Poll until complete
let result;
do {
  result = await ideogram_get_prediction({
    prediction_id: predictionId
  });

  if (result.status === "queued" || result.status === "processing") {
    await sleep(5000); // Wait 5 seconds before polling again
  }
} while (result.status === "queued" || result.status === "processing");

// 3. Handle result
if (result.status === "completed") {
  console.log("Images:", result.images);
} else {
  console.error("Failed:", result.error);
}
```

---

### ideogram_cancel_prediction

Cancel a queued async image generation request.

#### Description

Cancels a prediction that was created with `ideogram_generate_async`. **Only works for predictions in `queued` status.** Once a prediction starts processing (submitted to the Ideogram API), it cannot be cancelled.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prediction_id` | string | **Yes** | The unique ID to cancel |

#### Response

**Successfully Cancelled:**
```typescript
{
  success: true,
  prediction_id: "pred_abc123",
  status: "cancelled",
  message: "Prediction successfully cancelled. No credits will be used."
}
```

**Cannot Cancel:**
```typescript
{
  success: false,
  prediction_id: "pred_abc123",
  status: "processing" | "completed" | "failed",
  reason: "Cannot cancel - prediction is already being processed",
  message: "Cannot cancel this prediction because it is already being processed by the Ideogram API."
}
```

#### Example

```json
{
  "prediction_id": "pred_7f8e9d0c"
}
```

---

## Common Types

### Aspect Ratios

All 15 supported aspect ratios for image generation:

| Ratio | Use Case |
|-------|----------|
| `1x1` | Square images, profile pictures, social media posts |
| `16x9` | Widescreen, YouTube thumbnails, presentations |
| `9x16` | Vertical video, Instagram/TikTok stories |
| `4x3` | Traditional photo format |
| `3x4` | Portrait orientation |
| `3x2` | DSLR photo aspect |
| `2x3` | Portrait DSLR |
| `4x5` | Instagram portrait post |
| `5x4` | Landscape photo |
| `1x2` | Tall vertical |
| `2x1` | Wide horizontal |
| `1x3` | Very tall vertical |
| `3x1` | Very wide horizontal |
| `10x16` | Tall portrait |
| `16x10` | Wide landscape |

**Note:** Use "x" separator (e.g., `"16x9"`), not ":" (e.g., ~~`"16:9"`~~).

### Rendering Speed

Controls the quality/speed tradeoff:

| Value | Speed | Quality | Credits | Best For |
|-------|-------|---------|---------|----------|
| `FLASH` | Fastest | Lower | Lowest | Quick iterations, drafts |
| `TURBO` | Fast | Good | Low | Balanced speed/quality |
| `DEFAULT` | Balanced | High | Medium | General use |
| `QUALITY` | Slowest | Highest | Highest | Final renders, professional work |

### Magic Prompt

Automatic prompt enhancement options:

| Value | Behavior |
|-------|----------|
| `AUTO` | Let Ideogram decide based on prompt complexity |
| `ON` | Always enhance the prompt for better results |
| `OFF` | Use the prompt exactly as provided |

Magic prompt enhancement adds details and artistic direction to improve generation quality.

### Style Types

Visual style presets:

| Value | Description |
|-------|-------------|
| `AUTO` | Let Ideogram choose the best style |
| `GENERAL` | Versatile, balanced style |
| `REALISTIC` | Photorealistic, lifelike images |
| `DESIGN` | Clean, graphic design aesthetic |
| `FICTION` | Artistic, imaginative style |

### Character Reference Images

Character reference images allow you to maintain visual consistency of characters across multiple generations. Provide up to 5 reference images showing the character you want to appear in the generated output.

**Supported by:** `ideogram_generate`, `ideogram_edit`, `ideogram_remix`

**How to use:**
- Provide 1-5 images as URLs, file paths, or base64 data URLs
- Reference images should clearly show the character from different angles for best results
- The AI will attempt to reproduce the character's appearance in the generated image

**Example:**
```json
{
  "character_reference_images": [
    "https://example.com/character_front.jpg",
    "https://example.com/character_side.jpg",
    "/path/to/character_back.png"
  ]
}
```

### Cost Estimates

All generation responses include cost information:

```typescript
{
  credits_used: number,     // Estimated credits consumed
  estimated_usd: number,    // Estimated cost in USD
  pricing_tier: string,     // Rendering speed used
  num_images: number        // Number of images in request
}
```

**Note:** Cost estimates are calculated locally based on known Ideogram pricing. The Ideogram API does not return actual cost data.

---

## Error Handling

All tools return structured error responses when something goes wrong:

```typescript
{
  success: false,
  error_code: string,      // Programmatic error identifier
  error: string,           // Technical error message
  user_message: string,    // User-friendly explanation
  retryable: boolean,      // Whether the operation can be retried
  details?: object         // Additional error information
}
```

### Common Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_API_KEY` | API key is missing or invalid | No |
| `RATE_LIMITED` | Too many requests | Yes |
| `INSUFFICIENT_CREDITS` | Not enough credits | No |
| `VALIDATION_ERROR` | Invalid input parameters | No |
| `NETWORK_ERROR` | Connection issues | Yes |
| `TIMEOUT` | Request timed out | Yes |
| `API_ERROR` | Ideogram API error | Maybe |
| `NOT_FOUND` | Prediction not found | No |
| `INTERNAL_ERROR` | Server error | Yes |

### Error Handling Example

```typescript
const result = await ideogram_generate({
  prompt: "A beautiful sunset"
});

if (!result.success) {
  console.error(`Error: ${result.user_message}`);

  if (result.retryable) {
    // Implement retry logic
    await sleep(5000);
    return retry();
  } else {
    // Handle non-retryable error
    throw new Error(result.error);
  }
}
```

---

## Environment Variables

Configure the server using these environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `IDEOGRAM_API_KEY` | **Yes** | - | Your Ideogram API key |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `LOCAL_SAVE_DIR` | No | `./ideogram_images` | Directory for saved images |
| `ENABLE_LOCAL_SAVE` | No | `true` | Enable automatic local saving |
| `MAX_CONCURRENT_REQUESTS` | No | `3` | Rate limiting |
| `REQUEST_TIMEOUT_MS` | No | `30000` | API timeout (ms) |

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "ideogram": {
      "command": "node",
      "args": ["/path/to/ideogram-mcp-server/dist/index.js"],
      "env": {
        "IDEOGRAM_API_KEY": "your_api_key_here",
        "LOG_LEVEL": "info",
        "LOCAL_SAVE_DIR": "./my_images",
        "ENABLE_LOCAL_SAVE": "true"
      }
    }
  }
}
```

---

## See Also

- [Quickstart Guide](./QUICKSTART.md) - Get started in 5 minutes
- [README](../README.md) - Project overview and installation
- [Ideogram API Documentation](https://developer.ideogram.ai/) - Official Ideogram API docs

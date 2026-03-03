# v3.0.0 Full Ideogram API Coverage Design

**Date**: 2026-03-03
**Status**: Approved
**Author**: Claude Code + takeshi

## Goal

Achieve full Ideogram API coverage by adding 5 new tools (Describe, Upscale, Remix, Reframe, Replace Background) and Character Reference support to existing tools, releasing as v3.0.0.

## Current State

- 5 MVP tools: Generate, Edit (inpaint), Generate Async, Get Prediction, Cancel Prediction
- v2.1.0 released
- Stable TypeScript strict mode codebase with comprehensive tests

## Scope

### New Tools (5)

| Tool | API Endpoint | Input | Output |
|------|-------------|-------|--------|
| `ideogram_describe` | `POST /describe` | image | text descriptions |
| `ideogram_upscale` | `POST /upscale` | image + resemblance/detail | image URLs |
| `ideogram_remix` | `POST /v1/ideogram-v3/remix` | image + prompt + image_weight | image URLs |
| `ideogram_reframe` | `POST /v1/ideogram-v3/reframe` | image + resolution | image URLs |
| `ideogram_replace_background` | `POST /v1/ideogram-v3/replace-background` | image + prompt | image URLs |

### Existing Tool Changes

- `ideogram_generate`: Add `character_reference_images` parameter
- `ideogram_edit`: Migrate to V3 endpoint (`/v1/ideogram-v3/edit`) + Character Reference support

### New async variants: None (sync only for new tools)

## Tool Specifications

### ideogram_describe

Generates text descriptions from images. Useful for understanding image composition and generating prompts.

**Input Schema:**
```typescript
{
  image: string;                          // URL, base64 data URL, or file path
  describe_model_version?: "V_2" | "V_3"; // Default: "V_3"
}
```

**Output:**
```typescript
{
  success: true;
  descriptions: Array<{ text: string }>;
}
```

**Notes:**
- No cost calculation (low/free cost)
- No local save (text output only)
- FormData: `image_file` binary + `describe_model_version` field

### ideogram_upscale

Upscales images with optional prompt guidance.

**Input Schema:**
```typescript
{
  image: string;           // URL, base64 data URL, or file path
  prompt?: string;         // Optional guidance text
  resemblance?: number;    // 0-100, default 50
  detail?: number;         // 0-100, default 50
  magic_prompt?: "AUTO" | "ON" | "OFF";
  num_images?: number;     // 1-8, default 1
  seed?: number;
  save_locally?: boolean;  // Default true
}
```

**Output:** Same as Generate (images array + cost estimate)

**Notes:**
- Legacy API path (`/upscale`)
- FormData: `image_request` JSON string + `image_file` binary
- Upscale-specific cost rate

### ideogram_remix

Modifies existing images based on a new prompt while preserving influence from the original.

**Input Schema:**
```typescript
{
  image: string;                          // Source image
  prompt: string;                         // New prompt
  image_weight?: number;                  // 0-100, default 50
  aspect_ratio?: AspectRatio;
  rendering_speed?: RenderingSpeed;
  magic_prompt?: "AUTO" | "ON" | "OFF";
  negative_prompt?: string;
  num_images?: number;                    // 1-8, default 1
  seed?: number;
  style_type?: StyleType;
  style_preset?: string;
  character_reference_images?: string[];  // Character reference images
  save_locally?: boolean;                 // Default true
}
```

**Output:** Same as Generate (images array + cost estimate)

**Notes:**
- V3 API, all fields as multipart form fields (not JSON wrapper)
- `image` is the source image binary field
- Cost same as Generate

### ideogram_reframe

Extends images to new resolutions/aspect ratios via intelligent outpainting.

**Input Schema:**
```typescript
{
  image: string;                 // Source square image
  resolution: string;            // Target resolution, e.g. "1024x768"
  num_images?: number;           // 1-8, default 1
  seed?: number;
  rendering_speed?: RenderingSpeed;
  style_preset?: string;
  save_locally?: boolean;        // Default true
}
```

**Output:** Same as Generate (images array + cost estimate)

**Notes:**
- V3 API, FormData
- `resolution` is required (not aspect_ratio)
- No prompt parameter
- Cost same as Edit

### ideogram_replace_background

Replaces image backgrounds while preserving the foreground subject.

**Input Schema:**
```typescript
{
  image: string;                 // Source image
  prompt: string;                // Desired background description
  magic_prompt?: "AUTO" | "ON" | "OFF";
  num_images?: number;           // 1-8, default 1
  seed?: number;
  rendering_speed?: RenderingSpeed;
  style_preset?: string;
  save_locally?: boolean;        // Default true
}
```

**Output:** Same as Generate (images array + cost estimate)

**Notes:**
- V3 API, FormData
- Automatic foreground detection (no mask needed)
- Cost same as Edit

### Character Reference (Generate + Edit + Remix)

**Additional parameter for existing tools:**
```typescript
{
  // ... existing params
  character_reference_images?: string[];  // URLs/base64/paths, max 10MB total
}
```

- Maintains facial features, hairstyles, and key traits across generations
- Applied to: ideogram_generate, ideogram_edit (V3), ideogram_remix

## Infrastructure Changes

### constants.ts

New endpoints:
```typescript
REMIX_V3: '/v1/ideogram-v3/remix'
REFRAME_V3: '/v1/ideogram-v3/reframe'
REPLACE_BACKGROUND_V3: '/v1/ideogram-v3/replace-background'
EDIT_V3: '/v1/ideogram-v3/edit'
UPSCALE: '/upscale'
DESCRIBE: '/describe'
```

New cost rates:
```typescript
UPSCALE_CREDITS_PER_IMAGE: { ... }  // Upscale-specific rates
DESCRIBE_CREDITS_PER_IMAGE: 0       // Free/minimal
```

### IdeogramClient

5 new public methods:
```typescript
async describe(params: DescribeParams): Promise<DescribeResponse>
async upscale(params: UpscaleParams): Promise<GenerateResponse>
async remix(params: RemixParams): Promise<GenerateResponse>
async reframe(params: ReframeParams): Promise<GenerateResponse>
async replaceBackground(params: ReplaceBackgroundParams): Promise<GenerateResponse>
```

Existing method updates:
- `generate()`: Accept `characterReferenceImages` param
- `edit()`: Migrate to V3 endpoint, accept `characterReferenceImages`

### api.types.ts

New types:
- `DescribeRequest`, `DescribeResponse`
- `UpscaleRequest`
- `RemixRequest`
- `ReframeRequest`
- `ReplaceBackgroundRequest`
- `DescribeModelVersion` union type
- `StylePreset` union type (60+ presets)
- `ResolutionV3` union type

### tool.types.ts

New Zod schemas + types for each tool's input/output.

### cost.calculator.ts

Extended `calculateCost()` to support new operation types.

## Implementation Phases

### Phase 1: Describe Tool
- Add `DESCRIBE` endpoint constant
- Add `DescribeParams`, `DescribeResponse` types
- Implement `IdeogramClient.describe()` method
- Create `src/tools/describe.ts` (tool handler)
- Add Zod schema for Describe input
- Register in `tools/index.ts`
- Unit tests for handler + client method
- Update `docs/API.md`

### Phase 2: Upscale Tool
- Add `UPSCALE` endpoint constant
- Add `UpscaleParams` type
- Implement `IdeogramClient.upscale()` method
- Create `src/tools/upscale.ts`
- Add upscale cost rates to cost calculator
- Register in `tools/index.ts`
- Unit tests
- Update `docs/API.md`

### Phase 3: Remix Tool
- Add `REMIX_V3` endpoint constant
- Add `RemixParams` type
- Implement `IdeogramClient.remix()` method
- Create `src/tools/remix.ts`
- Register in `tools/index.ts`
- Unit tests
- Update `docs/API.md`

### Phase 4: Reframe + Replace Background Tools
- Add `REFRAME_V3`, `REPLACE_BACKGROUND_V3` endpoint constants
- Add `ReframeParams`, `ReplaceBackgroundParams` types
- Implement `IdeogramClient.reframe()`, `replaceBackground()` methods
- Create `src/tools/reframe.ts`, `src/tools/replace-background.ts`
- Register in `tools/index.ts`
- Unit tests
- Update `docs/API.md`

### Phase 5: Character Reference Support
- Add `character_reference_images` to Generate, Edit, Remix schemas
- Update `IdeogramClient.generate()`, `edit()`, `remix()` to handle character ref images
- Update existing tests
- Update `docs/API.md`

### Phase 6: Edit V3 Migration
- Add `EDIT_V3` endpoint constant
- Migrate `IdeogramClient.edit()` to use V3 endpoint
- Update Edit tool schema for V3 parameters (rendering_speed, style_preset, etc.)
- Update tests
- Update `docs/API.md`

### Phase 7: Documentation & Release
- Update `README.md` (10 tools, new features)
- Update `docs/API.md` (complete reference)
- Ensure all tests pass with coverage targets
- Tag as v3.0.0 (breaking change: Edit V3 migration)

## Test Strategy

Each new tool follows the existing test pattern:
- **Unit tests** (`src/__tests__/unit/`): Handler logic with mocked API client
- **Client tests**: Request construction, FormData generation, error transformation
- **Integration tests**: MCP server tool registration verification

Coverage targets maintained: 90% statements, 85% branches, 75% functions.

## Breaking Changes (v3.0.0)

1. **Edit tool V3 migration**: `ideogram_edit` switches from legacy `/edit` to `/v1/ideogram-v3/edit`
   - Different parameter format (V3 multipart vs legacy flat fields)
   - New parameters available (rendering_speed, style_preset, etc.)
   - Some legacy parameters may behave differently

## References

- [Ideogram API Overview](https://developer.ideogram.ai/ideogram-api/api-overview)
- [Remix V3 Docs](https://developer.ideogram.ai/api-reference/api-reference/remix-v3)
- [Reframe V3 Docs](https://developer.ideogram.ai/api-reference/api-reference/reframe-v3)
- [Replace Background V3 Docs](https://developer.ideogram.ai/api-reference/api-reference/replace-background-v3)
- [Upscale Docs](https://developer.ideogram.ai/api-reference/api-reference/upscale)
- [Describe Docs](https://developer.ideogram.ai/api-reference/api-reference/describe)

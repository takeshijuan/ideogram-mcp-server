## [3.0.0](https://github.com/takeshijuan/ideogram-mcp-server/compare/v2.2.0...v3.0.0) (2026-03-06)


### ⚠ BREAKING CHANGES

* ideogram_edit now uses V3 API endpoint. The 'model'
parameter is replaced with 'rendering_speed'. Outpainting mode
(expand_directions, expand_pixels) has been removed. Character reference
images are now supported.

- Endpoint changed from /edit to /v1/ideogram-v3/edit
- Field name changed from image_file to image
- Uses rendering_speed (FLASH/TURBO/DEFAULT/QUALITY) instead of model
- magic_prompt field replaces magic_prompt_option
- style_type limited to V3 subset (AUTO/GENERAL/REALISTIC/DESIGN/FICTION)
- Updated all unit and integration tests for V3 format

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

* docs: update API reference and README for v3.0.0 with 10 tools

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

* style: fix formatting issues across v3 tool files

Run prettier --write to fix formatting in 8 files modified during v3 implementation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

* chore: move plan files to ~/.superpowers/plans

Plan documents are developer-local artifacts, not project source files.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

* fix: resolve MD028 blank line inside blockquote in README

Replace blank line between blockquotes with `>` continuation to satisfy
markdownlint MD028 rule.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

### ✨ Features

* v3.0.0 - Full Ideogram API coverage with 10 tools ([#12](https://github.com/takeshijuan/ideogram-mcp-server/issues/12)) ([bf64266](https://github.com/takeshijuan/ideogram-mcp-server/commit/bf64266037a264879987c1a31d3e4a456ed7c1c1))


### 🐛 Bug Fixes

* resolve high-severity security vulnerabilities in production dependencies ([#13](https://github.com/takeshijuan/ideogram-mcp-server/issues/13)) ([6e7e96d](https://github.com/takeshijuan/ideogram-mcp-server/commit/6e7e96d09e3f166c6abdac107232e852842bf579))

## [2.2.0](https://github.com/takeshijuan/ideogram-mcp-server/compare/v2.1.0...v2.2.0) (2026-02-24)


### ✨ Features

* GitHub issue templates and PR template ([#11](https://github.com/takeshijuan/ideogram-mcp-server/issues/11)) ([055b927](https://github.com/takeshijuan/ideogram-mcp-server/commit/055b927ce76cf902f97292747022ed53dcf7b508))

## [2.1.0](https://github.com/takeshijuan/ideogram-mcp-server/compare/v2.0.0...v2.1.0) (2026-02-17)


### ✨ Features

* Remotion-based promotional video ([#9](https://github.com/takeshijuan/ideogram-mcp-server/issues/9)) ([2d56dd4](https://github.com/takeshijuan/ideogram-mcp-server/commit/2d56dd49fa8c881d558d596abff67c7b480d121e)), closes [#0c0c0](https://github.com/takeshijuan/ideogram-mcp-server/issues/0c0c0)

## [2.0.0](https://github.com/takeshijuan/ideogram-mcp-server/compare/v1.0.1...v2.0.0) (2026-02-12)


### ⚠ BREAKING CHANGES

* None - all updates are backward compatible

Co-authored-by: Claude Sonnet 4.5 <noreply@anthropic.com>

### ✨ Features

* add CI/CD infrastructure for automatic npm publishing ([#6](https://github.com/takeshijuan/ideogram-mcp-server/issues/6)) ([43d6116](https://github.com/takeshijuan/ideogram-mcp-server/commit/43d61164dc0b6ca950128837852d9fd41175b85b))


### 🐛 Bug Fixes

* resolve security vulnerabilities in production dependencies ([#8](https://github.com/takeshijuan/ideogram-mcp-server/issues/8)) ([95f2df3](https://github.com/takeshijuan/ideogram-mcp-server/commit/95f2df3a01c11826a3eb816e8044a463f13dacec))

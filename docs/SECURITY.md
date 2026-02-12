# Security Guidelines

This document outlines the security practices and guidelines for the Ideogram MCP Server project.

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it by:

1. **DO NOT** open a public GitHub issue
2. Use GitHub Security Advisories:
   - Go to: https://github.com/takeshijuan/ideogram-mcp-server/security/advisories/new
   - Fill out the vulnerability details form
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices

### 1. API Key Management

**DO:**
- ✅ Store API keys in environment variables
- ✅ Use `.env` files for local development (git-ignored)
- ✅ Use GitHub Secrets for CI/CD
- ✅ Rotate keys periodically
- ✅ Use separate keys for development/production

**DON'T:**
- ❌ Commit API keys to version control
- ❌ Log API keys in application logs
- ❌ Include keys in error messages
- ❌ Share keys in public channels
- ❌ Hard-code keys in source files

### 2. Dependency Security

**Automated Checks:**
```bash
# Run security audit (CI/CD runs this automatically)
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for moderate+ vulnerabilities (fails CI)
npm audit --audit-level=moderate
```

**Manual Reviews:**
- Review dependency updates in Dependabot PRs
- Check npm advisory database: https://npmjs.com/advisories
- Use `npm outdated` to identify outdated packages

### 3. Input Validation

All user inputs are validated using Zod schemas:

```typescript
// Example: Tool input validation
const GenerateInputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  aspect_ratio: z.enum(['1x1', '16x9', ...]),
  num_images: z.number().int().min(1).max(8),
  // ...
});
```

**Validation Rules:**
- Prompt length limits (prevent API abuse)
- Enum values for options (prevent injection)
- Integer constraints for counts
- File path sanitization for local storage

### 4. File System Security

**Local File Storage:**
- Files saved to configured directory only
- Path traversal prevention via `path.resolve()`
- No execution of saved files
- Filename sanitization (remove special characters)

```typescript
// Secure path resolution
const safePath = path.resolve(LOCAL_SAVE_DIR, sanitizeFilename(filename));
if (!safePath.startsWith(path.resolve(LOCAL_SAVE_DIR))) {
  throw new Error('Invalid file path');
}
```

### 5. Network Security

**API Communication:**
- HTTPS only (Ideogram API)
- Timeout configuration (prevent hanging requests)
- Rate limiting (respect API limits)
- Retry with exponential backoff

**Headers:**
```typescript
{
  'Api-Key': process.env.IDEOGRAM_API_KEY,
  'Content-Type': 'application/json',
  'User-Agent': 'ideogram-mcp-server/VERSION'
}
```

### 6. Error Handling

**Safe Error Messages:**
- Never expose internal paths in errors
- Sanitize API error messages
- Log detailed errors internally only
- Return user-friendly messages to clients

```typescript
// Safe error handling
try {
  await ideogramApi.generate(input);
} catch (error) {
  // Log detailed error internally (not exposed)
  logger.error({ error }, 'API call failed');

  // Return safe message to user
  throw new IdeogramMCPError(
    'Failed to generate image. Please try again.',
    'API_ERROR',
    true
  );
}
```

### 7. Logging Security

**DO:**
- ✅ Log request IDs for debugging
- ✅ Log error types and codes
- ✅ Log API response status codes
- ✅ Use structured logging (JSON)

**DON'T:**
- ❌ Log API keys or tokens
- ❌ Log full request/response bodies
- ❌ Log user prompts (may contain sensitive info)
- ❌ Log file paths with user data
- ❌ Log base64 image data

### 8. CI/CD Security

**GitHub Actions:**
```yaml
permissions:
  contents: write      # For git commits/tags
  id-token: write      # For npm provenance
```

**Secret Management:**
- Secrets stored in GitHub repository settings
- Never print secrets in logs (`echo $SECRET` ❌)
- Use secret scanning tools
- Rotate secrets if exposed

**NPM Publishing:**
- Provenance enabled (`--provenance` flag)
- 2FA required for maintainers
- Audit dependencies before publish
- Verify package contents before release

### 9. TypeScript Security

**Strict Mode Configuration:**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true
}
```

**Benefits:**
- Prevents type-related vulnerabilities
- Forces explicit null/undefined handling
- Catches index access errors
- Enforces type safety in API boundaries

### 10. MCP Server Security

**Sandboxing:**
- MCP servers run in isolated processes
- No direct file system access beyond configured directories
- Resource limits (memory, CPU)
- Process termination on errors

**Client Validation:**
- Validate all incoming requests
- Rate limit tool calls
- Timeout long-running operations
- Graceful error handling

## Security Checklist for Contributors

Before submitting a PR, verify:

- [ ] No hardcoded secrets or API keys
- [ ] All user inputs validated with Zod
- [ ] Error messages don't expose internal details
- [ ] File operations use safe path resolution
- [ ] No new dependencies without security review
- [ ] Tests cover security-critical code paths
- [ ] Logging doesn't expose sensitive data
- [ ] TypeScript strict mode passes

## Incident Response

If a security issue is discovered in production:

1. **Assess** - Determine severity and impact
2. **Mitigate** - Patch or disable affected feature
3. **Communicate** - Notify users via GitHub Security Advisory
4. **Release** - Publish patched version ASAP
5. **Document** - Update security documentation
6. **Review** - Conduct post-incident analysis

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [MCP Security Guidelines](https://modelcontextprotocol.io/docs/security)
- [Ideogram API Security](https://developer.ideogram.ai/security)

## Version History

- **v1.0.0** - Initial security guidelines
- **v1.1.0** - Added CI/CD security practices

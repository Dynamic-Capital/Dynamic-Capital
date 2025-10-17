# Deployment Fix for Dynamic Capital

## Current Issue

The deployment at https://dynamic-capital-qazf2.ondigitalocean.app shows an HTTP 412 error because the deployment configuration doesn't match the actual application architecture.

## Architecture Overview

Your project has **TWO separate applications**:

### 1. Vite React SPA (`src/` folder)
- Simple single-page application
- Uses React Router with hash-based routing
- Components: DynamicGuiShowcase, Dashboard, Market, Snapshot, etc.
- Simpler deployment (static files)
- **Currently NOT being deployed**

### 2. Next.js App (`apps/web/` folder)
- Full-stack Next.js 15 application
- Server-side rendering, API routes, authentication
- More complex with Supabase integration, admin panels, tools
- **Currently attempting to deploy (but failing)**

## Immediate Fix (Phase 1)

I've updated `.do/app.yml` to fix the port mismatch:
- Changed `http_port` from `8080` to `3000` (Next.js default)
- Kept build command as `npm run build:web`

However, the Next.js app has TypeScript errors that need to be fixed for deployment to succeed.

## Recommended Solution

**Choose ONE deployment strategy:**

### Option A: Deploy Next.js App (Recommended for Production)
The Next.js app at `apps/web/` is more feature-complete and production-ready.

**Steps:**
1. Fix TypeScript errors in `apps/web/`
2. Ensure all environment variables are set in DigitalOcean
3. Keep current `.do/app.yml` configuration
4. Deploy

**Pros:** Full-stack, SSR, SEO, authentication, API routes
**Cons:** More complex, higher resource usage

### Option B: Deploy Vite SPA (Simpler Alternative)
Deploy the simpler Vite app from `src/` folder.

**Steps:**
1. Update `.do/app.yml`:
   ```yaml
   build_command: npm run build:legacy
   run_command: npx serve -s dist -l 8080
   http_port: 8080
   ```
2. Add serve dependency: `npm install --save-dev serve`
3. Deploy

**Pros:** Simpler, faster builds, lower resource usage
**Cons:** Client-side only, no SSR/SEO, limited backend

## Next Steps

1. **Decide which app to deploy** (A or B)
2. **Fix deployment configuration** accordingly
3. **Address TypeScript errors** (if Option A)
4. **Test deployment**
5. **Then proceed with UI/UX fixes** from the original plan

## TypeScript Errors to Fix (Option A)

The Next.js app has ~40+ TypeScript errors related to missing `children` props in components. These need to be fixed before deployment will succeed.

Common pattern:
```tsx
// Error: Property 'children' is missing
<Component />

// Fix: Add children prop
<Component>{children}</Component>
```

## Environment Variables Required

Ensure these are set in DigitalOcean:
- ✅ SITE_URL
- ✅ NEXT_PUBLIC_SITE_URL  
- ✅ ALLOWED_ORIGINS
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ❓ SUPABASE_SERVICE_ROLE_KEY (needs value)
- ❓ CDN credentials (if using)

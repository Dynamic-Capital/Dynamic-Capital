# Unified Build System for Dynamic Capital TON Web3 App

## Overview

The Dynamic Capital application now uses a unified build system that consolidates all build processes into a single, streamlined workflow. This ensures consistent builds across all platforms (DigitalOcean, Vercel, Lovable, and local development).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Dynamic Capital TON Web3 App                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────┐ │
│  │ Next.js App  │───▶│  TON Connect │───▶│ Supabase│ │
│  │  (apps/web)  │    │  Integration │    │ Backend │ │
│  └──────────────┘    └──────────────┘    └─────────┘ │
│         │                    │                        │
│         ├──────────────┬─────┴────────┐              │
│         ▼              ▼              ▼              │
│  ┌──────────┐   ┌──────────┐  ┌──────────────┐     │
│  │ Mini App │   │TON Site  │  │ Static Assets│     │
│  │Telegram  │   │ Gateway  │  │  (CDN/Spaces)│     │
│  └──────────┘   └──────────┘  └──────────────┘     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Key Features

### 1. Platform Auto-Detection

The build system automatically detects the deployment platform:
- **DigitalOcean**: Detects `DIGITALOCEAN_APP_ID`
- **Vercel**: Detects `VERCEL`
- **Lovable**: Detects `LOVABLE_BUILD`
- **Local**: Default fallback

### 2. TON Domain Configuration

The build ensures proper configuration for:
- Primary TON domain: `dynamiccapital.ton`
- TON Site Gateway: `ton-gateway.dynamic-capital.ondigitalocean.app`
- Fallback Gateway: `ton-gateway.dynamic-capital.lovable.app`
- DigitalOcean domain: `dynamic-capital-qazf2.ondigitalocean.app`

### 3. Unified Environment Management

All environment variables are centrally managed and validated:
```bash
SITE_URL=https://dynamiccapital.ton
ALLOWED_ORIGINS=https://dynamiccapital.ton,https://dynamic-capital-qazf2.ondigitalocean.app,...
NEXT_PUBLIC_SUPABASE_URL=https://qeejuomcapbdlhnjqjcc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Build Process

### Standard Build

```bash
npm run build
```

This runs the unified build script which:
1. Configures branding and environment variables
2. Verifies TON configuration
3. Generates brand assets
4. Runs type checking (optional)
5. Builds the Next.js application
6. Uploads static assets to CDN (if configured)

### Legacy Build (Fallback)

```bash
npm run build:legacy
```

Uses the previous build system for compatibility.

### Component Builds

```bash
# Build only the web app
npm run build:web

# Build only the landing page
npm run build:landing

# Build miniapp bundle
npm run build:miniapp
```

## Environment Variables

### Required

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qeejuomcapbdlhnjqjcc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Site Configuration
SITE_URL=https://dynamiccapital.ton
NEXT_PUBLIC_SITE_URL=https://dynamiccapital.ton
```

### Optional

```bash
# Build Configuration
BUILD_PLATFORM=digitalocean|vercel|lovable|local
ENABLE_CDN_UPLOAD=true|false
ENABLE_TYPE_CHECK=true|false
SKIP_ASSET_UPLOAD=true|false

# CDN Configuration (for asset uploads)
CDN_BUCKET=your-bucket-name
CDN_ACCESS_KEY=your-access-key
CDN_SECRET_KEY=your-secret-key
CDN_REGION=sgp1

# TON Configuration
TONCONNECT_MANIFEST_URL=https://dynamiccapital.ton/tonconnect-manifest.json
```

## Deployment

### DigitalOcean App Platform

The `.do/app.yml` configures automatic deployments:

```yaml
build_command: node scripts/digitalocean-build.mjs
run_command: npm run start:do
```

The DigitalOcean build script now delegates to the unified build system.

### Vercel

Deploy with:

```bash
vercel deploy --prod
```

The build automatically configures for Vercel's environment.

### Local Development

```bash
npm run dev
```

Runs the Next.js development server with hot reload.

## TON Site Gateway

The application is accessible via multiple entry points:

1. **Native TON**: `dynamiccapital.ton` (requires TON wallet browser extension)
2. **HTTPS Gateway**: `https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
3. **DigitalOcean**: `https://dynamic-capital-qazf2.ondigitalocean.app`
4. **Legacy Gateway**: `https://ton.site/dynamiccapital.ton`

All domains are configured in the allowed origins list and CORS policy.

## Build Optimization

### Caching

The build system uses caching to speed up subsequent builds:
- Build cache: `.build-cache/`
- npm cache: Automatically configured
- Next.js cache: `.next/cache/`

### Type Checking

Type checking can be controlled:

```bash
# Enable type checking (default)
ENABLE_TYPE_CHECK=true npm run build

# Skip type checking for faster builds
ENABLE_TYPE_CHECK=false npm run build
```

### Asset Upload

Control CDN uploads:

```bash
# Force upload regardless of changes
DIGITALOCEAN_FORCE_UPLOAD=true npm run build

# Skip asset upload entirely
SKIP_ASSET_UPLOAD=true npm run build
```

## Troubleshooting

### Build Fails on DigitalOcean

1. Check environment variables in `.do/app.yml`
2. Verify CDN credentials are set
3. Check build logs for specific errors

### TON Domain Not Resolving

1. Install TON wallet browser extension (e.g., MyTonWallet)
2. Use HTTPS gateway as fallback
3. Verify TON DNS configuration

### Static Assets Not Loading

1. Check CDN configuration
2. Verify asset upload completed successfully
3. Clear CDN cache if needed

## Monitoring

Build status can be monitored via:
- DigitalOcean App Console
- Vercel Dashboard
- Build logs in terminal

## Migration from Old Build System

The old build system is preserved as `build:legacy`. To migrate:

1. Test the new build: `npm run build`
2. Verify all assets are uploaded correctly
3. Update CI/CD pipelines to use new build command
4. Remove legacy scripts once confirmed working

## Performance

Typical build times:
- Local (cold): ~2-3 minutes
- Local (cached): ~30-60 seconds
- DigitalOcean (cold): ~3-4 minutes
- Vercel (cold): ~2-3 minutes

## Future Enhancements

- [ ] Parallel asset uploads
- [ ] Incremental type checking
- [ ] Build artifact compression
- [ ] Multi-region CDN sync
- [ ] Automated performance benchmarks

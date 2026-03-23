# Production Readiness Review: AI Think Tank

**Date**: 2026-03-23
**Target Platforms**: iOS (Safari/PWA), Desktop Web
**Current State**: Development/Prototype

---

## Executive Summary

AI Think Tank is a well-architected multi-persona AI conversation app built with React 19 + TypeScript + Supabase. The core functionality is solid, but significant work is needed across **8 key areas** to reach production quality for iOS and desktop web deployment.

**Estimated effort**: ~40-60 tasks across the categories below.

---

## 1. PWA & iOS Support (Critical)

The app has **zero** PWA or iOS-specific configuration. This is the biggest gap for iOS deployment.

### Must Do
- [ ] Create `manifest.json` with app name, icons (192px, 512px), theme color, display: standalone
- [ ] Generate app icons in all required sizes (iOS requires specific sizes: 120, 152, 167, 180px)
- [ ] Add Apple-specific meta tags to `index.html`:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - `apple-touch-icon` (multiple sizes)
  - `theme-color`
- [ ] Implement a service worker for offline support and caching
- [ ] Add `vite-plugin-pwa` for automated PWA asset generation
- [ ] Handle iOS safe areas (notch, home indicator) with `env(safe-area-inset-*)`
- [ ] Add splash screens for iOS (launch images)
- [ ] Fix `index.html` title from "ai-think-tank-app" to a proper app name
- [ ] Replace Vite favicon with a real app icon

### Should Do
- [ ] Add install prompt / "Add to Home Screen" banner
- [ ] Implement background sync for messages sent while offline
- [ ] Cache conversation history for offline viewing
- [ ] Handle network status changes gracefully (online/offline indicators)

---

## 2. Testing (Critical)

There are **zero automated tests**. Production apps need testing.

### Must Do
- [ ] Set up Vitest + React Testing Library
- [ ] Write unit tests for critical services:
  - `conversation-manager.ts` (22 console.log calls = complex logic)
  - `turn-orchestrator.ts`
  - `provider-manager.ts` / `provider-manager-edge.ts`
  - `budget-statistics.ts`
  - `cost-calculator.ts`
- [ ] Write component tests for key flows:
  - Authentication (login/signup)
  - Conversation creation & setup
  - Message sending & receiving
  - Persona management
  - Budget tracking
- [ ] Set up E2E testing with Playwright for critical user journeys
- [ ] Add test scripts to `package.json`

### Should Do
- [ ] Add integration tests for Supabase edge functions
- [ ] Set up test coverage thresholds (aim for 70%+)
- [ ] Add visual regression testing for UI components

---

## 3. Error Handling & Resilience (Critical)

### Must Do
- [ ] Add a React Error Boundary (none exists currently) with a user-friendly fallback UI
- [ ] Add global error handling for uncaught promise rejections
- [ ] Implement proper error states in all pages (not just console.log)
- [ ] Add retry logic for failed API calls (AI provider calls, Supabase calls)
- [ ] Handle rate limiting from AI providers gracefully with user feedback
- [ ] Add loading states and skeleton screens for all async operations

### Should Do
- [ ] Implement error tracking/reporting (Sentry or similar)
- [ ] Add health check endpoint for monitoring
- [ ] Implement circuit breaker pattern for AI provider calls

---

## 4. Security Hardening (Critical)

### Must Do
- [ ] Audit and remove all `VITE_DEV_*` API key environment variables from production builds — these expose API keys client-side
- [ ] Ensure all AI API calls go through Supabase Edge Functions (not directly from client)
- [ ] Add Content Security Policy (CSP) headers
- [ ] Add rate limiting on edge functions to prevent abuse
- [ ] Review and tighten RLS policies for all tables
- [ ] Implement proper session timeout and refresh handling
- [ ] Add input sanitization for user-generated content (persona names, messages, etc.)

### Should Do
- [ ] Add CORS configuration for production domains
- [ ] Implement request signing for edge function calls
- [ ] Add audit logging for sensitive operations
- [ ] Security headers: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security

---

## 5. Performance Optimization (High Priority)

### Must Do
- [ ] Implement code splitting / lazy loading for routes (currently all loaded upfront)
- [ ] Optimize bundle size — LangChain is huge (~500KB+), consider:
  - Only importing specific provider packages
  - Moving LangChain entirely to edge functions (not in client bundle)
- [ ] Add image optimization for 31 avatar PNGs (consider WebP, lazy loading)
- [ ] Implement virtualized scrolling for long conversation message lists
- [ ] Add `React.memo` / `useMemo` / `useCallback` for expensive renders
- [ ] Debounce/throttle real-time updates and typing indicators

### Should Do
- [ ] Implement proper caching strategy with TanStack Query (stale times, prefetching)
- [ ] Add performance monitoring (Core Web Vitals tracking)
- [ ] Optimize Supabase queries — add database indexes for common query patterns
- [ ] Enable Vite's build optimizations (manualChunks, tree-shaking verification)
- [ ] Preload critical assets

---

## 6. CI/CD & Deployment (High Priority)

### Must Do
- [ ] Set up GitHub Actions workflow:
  - Lint (`eslint`)
  - Type check (`tsc --noEmit`)
  - Unit tests
  - Build verification
- [ ] Configure deployment pipeline:
  - **Frontend**: Vercel or Netlify (auto-deploy on push)
  - **Edge Functions**: Supabase CLI deploy
  - **Database migrations**: Supabase CLI migration runner
- [ ] Set up environment variable management for staging/production
- [ ] Add branch protection rules (require CI pass before merge)

### Should Do
- [ ] Add E2E tests to CI pipeline
- [ ] Set up preview deployments for PRs
- [ ] Add bundle size tracking in CI
- [ ] Implement staged rollouts (canary deployments)
- [ ] Add database backup strategy

---

## 7. UX & Polish (Medium Priority)

### Must Do
- [ ] Clean up 89 `console.log/error/warn` calls — replace with proper logging or remove
- [ ] Add proper loading/empty states for all pages
- [ ] Implement responsive design testing across:
  - iPhone SE (small), iPhone 14/15 (medium), iPad (tablet)
  - Desktop: 1280px, 1440px, 1920px
- [ ] Add proper 404 page
- [ ] Implement toast/notification system for user feedback
- [ ] Fix app metadata: proper title, description, Open Graph tags for link sharing
- [ ] Add keyboard navigation and accessibility (ARIA labels, focus management)

### Should Do
- [ ] Add dark/light theme toggle (currently hardcoded "deep ocean" theme)
- [ ] Implement onboarding flow for new users
- [ ] Add conversation search/filter
- [ ] Accessibility audit (WCAG 2.1 AA compliance)
- [ ] Add analytics (privacy-respecting: Plausible, PostHog, or similar)

---

## 8. Infrastructure & Observability (Medium Priority)

### Must Do
- [ ] Set up proper logging infrastructure (replace console.log with structured logging)
- [ ] Configure Supabase for production:
  - Connection pooling
  - Database backups
  - Point-in-time recovery
- [ ] Set up monitoring and alerting for:
  - Edge function errors/latency
  - Database performance
  - API provider availability
- [ ] Implement proper environment configuration (dev/staging/prod)
- [ ] Set up a custom domain with SSL

### Should Do
- [ ] Add APM (Application Performance Monitoring)
- [ ] Set up uptime monitoring
- [ ] Create runbooks for common issues
- [ ] Implement feature flags for gradual rollout

---

## Priority Order for Implementation

| Phase | Focus | Items |
|-------|-------|-------|
| **Phase 1** | Foundation | Error Boundary, Security audit, Remove dev keys, CI/CD setup |
| **Phase 2** | Testing | Vitest setup, Critical service tests, Component tests |
| **Phase 3** | iOS/PWA | Manifest, Service worker, Icons, iOS meta tags, Safe areas |
| **Phase 4** | Performance | Code splitting, Bundle optimization, Lazy loading |
| **Phase 5** | Polish | Clean up console.logs, Loading states, Responsive QA |
| **Phase 6** | Deployment | Production environment, Monitoring, Custom domain |

---

## Quick Wins (Can Do Immediately)

1. Add Error Boundary component
2. Fix `index.html` metadata (title, favicon, meta tags)
3. Add `manifest.json` for PWA basics
4. Remove/guard `VITE_DEV_*` environment variables
5. Set up Vitest with one example test
6. Add GitHub Actions CI workflow for lint + type check + build
7. Add loading skeletons for dashboard and conversation pages

---

## Architecture Decisions Needed

1. **Native vs PWA for iOS**: PWA is recommended (lower effort, single codebase). Capacitor is an option if native APIs are needed later.
2. **LangChain in client vs server**: Should be moved entirely to edge functions to reduce bundle size and protect API keys.
3. **Deployment platform**: Vercel (recommended for Vite/React) vs Netlify vs self-hosted.
4. **Monitoring stack**: Sentry (errors) + Plausible (analytics) + UptimeRobot (availability) is a solid free/cheap starting stack.
5. **Offline strategy**: Cache-first for static assets, network-first for API calls, with offline conversation viewing as a stretch goal.

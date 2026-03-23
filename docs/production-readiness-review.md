# Production Readiness Review: AI Think Tank

## Current State Summary

The app is a **React 19 SPA** (Vite 7) with a **Supabase** backend (PostgreSQL + Edge Functions + Auth). It supports multi-AI-persona conversations across OpenAI, Anthropic, and Google Gemini. The frontend uses Zustand for state, React Query for data fetching, Tailwind CSS + Radix UI for styling, and has responsive layouts.

**What works today:** Auth, conversations, persona management, real-time messaging, budget/cost tracking, multi-provider AI integration, RLS policies.

**What's missing for production:** See below.

---

## 1. PWA / iOS "Add to Home Screen" Support (Critical)

**Status: Not implemented**

The app has zero PWA infrastructure. For a production iOS/desktop web app, this is the #1 gap.

### Required:
- [ ] **Web App Manifest** (`manifest.json`) — app name, icons (192px, 512px), theme color, background color, display mode (`standalone`), start URL, scope
- [ ] **Service Worker** — offline caching strategy (at minimum cache the app shell), background sync for messages
- [ ] **Apple-specific meta tags** in `index.html`:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - `apple-touch-icon` (multiple sizes: 120, 152, 167, 180)
  - `apple-mobile-web-app-title`
  - Splash screen images for various iPhone/iPad resolutions
- [ ] **Vite PWA plugin** (`vite-plugin-pwa`) for automated service worker generation
- [ ] **Offline fallback page** for when network is unavailable
- [ ] **Update notification** — prompt users when a new version is available

### Why it matters:
Without this, iOS users get a basic browser tab. With it, they get a full-screen app experience with an icon on their home screen, no browser chrome, and offline capability.

---

## 2. iOS / Mobile UX Improvements (Critical)

**Status: Basic responsive layout exists, but no iOS-specific optimizations**

### Required:
- [ ] **Safe area insets** — handle iPhone notch/Dynamic Island with `env(safe-area-inset-*)` CSS
- [ ] **Viewport height fix** — use `dvh` (dynamic viewport height) instead of `vh` to handle iOS Safari's collapsing address bar
- [ ] **Touch target sizes** — ensure all interactive elements are at least 44x44px (Apple HIG)
- [ ] **Prevent zoom on input focus** — set `font-size: 16px` minimum on inputs or use `maximum-scale=1` carefully
- [ ] **Pull-to-refresh** handling — either implement or disable bounce scroll
- [ ] **Keyboard handling** — input fields should scroll into view, chat input should stay above keyboard
- [ ] **Haptic feedback** — for reactions, sends, etc. (via `navigator.vibrate`)
- [ ] **Gesture navigation** — swipe-back conflicts with iOS gestures; ensure edge swipes work naturally

---

## 3. Testing Infrastructure (Critical)

**Status: Zero automated tests**

### Required:
- [ ] **Test framework setup** — Vitest (pairs with Vite) + React Testing Library
- [ ] **Unit tests** — stores (auth, conversation, budget), services (cost calculation, turn orchestration), utility functions
- [ ] **Integration tests** — conversation flow, auth flow, budget tracking
- [ ] **E2E tests** — Playwright (already in node_modules) for critical paths: login → create conversation → send messages → check budget
- [ ] **Test coverage targets** — aim for 80%+ on services/stores, 60%+ on components
- [ ] **CI test runner** — tests must pass before deploy

---

## 4. CI/CD Pipeline (Critical)

**Status: None exists**

### Required:
- [ ] **GitHub Actions workflow** with:
  - Lint (`eslint .`)
  - Type check (`tsc -b`)
  - Test (`vitest run`)
  - Build (`vite build`)
  - Deploy (to Vercel/Netlify/Cloudflare Pages)
- [ ] **Preview deployments** on PRs
- [ ] **Production deployment** on merge to `master`
- [ ] **Supabase migration runner** for database changes
- [ ] **Environment variable management** in CI

---

## 5. Error Monitoring & Logging (High)

**Status: No production error tracking**

### Required:
- [ ] **Error boundary** — global React error boundary wrapping the app (currently none)
- [ ] **Error tracking service** — Sentry (recommended) for frontend errors, unhandled rejections, and Edge Function errors
- [ ] **Structured logging** in Edge Functions — replace console.log with structured JSON logs
- [ ] **User session replay** — optional but valuable for debugging (LogRocket, Sentry Replay)
- [ ] **Health check endpoint** — simple endpoint to verify Edge Functions are up

---

## 6. Performance Optimization (High)

**Status: No code splitting, no lazy loading, basic build config**

### Required:
- [ ] **Route-based code splitting** — `React.lazy()` + `Suspense` for all page components (Dashboard, Conversation, Personas, Budget)
- [ ] **Bundle analysis** — add `rollup-plugin-visualizer` to understand bundle size
- [ ] **Image optimization** — compress assets, use WebP, implement lazy loading for avatars
- [ ] **Font optimization** — preload critical fonts, use `font-display: swap`
- [ ] **Vite build optimization** — configure `build.rollupOptions.output.manualChunks` to split vendor chunks (react, radix-ui, recharts, react-syntax-highlighter)
- [ ] **Preload critical resources** — `<link rel="preload">` for main CSS/JS
- [ ] **React Query optimization** — review stale times, add `placeholderData` for instant loading states
- [ ] **Virtualized message list** — for conversations with 100+ messages (react-window or @tanstack/virtual)

---

## 7. Security Hardening (High)

**Status: Basic auth + RLS, but missing several production requirements**

### Required:
- [ ] **Content Security Policy** headers — prevent XSS, restrict resource origins
- [ ] **Rate limiting** — on Edge Functions (Supabase has built-in, but verify configuration)
- [ ] **Input sanitization** — verify all user inputs (conversation topics, persona names, messages) are sanitized before rendering (markdown rendering is a potential XSS vector)
- [ ] **API key exposure audit** — ensure no API keys leak to the frontend bundle; all provider calls must go through Edge Functions
- [ ] **CORS configuration** — restrict to production domain only
- [ ] **Supabase RLS audit** — review all policies for completeness, especially on `cost_records`, `budget_alerts`, and `cache_entries`
- [ ] **Session management** — implement session timeout, handle token refresh failures gracefully
- [ ] **Dependency audit** — `npm audit` and fix vulnerabilities

---

## 8. SEO & Meta Tags (Medium)

**Status: Minimal — generic title, no meta tags**

### Required:
- [ ] **`<title>`** — dynamic per page ("AI Think Tank - Dashboard", etc.)
- [ ] **Open Graph tags** — for link previews when sharing
- [ ] **`<meta name="description">`** — app description
- [ ] **Favicon set** — proper favicon.ico, favicon-16x16.png, favicon-32x32.png (currently using Vite default)
- [ ] **`<meta name="theme-color">`** — matches app theme

---

## 9. Deployment Configuration (Medium)

**Status: No deployment config**

### Required (choose one):
- [ ] **Vercel** — `vercel.json` with SPA rewrite rules, environment variables, build settings
- [ ] **Netlify** — `netlify.toml` with `[[redirects]]` for SPA routing
- [ ] **Cloudflare Pages** — `_redirects` file + `wrangler.toml`

### Also needed:
- [ ] **Custom domain** setup
- [ ] **SSL certificate** (automatic on all three platforms)
- [ ] **CDN configuration** — cache static assets aggressively, no-cache for `index.html`
- [ ] **Environment variable config** per environment (dev, staging, prod)

---

## 10. Accessibility (Medium)

**Status: Radix UI provides good defaults, but no audit done**

### Required:
- [ ] **Keyboard navigation audit** — ensure all features are keyboard-accessible
- [ ] **Screen reader testing** — ARIA labels on custom components, live regions for new messages
- [ ] **Color contrast check** — Deep Ocean theme needs validation against WCAG AA
- [ ] **Focus management** — proper focus trapping in modals, focus restoration
- [ ] **Reduced motion** — respect `prefers-reduced-motion` media query

---

## 11. Data & State Management Improvements (Medium)

**Status: Functional but fragile for production**

### Required:
- [ ] **Optimistic updates** — for message sends, reactions, pins (currently waits for server)
- [ ] **Retry logic** — for failed Edge Function calls (network instability)
- [ ] **Offline queue** — queue actions when offline, sync when reconnected
- [ ] **Data pagination** — conversation list and message history need pagination/infinite scroll
- [ ] **State persistence** — persist critical Zustand stores to localStorage for quick app reload
- [ ] **Stale data handling** — what happens when the tab is backgrounded for hours?

---

## 12. Observability & Analytics (Low)

**Status: None**

### Required:
- [ ] **Analytics** — basic usage tracking (conversations created, messages sent, feature usage)
- [ ] **Performance metrics** — Core Web Vitals monitoring (LCP, FID, CLS)
- [ ] **Edge Function metrics** — response times, error rates, token usage trends
- [ ] **Budget monitoring** — server-side validation that client-reported costs match actual provider bills

---

## Priority Roadmap

### Phase 1: Foundation (Must-have for launch)
1. PWA setup (manifest, service worker, iOS meta tags)
2. iOS UX fixes (safe areas, viewport, touch targets)
3. Error boundaries + Sentry integration
4. CI/CD pipeline (GitHub Actions → Vercel)
5. Route-based code splitting

### Phase 2: Quality (Should-have for launch)
6. Testing infrastructure (Vitest + Playwright)
7. Security hardening (CSP, RLS audit, input sanitization)
8. SEO & meta tags
9. Performance optimization (bundle splitting, virtualized lists)

### Phase 3: Polish (Nice-to-have)
10. Accessibility audit
11. Offline support + optimistic updates
12. Analytics & observability
13. Deployment configuration + staging environment

---

## Estimated Scope

- **Phase 1:** ~15-20 files modified/created
- **Phase 2:** ~20-30 files modified/created
- **Phase 3:** ~10-15 files modified/created

Each phase builds on the previous. Phase 1 alone gets the app to a deployable state that works well on iOS and desktop.

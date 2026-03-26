# Performance Review: Ad Units (Ad Buddy)

## Context
Review of the Next.js 16 + Supabase ad management app for performance bottlenecks across frontend and backend.

---

## HIGH Priority

### 1. Sequential Supabase queries — parallelize with `Promise.all()`
**File:** `components/ad-list.tsx:178-202`

Campaigns and ads are fetched sequentially (`await` one after another). These are independent queries and should run in parallel:
```ts
const [campaignResult, adResult] = await Promise.all([
  supabase.from("campaigns").select("id, name").order("name"),
  supabase.from("ads").select(`...`).order("position"),
]);
```

### 2. No pagination — unbounded data fetching
**File:** `components/ad-list.tsx:186`

All ads are fetched with no `.limit()` or `.range()`. As ad count grows, this will degrade linearly. Add pagination or at minimum a reasonable limit.

### 3. Duplicate campaign fetching — no shared state
Campaigns are independently fetched in 3 components:
- `components/ad-list.tsx`
- `components/ad-upload-form.tsx`
- `components/edit-campaign-button.tsx`

Each triggers its own Supabase call. Options:
- **Quick fix:** Lift campaigns into parent and pass as props
- **Better:** Use React Query / SWR for automatic deduplication + caching
- **Simplest:** Use a React Context provider at the page level

### 4. Missing database indexes (Supabase side)
These columns are used in WHERE/JOIN clauses but likely lack indexes:
- `campaigns.share_token` — used on every public share page load
- `ads.campaign_id` — used in multiple joins and filters
- `campaign_comments.campaign_id` — comment queries
- `campaign_comments.ad_id` — ad-specific comment filtering

**Action:** Add indexes via Supabase SQL editor or migration:
```sql
CREATE INDEX IF NOT EXISTS idx_campaigns_share_token ON campaigns (share_token);
CREATE INDEX IF NOT EXISTS idx_ads_campaign_id ON ads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id ON campaign_comments (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_ad_id ON campaign_comments (ad_id);
```

### 5. `<img>` instead of Next.js `<Image>`
**File:** `app/page.tsx:80-91`

Logo images use raw `<img>` tags, missing Next.js automatic optimization (lazy loading, WebP conversion, responsive srcset). Replace with `next/image`.

---

## MEDIUM Priority

### 6. No component memoization in large lists
**File:** `components/ad-list.tsx` (673 lines, 12+ useState calls)

Every state change re-renders all ad cards. The ad card rendering should be extracted into a memoized sub-component (`React.memo`). Same applies to the masonry grid items in the campaign share page.

### 7. Heavy libraries not code-split
- **JSZip** (~90KB) is imported at top level in `components/ad-upload-form.tsx` but only used during ZIP uploads. Should use `next/dynamic` or dynamic `import()`.
- **Motion** (Framer Motion) animations on the campaign share page (`app/campaign/[token]/page.tsx`) could be lazy-loaded since the page itself is a dynamic route.

### 8. Masonry grid recalculates on every render
**File:** `components/ui/masonry-grid.tsx`

Uses `ResizeObserver` but doesn't memoize the layout calculation output. `React.Children.toArray()` called in a loop. Should memoize with `useMemo`.

### 9. Each `AdPreview` creates its own IntersectionObserver
**File:** `components/ad-preview.tsx`

If you have 50 ads visible, that's 50 separate observers. Consider a shared IntersectionObserver instance or a library like `react-intersection-observer` that batches.

### 10. Share token generation is client-side + extra queries
**File:** `components/ad-list.tsx:100-133`

Share token is generated with `crypto.getRandomValues()` on the client, then requires a read + conditional update. Should be generated server-side at campaign creation time, eliminating per-view queries.

---

## LOW Priority

### 11. Console.log statements in production
**File:** `components/ad-list.tsx:215`, `components/ad-list.tsx:259`

Remove `console.log("Fetched ads:", ...)` and similar debug statements.

### 12. Monolithic components should be split
- `components/ad-list.tsx` — 673 lines
- `app/campaign/[token]/page.tsx` — 689 lines
- `components/ad-upload-form.tsx` — 450 lines

Splitting improves both maintainability and allows React to optimize re-renders at narrower boundaries.

### 13. No Suspense boundaries
No `<Suspense>` usage for streaming/progressive rendering. Adding boundaries around the ad grid and comment sections would improve perceived load time.

### 14. Dead code
`initializePositions()` function in `components/ad-list.tsx:229-263` appears unused — remove it.

### 15. Font loading
Both WOFF (179KB) and WOFF2 (149KB) variants are declared. Modern browsers all support WOFF2 — the WOFF fallback is unnecessary weight in the CSS.

---

## Summary Table

| # | Issue | Severity | Type | Effort |
|---|-------|----------|------|--------|
| 1 | Sequential queries | HIGH | Backend | Small |
| 2 | No pagination | HIGH | Backend | Small |
| 3 | Duplicate campaign fetching | HIGH | Frontend | Medium |
| 4 | Missing DB indexes | HIGH | Backend | Small |
| 5 | `<img>` not `<Image>` | HIGH | Frontend | Small |
| 6 | No memoization | MEDIUM | Frontend | Medium |
| 7 | Heavy libs not code-split | MEDIUM | Frontend | Small |
| 8 | Masonry grid re-renders | MEDIUM | Frontend | Small |
| 9 | Per-component IntersectionObserver | MEDIUM | Frontend | Medium |
| 10 | Share token client-side | MEDIUM | Backend | Medium |
| 11 | Console.log in prod | LOW | Frontend | Trivial |
| 12 | Monolithic components | LOW | Frontend | Large |
| 13 | No Suspense boundaries | LOW | Frontend | Medium |
| 14 | Dead code | LOW | Frontend | Trivial |
| 15 | WOFF fallback unnecessary | LOW | Frontend | Trivial |

---

## Recommended Implementation Order
1. Items 4, 11, 14, 15 (quick wins, trivial effort)
2. Items 1, 2, 5 (high impact, small effort)
3. Items 3, 7, 8 (medium effort, good payoff)
4. Items 6, 9, 10 (requires more refactoring)
5. Items 12, 13 (larger structural changes)

## Verification
- Run `pnpm build` to ensure no build errors after changes
- Test the dashboard with browser DevTools Network tab to confirm fewer/faster requests
- Use React DevTools Profiler to verify reduced re-renders
- Check Supabase dashboard query performance for index improvements

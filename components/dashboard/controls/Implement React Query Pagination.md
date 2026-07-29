# Implement React Query Pagination

> **Workspace:** d:\Office\Projects\iRush_Mobile_App

---

**User**

analyze the project carefully and amke the changes coreectly and accordingly,  and make the changes below exactly and accoridngly, 
 
 We're doing two pieces of work, in this order. Do not skip ahead to part 2 
 until part 1 is fully verified and committed. 
 
 ============================================================ 
 PART 1 — Phase 3 folder restructuring (previously approved plan) 
 ============================================================ 
 Proceed with the full Phase 3 restructuring exactly as previously approved: 
 - Move all types into types/ (including types/api/) 
 - Move all mock/sample data into mocks/ (not __mocks__, per earlier decision) 
 - Create lib/api-client.ts as the ONE shared fetch wrapper (timeout, abort, 
   auth headers, baseURL, error classification) — this will be used by all 
   services AND by the pagination hooks in Part 2 
 - Rename services to *.service.ts, extract inline components 
   (CustomDrawerContent, BottomNavBar, DateSegmentControl, RevenueOverviewCard) 
 - Move design tokens to theme/ 
 - Add tsconfig/babel path aliases (@lib, @components, @types, etc.) 
 - Update the README's Project Structure section 
 
 After this part: run npx tsc --noEmit, confirm nothing broke, then commit 
 as its own checkpoint: "Phase 3: restructure folders and add shared api-client" 
 
 Pause here and give me a summary before starting Part 2. 
 
 ============================================================ 
 PART 2 — React Query pagination for Orders, Quotes, and Open Orders 
 ============================================================ 
 Only start after Part 1 is committed. 
 
 1. Install @tanstack/react-query and set up a QueryClientProvider at the 
    app root (app/_layout.tsx). 
 
 2. Build ONE reusable pattern (e.g. a generic useInfiniteResource hook, or 
    three thin hooks sharing the same internal logic) that: 
    - Fetches page 1 on mount using lib/api-client.ts 
    - Exposes hasNextPage / fetchNextPage for FlatList's onEndReached 
    - Works identically for small datasets (today) and large ones (month) — 
      no special-casing for size, it just naturally stops paginating when 
      the backend says there's no more data 
 
 3. Apply this SAME hook pattern to all three: 
    - Orders (dashboard/orders) — today and month views 
    - Quotes (dashboard/quotes) — today and month views 
    - Open Orders — using the new ?filter=pending and ?filter=partial 
      params, respecting the page/limit/totalRecords contract in the 
      response I've shared 
 
 4. For Open Orders specifically: use pendingOrdersSummary and 
    partialOrdersSummary directly for the KPI/stat numbers at the top of 
    the screen — do NOT calculate those totals by summing the paginated 
    data[] array, since the summary objects already give accurate totals 
    across ALL records, not just the current page. 
 
 5. In the mapping layer, strip each order/quote record down to only the 
    fields the list card actually displays (order no, company, amount, 
    date, vendor count, status) before passing to the UI — don't pass the 
    full nested orderVendors/invoices/packingSlips objects into list 
    components. Keep the raw response cached by React Query so if we build 
    a detail view later, the full data is already there without refetching. 
 
 6. Show me the hook design and one example screen wired up before applying 
    it to all three resources. 
 
 Do not touch Open Orders' underlying data shape decisions — that's still 
 being finalized on the backend. Just build the pagination layer to match 
 the current documented contract (page, limit, totalRecords, filter, data).

**Assistant**

I’m starting with Part 1 only and I’m going to map the current structure first so we move things cleanly without trampling any existing work. After that I’ll wire the shared API client, update imports/aliases, run `npx tsc --noEmit`, and only then make the checkpoint commit you asked for.

I’ve got the current layout. Next I’m reading the service layer, theme/constants, and the screens that still have inline components so I can restructure with minimal behavior change.

I’ve confirmed the project is still on the pre-alias config, so I’m checking the Expo v54 docs before I touch Babel/TypeScript resolution. In parallel I’m auditing where types, mocks, and inline dashboard components currently live.

I’ve identified the main refactor hotspots: the service files still own their interfaces and formatting helpers, sample data still lives under `constants/`, and the dashboard screens have the inline drawer/nav/segment pieces you called out. I’m drilling into those files now so I can move them without changing behavior.

I’ve got the target shape now. I’m at the point where I’m creating the new `types/`, `mocks/`, `theme/`, and shared component structure first, then I’ll reconnect the screens and services to that structure in one pass so TypeScript stays tractable.

I’m about to start file edits. First I’m laying down the destination folders and then I’ll move code into them piece by piece so imports can be updated against real paths instead of placeholders.

I’ve hit the biggest bulk-move part now: pulling the sample API payloads out of the service layer into `mocks/api/` without changing the payload shape. I’m using the existing files as the source of truth for that so we don’t accidentally drift the example contracts.

---


# TODO - Cloudshope callback → browser reports (no DB)

- [ ] Add in-memory callback broker + SSE endpoint (new API route)
- [ ] Modify `/api/call-callback/route.js` to stop MySQL insert and instead publish callback payload to broker by `tracking_ref` (or uniqueid)
- [ ] Remove/stop usage of `/api/call-callback-fetch` polling in `app/page.jsx`
- [ ] Update `app/page.jsx` to consume SSE stream and then save call report into `sessionStorage`/`localStorage`
- [ ] Update `app/call-reports/page.jsx` and related APIs to read from browser storage (or disable DB-based report page if not feasible)
- [ ] Ensure existing click-to-call URL and credentials are unchanged
- [ ] Build + lint


import { z } from 'zod';

// Zod probes `new Function` to enable its JIT. Under the production CSP (script-src 'self', no
// 'unsafe-eval') the probe is caught but still reported as a securitypolicyviolation on every page
// load. main.tsx imports this module first, before any schema is created, so the probe never runs.
z.config({ jitless: true });

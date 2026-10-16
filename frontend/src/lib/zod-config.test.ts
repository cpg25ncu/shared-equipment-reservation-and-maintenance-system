import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import './zod-config';

describe('zod-config', () => {
  it('turns off the eval-based JIT so the production CSP is never probed', () => {
    expect(z.config().jitless).toBe(true);
  });
});

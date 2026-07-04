import { describe, beforeAll, beforeEach, it, expect } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp, truncateAllTables } from '../helpers';
import { updateSetting } from '../../server/services/settings.service';

// HP-3: capability-flag gating of self-registration. In the test env, the
// truncate helper enables the marketplace flags (so the inherited multi-role
// suite works). This file flips them off to prove the single-agency HP gate.

let app: Express;
const reg = (role: string, email: string) => ({ email, password: 'Test@1234', role, fullName: 'Cap Test' });

describe('HP-3 capability gating — self-registration', () => {
  beforeAll(() => { app = createTestApp(); });
  beforeEach(async () => { await truncateAllTables(); }); // re-enables marketplace flags

  it('public config exposes only the capability booleans', async () => {
    const r = await request(app).get('/api/v1/config/public');
    expect(r.status).toBe(200);
    expect(r.body.data.capabilities).toMatchObject({
      employerSelfRegistration: true,   // enabled by truncate in the test env
      agencySelfRegistration: true,
      agencyMode: 'marketplace',
    });
  });

  it('candidate can always self-register (201)', async () => {
    const r = await request(app).post('/api/v1/auth/register').send(reg('candidate', 'cap_cand@test.com'));
    expect(r.status).toBe(201);
  });

  it('with capabilities ENABLED, employer + agent self-register (201)', async () => {
    const e = await request(app).post('/api/v1/auth/register').send(reg('employer', 'cap_emp@test.com'));
    expect(e.status).toBe(201);
    const a = await request(app).post('/api/v1/auth/register').send(reg('agent', 'cap_agent@test.com'));
    expect(a.status).toBe(201);
  });

  it('employer self-registration DISABLED → 403; candidate unaffected', async () => {
    await updateSetting('capability.employer_self_registration', false);

    const e = await request(app).post('/api/v1/auth/register').send(reg('employer', 'cap_emp2@test.com'));
    expect(e.status).toBe(403);
    expect(e.body.error.message).toMatch(/not open for self-registration/i);

    const c = await request(app).post('/api/v1/auth/register').send(reg('candidate', 'cap_cand2@test.com'));
    expect(c.status).toBe(201);

    const cfg = await request(app).get('/api/v1/config/public');
    expect(cfg.body.data.capabilities.employerSelfRegistration).toBe(false);
  });

  it('agency self-registration DISABLED → 403', async () => {
    await updateSetting('capability.agency_self_registration', false);
    const a = await request(app).post('/api/v1/auth/register').send(reg('agent', 'cap_agent2@test.com'));
    expect(a.status).toBe(403);
  });
});

import { describe, beforeAll, beforeEach, it, expect } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp, truncateAllTables, getDb } from '../helpers';
import { recruitmentAgents, applications, interviews } from '../../shared/schema';
import { eq } from 'drizzle-orm';

let app: Express;
let agentCookie: string[];
let candidateCookie: string[];
let jobId: string;

beforeAll(async () => {
  app = createTestApp();
});

beforeEach(async () => {
  await truncateAllTables();
  const db = getDb();

  // Setup agent with verified agency
  const agentReg = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'agent@test.com', password: 'Test@123', role: 'agent' });
  agentCookie = agentReg.headers['set-cookie'] as unknown as string[];

  await request(app)
    .post('/api/v1/agencies/register')
    .set('Cookie', agentCookie)
    .send({ agencyName: 'Agency', licenseNumber: 'LIC001', specializations: ['IT'] });
  await db.update(recruitmentAgents).set({ verified: true }).where(eq(recruitmentAgents.userId, agentReg.body.data.id));

  // Setup candidate
  const candReg = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'cand@test.com', password: 'Test@123', role: 'candidate' });
  candidateCookie = candReg.headers['set-cookie'] as unknown as string[];

  await request(app)
    .patch('/api/v1/candidates/profile')
    .set('Cookie', candidateCookie)
    .send({ fullName: 'Test Cand', email: 'cand@test.com', skills: ['React', 'Node.js'], experience: 3, preferredCountries: ['UAE'] });

  // Create a job
  const jobRes = await request(app)
    .post('/api/v1/jobs')
    .set('Cookie', agentCookie)
    .send({ title: 'Dev', company: 'Corp', location: 'Dubai', country: 'UAE', skills: ['React', 'Node.js'], experience: 2 });
  jobId = jobRes.body.data.id;
});

// ── Bulk Status Update ──────────────────────────────────────────────

describe('PATCH /api/v1/applications/bulk-status', () => {
  it('updates multiple applications at once', async () => {
    // Create second candidate
    const cand2 = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'cand2@test.com', password: 'Test@123', role: 'candidate' });
    const cand2Cookie = cand2.headers['set-cookie'] as unknown as string[];
    await request(app)
      .patch('/api/v1/candidates/profile')
      .set('Cookie', cand2Cookie)
      .send({ fullName: 'Cand Two', email: 'cand2@test.com', skills: ['Python'] });

    // Both apply
    const app1 = await request(app).post(`/api/v1/jobs/${jobId}/apply`).set('Cookie', candidateCookie);
    const app2 = await request(app).post(`/api/v1/jobs/${jobId}/apply`).set('Cookie', cand2Cookie);

    // Bulk shortlist
    const res = await request(app)
      .patch('/api/v1/applications/bulk-status')
      .set('Cookie', agentCookie)
      .send({ ids: [app1.body.data.id, app2.body.data.id], status: 'shortlisted' });

    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(2);
    expect(res.body.data.status).toBe('shortlisted');
  });

  it('rejects empty ids array → 400', async () => {
    const res = await request(app)
      .patch('/api/v1/applications/bulk-status')
      .set('Cookie', agentCookie)
      .send({ ids: [], status: 'reviewed' });

    expect(res.status).toBe(400);
  });

  it('rejects invalid status → 400', async () => {
    const res = await request(app)
      .patch('/api/v1/applications/bulk-status')
      .set('Cookie', agentCookie)
      .send({ ids: ['some-id'], status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('rejects candidate → 403', async () => {
    const res = await request(app)
      .patch('/api/v1/applications/bulk-status')
      .set('Cookie', candidateCookie)
      .send({ ids: ['some-id'], status: 'reviewed' });

    expect(res.status).toBe(403);
  });
});

// ── Application Detail with Score Breakdown ─────────────────────────

describe('GET /api/v1/applications/:id', () => {
  it('returns application with score breakdown', async () => {
    const applyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set('Cookie', candidateCookie);

    const appId = applyRes.body.data.id;

    const res = await request(app)
      .get(`/api/v1/applications/${appId}`)
      .set('Cookie', candidateCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(appId);
    expect(res.body.data.matchScore).toBe(100);
    expect(res.body.data.scoreBreakdown).toBeDefined();
    expect(res.body.data.scoreBreakdown.skill.score).toBe(50);
    expect(res.body.data.scoreBreakdown.experience.score).toBe(30);
    expect(res.body.data.scoreBreakdown.country.score).toBe(20);
    expect(res.body.data.scoreBreakdown.total).toBe(100);
    expect(res.body.data.job).toHaveProperty('title');
    expect(res.body.data.candidate).toHaveProperty('fullName');
  });

  it('returns 404 for non-existent application', async () => {
    const res = await request(app)
      .get('/api/v1/applications/fake-id')
      .set('Cookie', candidateCookie);

    expect(res.status).toBe(404);
  });
});

// ── Recommendations ─────────────────────────────────────────────────

describe('GET /api/v1/applications/recommendations/for-me', () => {
  it('returns recommended jobs sorted by match score', async () => {
    // Create multiple jobs
    await request(app).post('/api/v1/jobs').set('Cookie', agentCookie)
      .send({ title: 'React Dev', company: 'AlphaCo', location: 'Dubai', country: 'UAE', skills: ['React'], experience: 2 });
    await request(app).post('/api/v1/jobs').set('Cookie', agentCookie)
      .send({ title: 'Python Dev', company: 'BetaCo', location: 'Ottawa', country: 'Canada', skills: ['Python'], experience: 5 });
    await request(app).post('/api/v1/jobs').set('Cookie', agentCookie)
      .send({ title: 'Full Stack', company: 'GammaCo', location: 'Abu Dhabi', country: 'UAE', skills: ['React', 'Node.js'], experience: 3 });

    const res = await request(app)
      .get('/api/v1/applications/recommendations/for-me')
      .set('Cookie', candidateCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);

    // Should include the original job too (4 total, all not applied)
    // Check sorted by match score descending
    for (let i = 1; i < res.body.data.length; i++) {
      expect(res.body.data[i - 1].matchScore).toBeGreaterThanOrEqual(res.body.data[i].matchScore);
    }

    // Each should have scoreBreakdown
    expect(res.body.data[0].scoreBreakdown).toBeDefined();
  });

  it('excludes jobs already applied to', async () => {
    // Apply to the default job
    await request(app)
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set('Cookie', candidateCookie);

    // Create another job
    await request(app).post('/api/v1/jobs').set('Cookie', agentCookie)
      .send({ title: 'New Job', company: 'DeltaCo', location: 'Dubai', country: 'UAE', skills: ['React'], experience: 1 });

    const res = await request(app)
      .get('/api/v1/applications/recommendations/for-me')
      .set('Cookie', candidateCookie);

    // Applied job should not appear
    const ids = res.body.data.map((j: any) => j.id);
    expect(ids).not.toContain(jobId);
    expect(res.body.data.length).toBe(1);
  });

  it('returns recommendations for new candidate (auto-profile created)', async () => {
    // Register fresh candidate — auto-creates profile now
    const fresh = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'fresh@test.com', password: 'Test@123', role: 'candidate' });
    const freshCookie = fresh.headers['set-cookie'] as unknown as string[];

    const res = await request(app)
      .get('/api/v1/applications/recommendations/for-me')
      .set('Cookie', freshCookie);

    expect(res.status).toBe(200);
    // With auto-profile, candidate has basic profile so may get recommendations
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('rejects agent → 403', async () => {
    const res = await request(app)
      .get('/api/v1/applications/recommendations/for-me')
      .set('Cookie', agentCookie);

    expect(res.status).toBe(403);
  });
});

// ── Interview Outcome (v0.4.13.0) ───────────────────────────────────
// Replaces the v0.4.12-era "Mark Selected" one-tap with a deliberate
// pass/fail + notes capture that also writes the interviews row.
describe('POST /api/v1/applications/:id/interview-outcome', () => {
  async function setupScheduledInterview(): Promise<string> {
    const applyRes = await request(app).post(`/api/v1/jobs/${jobId}/apply`).set('Cookie', candidateCookie);
    const appId = applyRes.body.data.id;
    for (const status of ['reviewed', 'shortlisted', 'interview_scheduled']) {
      const r = await request(app)
        .patch(`/api/v1/applications/${appId}/status`)
        .set('Cookie', agentCookie)
        .send({ status });
      expect(r.status).toBe(200);
    }
    return appId;
  }

  it('pass → transitions application to selected and writes interviews row', async () => {
    const appId = await setupScheduledInterview();

    const res = await request(app)
      .post(`/api/v1/applications/${appId}/interview-outcome`)
      .set('Cookie', agentCookie)
      .send({ result: 'pass', notes: 'Strong communicator', rating: 4 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('selected');

    const db = getDb();
    const [appRow] = await db.select().from(applications).where(eq(applications.id, appId)).limit(1);
    expect((appRow as any).status).toBe('selected');

    const ivRows = await db.select().from(interviews).where(eq(interviews.applicationId, appId));
    expect(ivRows.length).toBe(1);
    expect((ivRows[0] as any).result).toBe('selected');
    expect((ivRows[0] as any).notes).toBe('Strong communicator');
    expect((ivRows[0] as any).rating).toBe(4);
  });

  it('fail → transitions to rejected and stores notes as rejectionFeedback', async () => {
    const appId = await setupScheduledInterview();

    const res = await request(app)
      .post(`/api/v1/applications/${appId}/interview-outcome`)
      .set('Cookie', agentCookie)
      .send({ result: 'fail', notes: 'Not a fit for the role' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    expect(res.body.data.rejectionFeedback).toBe('Not a fit for the role');

    const db = getDb();
    const ivRows = await db.select().from(interviews).where(eq(interviews.applicationId, appId));
    expect(ivRows.length).toBe(1);
    expect((ivRows[0] as any).result).toBe('rejected');
  });

  it('rejects an outcome before the interview is scheduled (status guard)', async () => {
    const applyRes = await request(app).post(`/api/v1/jobs/${jobId}/apply`).set('Cookie', candidateCookie);
    const appId = applyRes.body.data.id;

    const res = await request(app)
      .post(`/api/v1/applications/${appId}/interview-outcome`)
      .set('Cookie', agentCookie)
      .send({ result: 'pass' });

    expect(res.status).toBe(400);
  });

  it('rejects invalid result values (400)', async () => {
    const appId = await setupScheduledInterview();
    const res = await request(app)
      .post(`/api/v1/applications/${appId}/interview-outcome`)
      .set('Cookie', agentCookie)
      .send({ result: 'maybe' });
    expect(res.status).toBe(400);
  });

  it('rejects out-of-range rating (400)', async () => {
    const appId = await setupScheduledInterview();
    const res = await request(app)
      .post(`/api/v1/applications/${appId}/interview-outcome`)
      .set('Cookie', agentCookie)
      .send({ result: 'pass', rating: 9 });
    expect(res.status).toBe(400);
  });

  it('rejects a candidate trying to self-record (403)', async () => {
    const appId = await setupScheduledInterview();
    const res = await request(app)
      .post(`/api/v1/applications/${appId}/interview-outcome`)
      .set('Cookie', candidateCookie)
      .send({ result: 'pass' });
    expect(res.status).toBe(403);
  });
});

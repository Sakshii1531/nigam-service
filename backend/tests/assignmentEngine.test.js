import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { AssignmentWeighting } from '../src/modules/super-admin/assignmentWeighting.model.js';
import { findAvailableTechnician, rankTechnicians } from '../src/modules/shared/assignmentEngine.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('assignmentEngine');

let phoneCounter = 9600000000;
function nextPhone() {
  return String(phoneCounter++);
}

async function createTechnician({ specs, city, serviceCityName, serviceStateName, rating = 0, activeJobsCount = 0, availability = 'Available', status = 'Active' }) {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.TECHNICIAN, phone, name: 'Fixture Technician', passwordHash: await hashPassword('password123') });
  return Technician.create({ user: user._id, name: 'Fixture Technician', phone, specs, city, serviceCityName, serviceStateName, rating, activeJobsCount, availability, status });
}

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Technician.deleteMany({}), City.deleteMany({}), AssignmentWeighting.deleteMany({})]);
});

describe('findAvailableTechnician — weighted scoring', () => {
  it('returns null when no Active+Available technician exists', async () => {
    await createTechnician({ specs: ['AC'], status: 'Inactive' });
    const result = await findAvailableTechnician({ category: 'AC' });
    expect(result).toBeNull();
  });

  it('picks the only candidate when there is just one', async () => {
    const tech = await createTechnician({ specs: ['AC'] });
    const result = await findAvailableTechnician({ category: 'AC' });
    expect(String(result._id)).toBe(String(tech._id));
  });

  it('never considers a technician who is Busy/Offline or Inactive/Pending, regardless of score', async () => {
    const eligible = await createTechnician({ specs: ['AC'], rating: 1 }); // low rating, but eligible
    await createTechnician({ specs: ['AC'], rating: 5, availability: 'Busy' }); // higher rating but unavailable
    await createTechnician({ specs: ['AC'], rating: 5, status: 'Inactive' }); // higher rating but inactive

    const result = await findAvailableTechnician({ category: 'AC' });
    expect(String(result._id)).toBe(String(eligible._id));
  });

  it('a specs match outweighs a non-match when other factors are equal (fresh fixtures, no rating/workload history)', async () => {
    // Every technician created via the /_dev/test-technician fixture (and the
    // shared seeded one) starts at rating=0, activeJobsCount=0 — under those
    // conditions the specs match is the only differentiator, and it must win.
    // This is the exact property e2e/api/booking.spec.js's test isolation relies on.
    const specialist = await createTechnician({ specs: ['AC'], rating: 0, activeJobsCount: 0 });
    await createTechnician({ specs: ['Refrigerator'], rating: 0, activeJobsCount: 0 });

    const result = await findAvailableTechnician({ category: 'AC' });
    expect(String(result._id)).toBe(String(specialist._id));
  });

  it('a strong enough rating advantage CAN outweigh a specs mismatch (weighted, not a hard filter)', async () => {
    // 18-point fixed skill-score gap (60 pts * 30% weight) can be overcome by a
    // large enough rating gap (100 pts * 20% weight = 20 > 18) — proves scoring is
    // genuinely weighted across all four factors, not skill-gated.
    await createTechnician({ specs: ['AC'], rating: 0, activeJobsCount: 0 });
    const topRatedGeneralist = await createTechnician({ specs: ['Refrigerator'], rating: 5, activeJobsCount: 0 });

    const result = await findAvailableTechnician({ category: 'AC' });
    expect(String(result._id)).toBe(String(topRatedGeneralist._id));
  });

  it('falls back to the best-scoring generalist when nobody specializes in the category', async () => {
    const betterGeneralist = await createTechnician({ specs: ['Refrigerator'], rating: 5, activeJobsCount: 0 });
    await createTechnician({ specs: ['Washing Machine'], rating: 0, activeJobsCount: 5 });

    const result = await findAvailableTechnician({ category: 'AC' });
    expect(String(result._id)).toBe(String(betterGeneralist._id));
  });

  it('breaks a specs tie by rating and workload', async () => {
    const best = await createTechnician({ specs: ['AC'], rating: 5, activeJobsCount: 0 });
    await createTechnician({ specs: ['AC'], rating: 2, activeJobsCount: 3 });

    const result = await findAvailableTechnician({ category: 'AC' });
    expect(String(result._id)).toBe(String(best._id));
  });

  it('scores proximity by city-name match when a city is provided', async () => {
    const lucknow = await City.create({ name: 'Lucknow', state: 'UP' });
    const delhi = await City.create({ name: 'Delhi', state: 'Delhi' });

    // Both are generalists (no specs match) with identical rating/workload — only
    // proximity differs, so the city match must be what decides it.
    const nearby = await createTechnician({ specs: [], city: lucknow._id, rating: 0, activeJobsCount: 0 });
    await createTechnician({ specs: [], city: delhi._id, rating: 0, activeJobsCount: 0 });

    const result = await findAvailableTechnician({ category: 'AC', city: 'Lucknow' });
    expect(String(result._id)).toBe(String(nearby._id));
  });

  it('respects a custom AssignmentWeighting config instead of the hardcoded default', async () => {
    // Weight workload at 100%, everything else at 0 — the technician with fewer
    // active jobs must win even with a worse specs/rating match.
    await AssignmentWeighting.create({ proximityPercent: 0, skillPercent: 0, ratingPercent: 0, workloadPercent: 100 });

    const leastBusy = await createTechnician({ specs: [], rating: 0, activeJobsCount: 0 });
    await createTechnician({ specs: ['AC'], rating: 5, activeJobsCount: 4 });

    const result = await findAvailableTechnician({ category: 'AC' });
    expect(String(result._id)).toBe(String(leastBusy._id));
  });

  it('strictly enforces territory isolation: an Indore booking NEVER assigns Delhi/Bangalore technician', async () => {
    // Delhi technician has 5-star rating and perfect AC specs
    const delhiTech = await createTechnician({
      specs: ['AC'],
      serviceCityName: 'Delhi',
      serviceStateName: 'Delhi',
      rating: 5,
      activeJobsCount: 0,
    });
    // Indore technician is a fresh fixture with 0 rating
    const indoreTech = await createTechnician({
      specs: ['AC'],
      serviceCityName: 'Indore',
      serviceStateName: 'Madhya Pradesh',
      rating: 0,
      activeJobsCount: 0,
    });

    const result = await findAvailableTechnician({ category: 'AC', city: 'Indore', state: 'Madhya Pradesh' });
    expect(result).not.toBeNull();
    expect(String(result._id)).toBe(String(indoreTech._id));
    expect(String(result._id)).not.toBe(String(delhiTech._id));
  });

  it('returns null if no technician is registered in the customer city, even if out-of-city technicians are available', async () => {
    await createTechnician({
      specs: ['AC'],
      serviceCityName: 'Delhi',
      serviceStateName: 'Delhi',
      rating: 5,
    });
    await createTechnician({
      specs: ['AC'],
      serviceCityName: 'Bengaluru',
      serviceStateName: 'Karnataka',
      rating: 5,
    });

    const result = await findAvailableTechnician({ category: 'AC', city: 'Indore', state: 'Madhya Pradesh' });
    expect(result).toBeNull();
  });
});

describe('rankTechnicians — the shortlist the assignment console shows', () => {
  it('returns every candidate ordered by score, with the same winner as findAvailableTechnician', async () => {
    const lucknow = await City.create({ name: 'Lucknow' });
    const specialist = await createTechnician({ specs: ['AC'], city: lucknow._id, serviceCityName: 'Lucknow', rating: 5 });
    await createTechnician({ specs: ['TV'], city: lucknow._id, serviceCityName: 'Lucknow', rating: 1 });
    await createTechnician({ specs: ['TV'], city: lucknow._id, serviceCityName: 'Lucknow', rating: 0, activeJobsCount: 4 });

    const ranked = await rankTechnicians({ category: 'AC', city: 'Lucknow' });
    expect(ranked).toHaveLength(3);
    expect(String(ranked[0].technician._id)).toBe(String(specialist._id));
    // Descending, and every entry carries the breakdown the console renders.
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
    expect(ranked[0]).toMatchObject({ proximity: 100, skill: 100 });

    const best = await findAvailableTechnician({ category: 'AC', city: 'Lucknow' });
    expect(String(best._id)).toBe(String(specialist._id));
  });

  it('strictly filters out out-of-territory candidates from rankTechnicians shortlist', async () => {
    await createTechnician({ specs: ['AC'], serviceCityName: 'Delhi', rating: 5 });
    const indore1 = await createTechnician({ specs: ['AC'], serviceCityName: 'Indore', rating: 4 });
    const indore2 = await createTechnician({ specs: ['AC'], serviceCityName: 'Indore', rating: 2 });

    const shortlist = await rankTechnicians({ category: 'AC', city: 'Indore' });
    expect(shortlist).toHaveLength(2);
    const shortlistIds = shortlist.map(s => String(s.technician._id));
    expect(shortlistIds).toContain(String(indore1._id));
    expect(shortlistIds).toContain(String(indore2._id));
  });

  it('excludes technicians the hard filter rejects, and returns [] when none qualify', async () => {
    await createTechnician({ specs: ['AC'], status: 'Inactive' });
    await createTechnician({ specs: ['AC'], availability: 'Busy' });
    expect(await rankTechnicians({ category: 'AC' })).toEqual([]);
  });
});


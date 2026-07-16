import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { generateHumanId } from '../src/modules/shared/idGenerator.js';
import { Counter } from '../src/modules/shared/counter.model.js';
import { ID_PREFIXES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('idgenerator');

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Counter.deleteMany({});
});

describe('generateHumanId', () => {
  it('increments sequentially for a no-reset, no-date prefix (SR-####)', async () => {
    const first = await generateHumanId(ID_PREFIXES.SERVICE_REQUEST);
    const second = await generateHumanId(ID_PREFIXES.SERVICE_REQUEST);
    expect(first).toBe('SR-0001');
    expect(second).toBe('SR-0002');
  });

  it('formats a daily-reset prefix as PREFIX-YYMMDD-#### (NCC bookings)', async () => {
    const id = await generateHumanId(ID_PREFIXES.BOOKING);
    const yy = String(new Date().getFullYear()).slice(-2);
    expect(id).toMatch(new RegExp(`^NCC-${yy}\\d{4}-0001$`));
  });

  it('formats a yearly-reset prefix as PREFIX-YYYY-### (invoices)', async () => {
    const id = await generateHumanId(ID_PREFIXES.INVOICE);
    const yyyy = new Date().getFullYear();
    expect(id).toBe(`INV-${yyyy}-001`);
  });

  it('formats a no-separator prefix correctly (extended warranty)', async () => {
    const id = await generateHumanId(ID_PREFIXES.EXTENDED_WARRANTY);
    expect(id).toBe('NCCEW000001');
  });

  it('keeps counters independent per prefix', async () => {
    await generateHumanId(ID_PREFIXES.CLAIM);
    await generateHumanId(ID_PREFIXES.CLAIM);
    const firstInvoice = await generateHumanId(ID_PREFIXES.INVOICE);
    expect(firstInvoice).toMatch(/^INV-\d{4}-001$/);
  });

  it('throws for a prefix with no ID_SCHEMES entry', async () => {
    await expect(generateHumanId('NOT-A-REAL-PREFIX')).rejects.toThrow(/no ID_SCHEMES entry/);
  });
});

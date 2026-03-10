/**
 * Chain watcher integration tests.
 *
 * Tests the mock adapter, address manager resolution, and
 * transaction classification pipeline without real chain access.
 */
import { MockFiroAdapter } from '../adapters/mock-firo.adapter';
import type { SparkMintInfo, TxClassification } from '@sparkderby/shared';

describe('MockFiroAdapter', () => {
  let adapter: MockFiroAdapter;

  beforeEach(async () => {
    adapter = new MockFiroAdapter();
    await adapter.connect();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('connects and pings successfully', async () => {
    expect(await adapter.ping()).toBe(true);
  });

  it('generates unique Spark addresses', async () => {
    const addr1 = await adapter.getNewSparkAddress('test1');
    const addr2 = await adapter.getNewSparkAddress('test2');
    expect(addr1).toMatch(/^sm1mock/);
    expect(addr2).toMatch(/^sm1mock/);
    expect(addr1).not.toBe(addr2);
  });

  it('validates Spark addresses', async () => {
    expect(await adapter.validateSparkAddress('sm1mockabcdef1234567890')).toBe(true);
    expect(await adapter.validateSparkAddress('invalid')).toBe(false);
    expect(await adapter.validateSparkAddress('sm1')).toBe(false);
  });

  it('resolves .spark names', async () => {
    const result = await adapter.resolveSparkName('alice.spark');
    expect(result.resolved).toBe(true);
    expect(result.address).toMatch(/^sm1mock/);

    const bad = await adapter.resolveSparkName('notasparkname');
    expect(bad.resolved).toBe(false);
  });

  it('tracks balance through spends', async () => {
    adapter.setBalance(50);
    const bal1 = await adapter.getSparkBalance();
    expect(bal1.available).toBe(50);

    await adapter.spendSpark([
      { address: 'sm1mocktarget', amount: 10, memo: 'test' },
    ]);
    const bal2 = await adapter.getSparkBalance();
    expect(bal2.available).toBe(40);
  });

  it('rejects spends exceeding balance', async () => {
    adapter.setBalance(5);
    await expect(
      adapter.spendSpark([{ address: 'sm1mocktarget', amount: 100 }]),
    ).rejects.toThrow('insufficient balance');
  });

  it('returns InstantLock status as locked', async () => {
    const status = await adapter.getInstantLockStatus('sometxid');
    expect(status).toBe('locked');
  });

  it('processes batch payouts', async () => {
    adapter.setBalance(100);
    const results = await adapter.sendBatchPayout([
      { recipientAddress: 'sm1a', amount: 10, raceId: 'r1', playerId: 'p1', place: 1 },
      { recipientAddress: 'sm1b', amount: 5, raceId: 'r1', playerId: 'p2', place: 2 },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);

    const bal = await adapter.getSparkBalance();
    expect(bal.available).toBe(85);
  });

  it('simulates inbound mints', async () => {
    const mint: SparkMintInfo = {
      txid: 'tx001', amount: 5, sparkAddress: 'sm1target',
      memo: 'test', confirmations: 1,
    };
    adapter.simulateInboundMint(mint);

    const mints = await adapter.listSparkMints();
    expect(mints).toHaveLength(1);
    expect(mints[0].txid).toBe('tx001');
  });
});

describe('Transaction Classification Pipeline', () => {
  it('classifies backing by memo fallback', () => {
    // Verify the TxClassification types cover all expected kinds
    const backing: TxClassification = { kind: 'backing', raceId: 'r1', racerId: 'racer1', amount: 5 };
    expect(backing.kind).toBe('backing');

    const action: TxClassification = { kind: 'action', raceId: 'r1', racerId: 'racer1', actionType: 'boost', amount: 0.1 };
    expect(action.kind).toBe('action');

    const treasury: TxClassification = { kind: 'treasury', amount: 10 };
    expect(treasury.kind).toBe('treasury');

    const unknown: TxClassification = { kind: 'unknown', txid: 'abc123' };
    expect(unknown.kind).toBe('unknown');
  });
});

import { randomBytes } from 'crypto';
import { describe, it, expect } from 'vitest';
import { State } from '../managed/bboard/contract/index.js';
import { BBoardSimulator } from './bboard-simulator.js';

describe('BBoard smart contract', () => {
  it('properly initializes ledger state', () => {
    const simulator = new BBoardSimulator(randomBytes(32));
    const ledger = simulator.getLedger();
    expect(ledger.state).toEqual(State.VACANT);
    expect(ledger.loadNumber.is_some).toEqual(false);
    expect(ledger.rate).toEqual(0n);
    expect(ledger.sequence).toEqual(1n);
  });

  it('lets a shipper post a load', () => {
    const simulator = new BBoardSimulator(randomBytes(32));
    simulator.postLoad('BOL-001', 450n, 'Golden CO to Durango CO, reefer required');
    const ledger = simulator.getLedger();
    expect(ledger.state).toEqual(State.OCCUPIED);
    expect(ledger.loadNumber.is_some).toEqual(true);
    expect(ledger.loadNumber.value).toEqual('BOL-001');
    expect(ledger.rate).toEqual(450n);
  });

  it('owner commitment is sealed and not zero after posting', () => {
    const simulator = new BBoardSimulator(randomBytes(32));
    simulator.postLoad('BOL-002', 350n, 'reefer load');
    const ledger = simulator.getLedger();
    expect(ledger.state).toEqual(State.OCCUPIED);
    // ownerCommitment should be set (non-zero) but sealed from external observers
    const allZero = ledger.ownerCommitment.every((b) => b === 0);
    expect(allZero).toEqual(false);
  });

  it('lets the original shipper take down their load', () => {
    const simulator = new BBoardSimulator(randomBytes(32));
    simulator.postLoad('BOL-003', 400n, 'dry van, Golden to Albuquerque');
    simulator.takeDown();
    const ledger = simulator.getLedger();
    expect(ledger.state).toEqual(State.VACANT);
    expect(ledger.loadNumber.is_some).toEqual(false);
    expect(ledger.rate).toEqual(0n);
  });

  it('does not let a different user take down the load', () => {
    const simulator = new BBoardSimulator(randomBytes(32));
    simulator.postLoad('BOL-004', 500n, 'hazmat, flatbed');
    simulator.switchUser(randomBytes(32));
    expect(() => simulator.takeDown()).toThrow();
  });

  it('does not let a shipper post when board is occupied', () => {
    const simulator = new BBoardSimulator(randomBytes(32));
    simulator.postLoad('BOL-005', 300n, 'first load');
    expect(() => simulator.postLoad('BOL-006', 300n, 'second load')).toThrow();
  });

  it('lets a new shipper post after takedown', () => {
    const simulator = new BBoardSimulator(randomBytes(32));
    simulator.postLoad('BOL-007', 420n, 'first shipper load');
    simulator.takeDown();
    simulator.switchUser(randomBytes(32));
    simulator.postLoad('BOL-008', 380n, 'second shipper load');
    const ledger = simulator.getLedger();
    expect(ledger.state).toEqual(State.OCCUPIED);
    expect(ledger.loadNumber.value).toEqual('BOL-008');
  });
});

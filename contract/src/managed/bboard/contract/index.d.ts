import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum State { VACANT = 0, OCCUPIED = 1 }

export enum CarrierStatus { UNREGISTERED = 0, ACTIVE = 1 }

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  postLoad(context: __compactRuntime.CircuitContext<PS>,
           newLoadNumber_0: string,
           newRate_0: bigint,
           newNotes_0: string): __compactRuntime.CircuitResults<PS, []>;
  registerCarrier(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  verifyCarrier(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claimLoad(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, string>;
  takeDown(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revealOwnership(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type ProvableCircuits<PS> = {
  postLoad(context: __compactRuntime.CircuitContext<PS>,
           newLoadNumber_0: string,
           newRate_0: bigint,
           newNotes_0: string): __compactRuntime.CircuitResults<PS, []>;
  registerCarrier(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  verifyCarrier(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claimLoad(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, string>;
  takeDown(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revealOwnership(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  postLoad(context: __compactRuntime.CircuitContext<PS>,
           newLoadNumber_0: string,
           newRate_0: bigint,
           newNotes_0: string): __compactRuntime.CircuitResults<PS, []>;
  registerCarrier(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  verifyCarrier(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claimLoad(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, string>;
  takeDown(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revealOwnership(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly state: State;
  readonly loadNumber: { is_some: boolean, value: string };
  readonly rate: bigint;
  readonly notes: { is_some: boolean, value: string };
  readonly ownerCommitment: Uint8Array;
  readonly sequence: bigint;
  readonly carrierStatus: CarrierStatus;
  readonly carrierCommitment: Uint8Array;
  readonly carrierSequence: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;

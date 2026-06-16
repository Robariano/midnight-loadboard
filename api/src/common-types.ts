import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { State, BBoardPrivateState, Contract, Witnesses } from '../../contract/src/index';

export const bboardPrivateStateKey = 'bboardPrivateState';
export type PrivateStateId = typeof bboardPrivateStateKey;

export type PrivateStates = {
  readonly bboardPrivateState: BBoardPrivateState;
};

export type BBoardContract = Contract<BBoardPrivateState, Witnesses<BBoardPrivateState>>;
export type BBoardCircuitKeys = Exclude<keyof BBoardContract['impureCircuits'], number | symbol>;
export type BBoardProviders = MidnightProviders<BBoardCircuitKeys, PrivateStateId, BBoardPrivateState>;
export type DeployedBBoardContract = FoundContract<BBoardContract>;

export type BBoardDerivedState = {
  readonly state: State;
  readonly sequence: bigint;
  readonly loadNumber: string | undefined;
  readonly rate: bigint;
  readonly notes: string | undefined;
  readonly isOwner: boolean;
};

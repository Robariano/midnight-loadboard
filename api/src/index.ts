import * as BBoard from '../../contract/src/managed/bboard/contract/index.js';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import {
  type BBoardDerivedState,
  type BBoardContract,
  type BBoardProviders,
  type DeployedBBoardContract,
  bboardPrivateStateKey,
} from './common-types.js';
import { CompiledBBoardContractContract } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { BBoardPrivateState, createBBoardPrivateState } from '../../contract/src/witnesses.js';

export interface DeployedBBoardAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<BBoardDerivedState>;
  postLoad: (loadNumber: string, rate: bigint, notes: string) => Promise<void>;
  claimLoad: () => Promise<void>;
  takeDown: () => Promise<void>;
  revealOwnership: () => Promise<void>;
  registerCarrier: () => Promise<void>;
  verifyCarrier: () => Promise<string>;
}

export class BBoardAPI implements DeployedBBoardAPI {
  private constructor(
    public readonly deployedContract: DeployedBBoardContract,
    providers: BBoardProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => BBoard.ledger(contractState.data)),
        ),
        from(providers.privateStateProvider.get(bboardPrivateStateKey) as Promise<BBoardPrivateState>),
      ],
      (ledgerState, privateState) => {
        return {
          state: ledgerState.state,
          loadNumber: ledgerState.loadNumber.is_some ? ledgerState.loadNumber.value : undefined,
          rate: ledgerState.rate,
          notes: ledgerState.notes.is_some ? ledgerState.notes.value : undefined,
          sequence: ledgerState.sequence,
          isOwner: toHex(ledgerState.ownerCommitment) !== '0'.repeat(64),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<BBoardDerivedState>;

  async postLoad(loadNumber: string, rate: bigint, notes: string): Promise<void> {
    this.logger?.info(`postingLoad: ${loadNumber} at ${rate} cents/mile`);
    const txData = await this.deployedContract.callTx.postLoad(loadNumber, rate, notes);
    this.logger?.trace({ circuit: 'postLoad', txHash: txData.public.txHash });
  }

  async claimLoad(): Promise<void> {
    this.logger?.info('claimingLoad');
    const txData = await this.deployedContract.callTx.claimLoad();
    this.logger?.trace({ circuit: 'claimLoad', txHash: txData.public.txHash });
  }

  async takeDown(): Promise<void> {
    this.logger?.info('takingDownLoad');
    const txData = await this.deployedContract.callTx.takeDown();
    this.logger?.trace({ circuit: 'takeDown', txHash: txData.public.txHash });
  }

  async revealOwnership(): Promise<void> {
    this.logger?.info('revealingOwnership');
    const txData = await this.deployedContract.callTx.revealOwnership();
    this.logger?.trace({ circuit: 'revealOwnership', txHash: txData.public.txHash });
  }

  async registerCarrier(): Promise<void> {
    const txData = await this.deployedContract.callTx.registerCarrier();
    this.logger?.trace({ circuit: 'registerCarrier', txHash: txData.public.txHash });
  }

  async verifyCarrier(): Promise<string> {
    const txData = await this.deployedContract.callTx.verifyCarrier();
    this.logger?.trace({ circuit: 'verifyCarrier', txHash: txData.public.txHash });
    return txData.public.txHash;
  }

  static async deploy(providers: BBoardProviders, logger?: Logger): Promise<BBoardAPI> {
    logger?.info('deployContract');
    const deployedBBoardContract = await deployContract(providers, {
      compiledContract: CompiledBBoardContractContract,
      privateStateId: bboardPrivateStateKey,
      initialPrivateState: createBBoardPrivateState(utils.randomBytes(32)),
    });
    return new BBoardAPI(deployedBBoardContract, providers, logger);
  }

  static async join(providers: BBoardProviders, contractAddress: ContractAddress, logger?: Logger): Promise<BBoardAPI> {
    logger?.info({ joinContract: { contractAddress } });
    const deployedBBoardContract = await findDeployedContract<BBoardContract>(providers, {
      contractAddress,
      compiledContract: CompiledBBoardContractContract,
      privateStateId: bboardPrivateStateKey,
      initialPrivateState: await BBoardAPI.getPrivateState(providers, contractAddress),
    });
    return new BBoardAPI(deployedBBoardContract, providers, logger);
  }

  private static async getPrivateState(
    providers: BBoardProviders,
    contractAddress: ContractAddress,
  ): Promise<BBoardPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(bboardPrivateStateKey);
    return existingPrivateState ?? createBBoardPrivateState(utils.randomBytes(32));
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';

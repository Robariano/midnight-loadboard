import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../managed/bboard/contract/index.js";
import { type BBoardPrivateState, witnesses } from "../witnesses.js";

export class BBoardSimulator {
  readonly contract: Contract<BBoardPrivateState>;
  circuitContext: CircuitContext<BBoardPrivateState>;

  constructor(secretKey: Uint8Array) {
    this.contract = new Contract<BBoardPrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(createConstructorContext({ secretKey }, "0".repeat(64)));
    this.circuitContext = { currentPrivateState, currentZswapLocalState, costModel: CostModel.initialCostModel(), currentQueryContext: new QueryContext(currentContractState.data, sampleContractAddress()) };
  }

  public switchUser(secretKey: Uint8Array) { this.circuitContext.currentPrivateState = { secretKey }; }
  public getLedger(): Ledger { return ledger(this.circuitContext.currentQueryContext.state); }
  public getPrivateState(): BBoardPrivateState { return this.circuitContext.currentPrivateState; }

  public postLoad(loadNumber: string, rate: bigint, notes: string): Ledger {
    this.circuitContext = this.contract.impureCircuits.postLoad(this.circuitContext, loadNumber, rate, notes).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public takeDown(): Ledger {
    this.circuitContext = this.contract.impureCircuits.takeDown(this.circuitContext).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }
}

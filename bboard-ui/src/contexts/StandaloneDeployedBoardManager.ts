import { Observable, interval, from, EMPTY } from 'rxjs';
import { switchMap, startWith, shareReplay, catchError } from 'rxjs/operators';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { type DeployedBBoardAPI, type BBoardDerivedState } from '../../../api/src/index';
import { State } from '../../../contract/src/index';

const API_BASE = 'http://localhost:3100/api';

export class StandaloneDeployedBoardAPI implements DeployedBBoardAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<BBoardDerivedState>;

  constructor(address: string) {
    this.deployedContractAddress = address as ContractAddress;
    this.state$ = interval(2000).pipe(
      startWith(0),
      switchMap(() =>
        from(
          fetch(`${API_BASE}/state`)
            .then((r) => r.json())
            .then((data) => ({
              state: data.state?.occupied ? State.OCCUPIED : State.VACANT,
              isOwner: data.state?.isOwner ?? false,
              loadNumber: data.state?.loadNumber,
              notes: data.state?.notes,
              rate: data.state?.rate != null ? BigInt(data.state.rate) : 0n,
              sequence: data.state?.sequence ?? 0,
            }) as BBoardDerivedState)
        ).pipe(catchError((e) => { console.warn('[Standalone] poll failed:', e); return EMPTY; }))
      ),
      shareReplay(1),
    );
  }

  async postLoad(loadNumber: string, rate: bigint, notes: string): Promise<void> {
    const res = await fetch(`${API_BASE}/post-load`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loadNumber, rate: rate.toString(), notes }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
  }
  async takeDown(): Promise<void> {
    const res = await fetch(`${API_BASE}/take-down`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).error);
  }
  async claimLoad(): Promise<void> {
    const res = await fetch(`${API_BASE}/claim-load`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json() as { error: string }).error);
  }
  async revealOwnership(): Promise<void> {
    const res = await fetch(`${API_BASE}/reveal-ownership`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json() as { error: string }).error);
  }
  async registerCarrier(): Promise<void> {
    const res = await fetch(`${API_BASE}/register-carrier`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json() as { error: string }).error);
  }
  async verifyCarrier(): Promise<string> {
    const res = await fetch(`${API_BASE}/verify-carrier`, { method: 'POST' });
    const data = await res.json() as { success: boolean; proof: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? 'Verify failed');
    return data.proof;
  }
}

export async function createStandaloneAPI(): Promise<StandaloneDeployedBoardAPI> {
  let data: any;
  try {
    const res = await fetch(`${API_BASE}/state`);
    data = await res.json();
  } catch {
    throw new Error('Standalone API not reachable. Is bboard-cli running?');
  }
  if (!data.address) throw new Error('No contract deployed. Run option 1 in bboard-cli first.');
  return new StandaloneDeployedBoardAPI(data.address);
}

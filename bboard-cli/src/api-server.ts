import express from 'express';
import cors from 'cors';
import { type DeployedBBoardAPI, type BBoardDerivedState } from '../../api/src/index';

let currentAPI: DeployedBBoardAPI | null = null;
let lastState: BBoardDerivedState | null = null;

export function setDeployedAPI(api: DeployedBBoardAPI): void {
  currentAPI = api;
  api.state$.subscribe((state) => { lastState = state; });
  console.log(`\n🚛  Standalone API ready — contract: ${api.deployedContractAddress}\n`);
}

export function startApiServer(port = 3100): void {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', hasContract: !!currentAPI });
  });

  app.get('/api/state', (_req, res) => {
    if (!currentAPI) { res.status(503).json({ error: 'No contract deployed yet' }); return; }
    res.json({
      address: currentAPI.deployedContractAddress,
      state: lastState
        ? {
            occupied: lastState.loadNumber != null,
            isOwner: lastState.isOwner,
            loadNumber: lastState.loadNumber,
            notes: lastState.notes,
            rate: lastState.rate !== undefined ? lastState.rate.toString() : null,
          }
        : null,
    });
  });

  app.post('/api/post-load', async (req, res) => {
    if (!currentAPI) { res.status(503).json({ error: 'No contract deployed' }); return; }
    const { loadNumber, rate, notes } = req.body;
    try {
      await currentAPI.postLoad(loadNumber, BigInt(rate), notes);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/api/take-down', async (_req, res) => {
    if (!currentAPI) { res.status(503).json({ error: 'No contract deployed' }); return; }
    try {
      await currentAPI.takeDown();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/api/reveal-ownership', async (_req, res) => {
    if (!currentAPI) { res.status(503).json({ error: 'No contract deployed' }); return; }
    try {
      await currentAPI.revealOwnership();
      res.json({ success: true });
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/api/register-carrier', async (_req, res) => {
    if (!currentAPI) { res.status(503).json({ error: 'No contract deployed' }); return; }
    try {
      await currentAPI.registerCarrier();
      res.json({ success: true });
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/api/verify-carrier', async (_req, res) => {
    if (!currentAPI) { res.status(503).json({ error: 'No contract deployed' }); return; }
    try {
      const proof = await currentAPI.verifyCarrier();
      res.json({ success: true, proof });
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/api/claim-load', async (_req, res) => {
    if (!currentAPI) { res.status(503).json({ error: 'No contract deployed' }); return; }
    try {
      await currentAPI.claimLoad();
      res.json({ success: true });
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.listen(port, () => {
    console.log(`\n🌐  Standalone API on http://localhost:${port}/api`);
    console.log(`    GET  /api/state`);
    console.log(`    POST /api/post-load  { loadNumber, rate, notes }`);
    console.log(`    POST /api/take-down\n`);
  });
}

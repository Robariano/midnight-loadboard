import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Divider, Typography } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedIcon from '@mui/icons-material/Verified';
import { State } from '../../../contract/src/managed/bboard/contract/index.js';
import type { BBoardDerivedState, DeployedBBoardAPI } from '../../../api/src/index';
import type { BoardDeployment } from '../contexts';
import type { Observable } from 'rxjs';

function isCarrierRegistered(): boolean {
  return !!sessionStorage.getItem('bboard-carrier-key');
}

interface LoadCardProps { deployment$: Observable<BoardDeployment>; }

const LoadCard: React.FC<LoadCardProps> = ({ deployment$ }) => {
  const [api, setApi] = useState<DeployedBBoardAPI | null>(null);
  const [state, setState] = useState<BBoardDerivedState | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const registered = isCarrierRegistered();

  useEffect(() => {
    const outerSub = deployment$.subscribe(dep => {
      if (dep.status !== 'deployed') { setApi(null); return; }
      setApi(dep.api);
      const innerSub = dep.api.state$.subscribe(setState);
      return () => innerSub.unsubscribe();
    });
    return () => outerSub.unsubscribe();
  }, [deployment$]);

  if (!api || !state || state.state === State.VACANT) return null;
  const isClaimed = state.state === State.OCCUPIED;

  async function handleClaim() {
    if (!api || !registered) return;
    setClaiming(true); setError(''); setSuccess('');
    try {
      await api.claimLoad();
      setSuccess('Load claimed!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Claim failed');
    } finally { setClaiming(false); }
  }

  return (
    <Card sx={{ background: '#111128', border: '1px solid #2a2a4a', borderRadius: 2, mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>{state.loadNumber ?? 'No load number'}</Typography>
            {state.notes && <Typography variant="body2" sx={{ color: '#888', mt: 0.5 }}>{state.notes}</Typography>}
            <Typography variant="caption" sx={{ color: '#555', fontFamily: 'monospace' }}>{String(api.deployedContractAddress)}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700 }}>${(Number(state.rate ?? 0n) / 100).toFixed(2)}/mi</Typography>
            <Chip size="small" label={isClaimed ? 'Claimed' : 'Open'} color={isClaimed ? 'default' : 'success'} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        {!isClaimed && (
          <Box sx={{ mt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 1 }}>{success}</Alert>}
            {registered ? (
              <Button variant="contained" size="small" onClick={handleClaim} disabled={claiming}
                startIcon={claiming ? <CircularProgress size={14} color="inherit" /> : <VerifiedIcon />}
                sx={{ background: '#7c6af7', '&:hover': { background: '#6a5ae0' } }}>
                {claiming ? 'Claiming...' : 'Claim Load'}
              </Button>
            ) : (
              <Alert severity="warning" icon={<LockIcon />} sx={{ background: '#1a1200', color: '#f5a623', fontSize: 12 }}>
                Register as a carrier first. Use the <strong>Carrier Registry</strong> tab.
              </Alert>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

interface LoadBoardProps { boardDeployments: Array<Observable<BoardDeployment>>; }

export const LoadBoard: React.FC<LoadBoardProps> = ({ boardDeployments }) => (
  <Card sx={{ background: '#0d0d1a', border: '1px solid #2a2a4a', borderRadius: 2, mb: 3 }}>
    <CardHeader
      avatar={<LocalShippingIcon sx={{ color: '#7c6af7' }} />}
      title={<Typography variant="h6" sx={{ color: '#fff' }}>Open Loads</Typography>}
      subheader={<Typography variant="caption" sx={{ color: '#888' }}>{boardDeployments.length} load{boardDeployments.length !== 1 ? 's' : ''} on the board</Typography>}
    />
    <Divider sx={{ borderColor: '#2a2a4a' }} />
    <CardContent>
      {boardDeployments.length === 0 && <Typography sx={{ color: '#555', fontSize: 14 }}>No open loads right now.</Typography>}
      {boardDeployments.map((dep, i) => <LoadCard key={i} deployment$={dep} />)}
    </CardContent>
  </Card>
);

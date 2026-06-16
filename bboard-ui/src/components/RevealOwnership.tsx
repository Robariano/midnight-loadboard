// RevealOwnership.tsx — lets the load owner prove their identity via ZK

import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, CardHeader,
  CircularProgress, Divider, Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import type { BoardDeployment } from '../contexts';
import type { Observable } from 'rxjs';

interface RevealOwnershipProps {
  boardDeployment$: Observable<BoardDeployment>;
}

export const RevealOwnership: React.FC<RevealOwnershipProps> = ({ boardDeployment$ }) => {
  const [deployment, setDeployment] = useState<BoardDeployment | null>(null);
  const [boardState, setBoardState] = useState<import('../../../api/src/index').BBoardDerivedState | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [takingDown, setTakingDown] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const sub = boardDeployment$.subscribe(setDeployment);
    return () => sub.unsubscribe();
  }, [boardDeployment$]);

  useEffect(() => {
    if (!deployment || deployment.status !== 'deployed') return;
    const sub = deployment.api.state$.subscribe(setBoardState);
    return () => sub.unsubscribe();
  }, [deployment]);

  if (!deployment || deployment.status !== 'deployed') return null;
  const { api } = deployment;
  const contractAddress = api.deployedContractAddress;

  async function handleReveal() {
    if (!api) return;
    setRevealing(true); setError(''); setSuccess('');
    try {
      await api.revealOwnership();
      setSuccess('Ownership revealed on-chain.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reveal failed');
    } finally {
      setRevealing(false);
    }
  }

  async function handleTakeDown() {
    if (!api) return;
    setTakingDown(true); setError(''); setSuccess('');
    try {
      await api.takeDown();
      setSuccess('Load removed from the board.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Take down failed');
    } finally {
      setTakingDown(false);
    }
  }

  return (
    <Card sx={{ background: '#0d0d1a', border: '1px solid #2a2a4a', borderRadius: 2, mb: 2 }}>
      <CardHeader
        avatar={<VisibilityIcon sx={{ color: '#7c6af7' }} />}
        title={<Typography variant="subtitle1" sx={{ color: '#fff' }}>My Load — Owner Actions</Typography>}
        subheader={
          <Typography variant="caption" sx={{ color: '#666', fontFamily: 'monospace' }}>
            {contractAddress}
          </Typography>
        }
      />
      <Divider sx={{ borderColor: '#2a2a4a' }} />
      <CardContent>
        <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>
          Load: <strong style={{ color: '#fff' }}>{boardState?.loadNumber ?? '—'}</strong>
          {boardState?.notes ? ` · ${boardState?.notes}` : ''}
        </Typography>

        {error   && <Alert severity="error"   sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={handleReveal} disabled={revealing || takingDown}
            startIcon={revealing ? <CircularProgress size={14} color="inherit" /> : <VisibilityIcon />}
            sx={{ borderColor: '#7c6af7', color: '#7c6af7' }}>
            {revealing ? 'Revealing…' : 'Reveal Ownership'}
          </Button>
          <Button variant="outlined" size="small" onClick={handleTakeDown} disabled={revealing || takingDown}
            startIcon={takingDown ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon />}
            sx={{ borderColor: '#e53935', color: '#e53935' }}>
            {takingDown ? 'Removing…' : 'Take Down'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

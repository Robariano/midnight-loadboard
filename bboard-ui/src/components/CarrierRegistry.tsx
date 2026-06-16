// CarrierRegistry.tsx — ZK carrier credential registration
// Slots into the existing MUI theme and DeployedBoardContext pattern.

import React, { useState } from 'react';
import {
  Box, Button, Card, CardContent, CardHeader,
  CircularProgress, Divider, TextField, Typography, Alert, Chip,
} from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import VerifiedIcon from '@mui/icons-material/Verified';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// ── Types ─────────────────────────────────────────────────────
interface CarrierCredentials {
  cdlNumber: string;
  insurancePolicy: string;
  dotNumber: string;
}

interface CarrierStatus {
  isRegistered: boolean;
  commitmentHash?: string;
  registeredAtBlock?: bigint;
}

// ── Helpers ───────────────────────────────────────────────────
// Derives a SHA-256 commitment from the credentials locally for display.
// The actual on-chain commitment is produced inside the ZK circuit.
async function deriveCommitment(creds: CarrierCredentials, secretKey: Uint8Array): Promise<string> {
  const raw = [creds.cdlNumber, creds.insurancePolicy, creds.dotNumber, ...Array.from(secretKey)].join('|');
  const encoded = new TextEncoder().encode(raw);
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
  return '0x' + Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getOrCreateCarrierKey(): Uint8Array {
  const stored = sessionStorage.getItem('bboard-carrier-key');
  if (stored) return new Uint8Array(JSON.parse(stored) as number[]);
  const key = crypto.getRandomValues(new Uint8Array(32));
  sessionStorage.setItem('bboard-carrier-key', JSON.stringify(Array.from(key)));
  return key;
}

// ── Component ─────────────────────────────────────────────────
interface CarrierRegistryProps { api: import('../../../api/src/index').DeployedBBoardAPI | undefined; }
export const CarrierRegistry: React.FC<CarrierRegistryProps> = ({ api }) => {
  const [creds, setCreds] = useState<CarrierCredentials>({ cdlNumber: '', insurancePolicy: '', dotNumber: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<CarrierStatus | null>(null);
  const [commitment, setCommitment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'register' | 'status'>('register');

  const field = (label: string, key: keyof CarrierCredentials, required = true) => (
    <TextField
      key={key}
      label={label}
      value={creds[key]}
      onChange={e => setCreds(prev => ({ ...prev, [key]: e.target.value }))}
      required={required}
      fullWidth
      size="small"
      sx={{ mb: 2 }}
      InputLabelProps={{ style: { color: '#aaa' } }}
      InputProps={{ style: { color: '#fff', background: '#1a1a2e' } }}
    />
  );

  async function handleRegister() {
    if (!creds.cdlNumber || !creds.insurancePolicy) {
      setError('CDL number and insurance policy are required.');
      return;
    }
    if (!api) { setError('No contract connected.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      getOrCreateCarrierKey();
      await api.registerCarrier();
      setSuccess('Registered as carrier via ZK proof!');
      setStatus({ isRegistered: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckStatus() {
    if (!api) { setError('No contract connected.'); return; }
    setBusy(true); setError(''); setStatus(null);
    try {
      const txHash = await api.verifyCarrier();
      setStatus({ isRegistered: true, commitmentHash: txHash });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lookup failed';
      if (msg.includes('Not a registered carrier')) {
        setStatus({ isRegistered: false });
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card sx={{ background: '#0d0d1a', border: '1px solid #2a2a4a', borderRadius: 2, mb: 3 }}>
      <CardHeader
        avatar={<BadgeIcon sx={{ color: '#7c6af7' }} />}
        title={<Typography variant="h6" sx={{ color: '#fff' }}>Carrier Registry</Typography>}
        subheader={<Typography variant="caption" sx={{ color: '#888' }}>Midnight Network · ZK credential commitment</Typography>}
      />
      <Divider sx={{ borderColor: '#2a2a4a' }} />
      <CardContent>
        {/* Tab switcher */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          {(['register', 'status'] as const).map(t => (
            <Button key={t} size="small" variant={tab === t ? 'contained' : 'outlined'}
              onClick={() => setTab(t)}
              sx={{ textTransform: 'none', borderColor: '#2a2a4a', color: tab === t ? '#fff' : '#888' }}>
              {t === 'register' ? 'Register' : 'My Status'}
            </Button>
          ))}
        </Box>

        {error   && <Alert severity="error"   sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {tab === 'register' && (
          <>
            <Alert severity="info" icon={<HelpOutlineIcon />} sx={{ mb: 3, background: '#0a1628', color: '#7eb8f7' }}>
              Your CDL and insurance details are <strong>never stored on-chain</strong>.
              Only a ZK commitment is recorded — your credentials stay private.
            </Alert>
            {field('CDL number', 'cdlNumber')}
            {field('Insurance policy number', 'insurancePolicy')}
            {field('DOT number (optional)', 'dotNumber', false)}
            <Button variant="contained" onClick={handleRegister} disabled={busy}
              sx={{ background: '#7c6af7', '&:hover': { background: '#6a5ae0' } }}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <VerifiedIcon />}>
              {busy ? 'Submitting…' : 'Register as Carrier'}
            </Button>
          </>
        )}

        {tab === 'status' && (
          <>
            <Button variant="outlined" onClick={handleCheckStatus} disabled={busy}
              sx={{ borderColor: '#2a2a4a', color: '#aaa', mb: 2 }}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
              {busy ? 'Checking…' : 'Check my registration'}
            </Button>
            {status && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  icon={status.isRegistered ? <VerifiedIcon /> : <HelpOutlineIcon />}
                  label={status.isRegistered ? 'Registered carrier' : 'Not registered'}
                  color={status.isRegistered ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                />
                {status.commitmentHash && (
                  <Typography variant="caption" sx={{ display: 'block', color: '#666', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    Commitment: {status.commitmentHash}
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

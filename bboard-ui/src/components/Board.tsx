import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import {
  Backdrop, CircularProgress, Card, CardActions, CardContent, CardHeader,
  IconButton, Skeleton, Typography, TextField, Box, Button,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { type BBoardDerivedState, type DeployedBBoardAPI } from '../../../api/src/index';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { State } from '../../../contract/src/index';
import { EmptyCardContent } from './Board.EmptyCardContent';

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedBBoardAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [boardState, setBoardState] = useState<BBoardDerivedState>();
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);
  const [loadNumber, setLoadNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [rate, setRate] = useState('');
  const [weight, setWeight] = useState('');

  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress),
    [boardApiProvider],
  );

  const onPostLoad = useCallback(async () => {
    if (!loadNumber || !origin || !destination || !rate) return;
    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        const notes = origin + ' -> ' + destination + (weight ? ' | ' + weight + ' lbs' : '');
        await deployedBoardAPI.postLoad(loadNumber, BigInt(Math.round(parseFloat(rate) * 100)), notes);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, loadNumber, origin, destination, rate, weight]);

  const onDeleteMessage = useCallback(async () => {
    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.takeDown();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBoardAPI) {
      await navigator.clipboard.writeText(deployedBoardAPI.deployedContractAddress);
    }
  }, [deployedBoardAPI]);

  useEffect(() => {
    if (!boardDeployment$) return;
    const subscription = boardDeployment$.subscribe(setBoardDeployment);
    return () => subscription.unsubscribe();
  }, [boardDeployment$]);

  useEffect(() => {
    if (!boardDeployment) return;
    if (boardDeployment.status === 'in-progress') return;
    setIsWorking(false);
    if (boardDeployment.status === 'failed') {
      setErrorMessage(boardDeployment.error.message.length ? boardDeployment.error.message : 'Unexpected error.');
      return;
    }
    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe(setBoardState);
    return () => subscription.unsubscribe();
  }, [boardDeployment]);

  return (
    <Card sx={{ position: 'relative', background: '#111128', border: '1px solid #2a2a4a', borderRadius: 2, mb: 2 }}>
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}
      {boardDeployment$ && (
        <React.Fragment>
          <Backdrop sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={isWorking}>
            <CircularProgress data-testid="board-working-indicator" />
          </Backdrop>
          <Backdrop sx={{ position: 'absolute', color: '#ff0000', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={!!errorMessage}>
            <StopIcon fontSize="large" />
            <Typography component="div" data-testid="board-error-message">{errorMessage}</Typography>
          </Backdrop>
          <CardHeader
            avatar={
              boardState ? (
                boardState.state === State.VACANT || (boardState.state === State.OCCUPIED && boardState.isOwner)
                  ? <LockOpenIcon sx={{ color: '#4caf50' }} data-testid="post-unlocked-icon" />
                  : <LockIcon sx={{ color: '#f44336' }} data-testid="post-locked-icon" />
              ) : <Skeleton variant="circular" width={20} height={20} />
            }
            title={
              <Typography variant="body2" sx={{ color: '#aaa', fontFamily: 'monospace' }}>
                {toShortFormatContractAddress(deployedBoardAPI?.deployedContractAddress) ?? 'Loading...'}
              </Typography>
            }
            action={
              deployedBoardAPI?.deployedContractAddress
                ? <IconButton title="Copy contract address" onClick={onCopyContractAddress}><CopyIcon fontSize="small" sx={{ color: '#666' }} /></IconButton>
                : <Skeleton variant="circular" width={20} height={20} />
            }
          />
          <CardContent>
            {boardState ? (
              boardState.loadNumber ? (
                <Box sx={{ p: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocalShippingIcon sx={{ color: '#7c6af7' }} />
                    <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>{boardState.loadNumber}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#aaa' }}>{boardState.notes}</Typography>
                  <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mt: 1 }}>
                    \${(Number(boardState.rate ?? 0n) / 100).toFixed(2)}/mi
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField label="Load #" size="small" fullWidth placeholder="LOAD-2026-001"
                    InputLabelProps={{ style: { color: '#888' } }}
                    inputProps={{ style: { color: '#fff' } }}
                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#2a2a4a' } } }}
                    onChange={(e) => setLoadNumber(e.target.value)} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField label="Origin" size="small" fullWidth placeholder="Chicago, IL"
                      InputLabelProps={{ style: { color: '#888' } }}
                      inputProps={{ style: { color: '#fff' } }}
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#2a2a4a' } } }}
                      onChange={(e) => setOrigin(e.target.value)} />
                    <TextField label="Destination" size="small" fullWidth placeholder="Dallas, TX"
                      InputLabelProps={{ style: { color: '#888' } }}
                      inputProps={{ style: { color: '#fff' } }}
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#2a2a4a' } } }}
                      onChange={(e) => setDestination(e.target.value)} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField label="Rate (\$/mi)" size="small" fullWidth placeholder="2.50" type="number"
                      InputLabelProps={{ style: { color: '#888' } }}
                      inputProps={{ style: { color: '#fff' } }}
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#2a2a4a' } } }}
                      onChange={(e) => setRate(e.target.value)} />
                    <TextField label="Weight (lbs)" size="small" fullWidth placeholder="42000"
                      InputLabelProps={{ style: { color: '#888' } }}
                      inputProps={{ style: { color: '#fff' } }}
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#2a2a4a' } } }}
                      onChange={(e) => setWeight(e.target.value)} />
                  </Box>
                </Box>
              )
            ) : (
              <Skeleton variant="rectangular" width="100%" height={160} />
            )}
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            {(deployedBoardAPI || boardState) ? (
              <React.Fragment>
                {boardState && !boardState.loadNumber && (
                  <Button variant="contained" size="small" startIcon={<LocalShippingIcon />}
                    disabled={!loadNumber || !origin || !destination || !rate}
                    onClick={onPostLoad}
                    sx={{ background: '#7c6af7', '&:hover': { background: '#6a5ae0' } }}>
                    Post Load
                  </Button>
                )}
                {boardState?.loadNumber && boardState.isOwner && (
                  <IconButton title="Take down load" data-testid="board-take-down-message-btn" onClick={onDeleteMessage}>
                    <DeleteIcon sx={{ color: '#f44336' }} />
                  </IconButton>
                )}
              </React.Fragment>
            ) : (
              <Skeleton variant="rectangular" width={80} height={20} />
            )}
          </CardActions>
        </React.Fragment>
      )}
    </Card>
  );
};

const toShortFormatContractAddress = (contractAddress) =>
  contractAddress ? (
    <span data-testid="board-address">
      0x{contractAddress?.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}
    </span>
  ) : undefined;

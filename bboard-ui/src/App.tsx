import './globals';
import React, { useEffect, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useDeployedBoardContext } from './hooks';
import { type BoardDeployment } from './contexts';
import { MainLayout } from './components/Layout';
import { Board } from './components/Board';
import { CarrierRegistry } from './components/CarrierRegistry';
import { LoadBoard } from './components/LoadBoard';
import { RevealOwnership } from './components/RevealOwnership';
import { Observable, of } from 'rxjs';

import { createStandaloneAPI, StandaloneDeployedBoardAPI } from './contexts/StandaloneDeployedBoardManager';
const App: React.FC = () => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployments, setBoardDeployments] = useState<Array<Observable<BoardDeployment>>>([]);
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<import('../../api/src/index').DeployedBBoardAPI | undefined>();
  const [tab, setTab] = useState(0);
  const isStandalone = import.meta.env.VITE_STANDALONE === 'true';

  useEffect(() => {
    if (!isStandalone) return;
    createStandaloneAPI()
      .then((api) => {
        const dep$ = of({ status: 'deployed', api } as unknown as BoardDeployment);
        setBoardDeployments([dep$]);
      })
      .catch((e: unknown) => console.error('[Standalone]', e));
  }, [isStandalone]);



  useEffect(() => {
    if (isStandalone) return;
    const subscription = boardApiProvider.boardDeployments$.subscribe(deps => {
      setBoardDeployments(deps);
    });
    return () => subscription.unsubscribe();
  }, [boardApiProvider, isStandalone]);

  useEffect(() => {
    if (boardDeployments.length === 0) return;
    const sub = boardDeployments[0].subscribe(dep => {
      if (dep.status === 'deployed') setDeployedBoardAPI(dep.api);
    });
    return () => sub.unsubscribe();
  }, [boardDeployments]);

  return (
    <Box sx={{ background: '#000', minHeight: '100vh' }}>
      <MainLayout>
        {/* Tab bar */}
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          sx={{
            mb: 3,
            borderBottom: '1px solid #2a2a4a',
            '& .MuiTab-root': { color: '#666', textTransform: 'none' },
            '& .Mui-selected': { color: '#7c6af7' },
            '& .MuiTabs-indicator': { backgroundColor: '#7c6af7' },
          }}
        >
          <Tab label="Post Load" />
          <Tab label="Open Loads" />
          <Tab label="My Loads" />
          <Tab label="Carrier Registry" />
        </Tabs>

        {/* Tab 0 — Post a load (existing Board component) */}
        {tab === 0 && (
          <>
            {boardDeployments.map((dep, idx) => (
              <div data-testid={`board-${idx}`} key={`board-${idx}`}>
                <Board boardDeployment$={dep} />
              </div>
            ))}
            <div data-testid="board-start">
              <Board />
            </div>
          </>
        )}

        {/* Tab 1 — Open loads with carrier-gated claim */}
        {tab === 1 && <LoadBoard boardDeployments={boardDeployments} />}

        {/* Tab 2 — Owner actions: reveal / take down */}
        {tab === 2 && (
          <>
            {boardDeployments.length === 0 && (
              <Box sx={{ color: '#555', fontSize: 14, mt: 2 }}>
                No boards joined yet. Use the Post Load tab to deploy or join one.
              </Box>
            )}
            {boardDeployments.map((dep, idx) => (
              <RevealOwnership key={idx} boardDeployment$={dep} />
            ))}
          </>
        )}

        {/* Tab 3 — Carrier registry */}
        {tab === 3 && <CarrierRegistry api={deployedBoardAPI} />}
      </MainLayout>
    </Box>
  );
};

export default App;

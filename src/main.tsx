import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppBoundary } from './components/PartBoundary';
import { installChunkReload } from './core/chunkReload';
import './styles.css';
import './studio.css';
import './living-atlas.css';
import './cartographic-theme.css';
import './components/atlas-location-bar.css';
import './components/atlas-home.css';
import './components/shell.css';
import './components/chrome.css';

// After a deploy, a chunk of the build this page started on can be gone: reload onto the new build.
installChunkReload();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBoundary>
      <App />
    </AppBoundary>
  </StrictMode>,
);

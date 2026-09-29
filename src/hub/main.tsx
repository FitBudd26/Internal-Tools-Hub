import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/index.css';
import { Hub } from './Hub';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Hub />
  </StrictMode>,
);

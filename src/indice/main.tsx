import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Indice from './Indice.tsx';
import './indice.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Indice />
  </StrictMode>,
);

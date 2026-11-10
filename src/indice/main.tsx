import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Indice from './Indice.tsx';
import './indice.css';
import {abrirTelon} from '../comun/telon';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Indice />
  </StrictMode>,
);

abrirTelon();

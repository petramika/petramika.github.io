import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Fuentes from './Fuentes';
import './fuentes.css';
import '../oscuro.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fuentes />
  </StrictMode>,
);

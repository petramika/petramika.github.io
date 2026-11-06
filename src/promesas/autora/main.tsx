import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import SobreLaAutora from './SobreLaAutora';
import './autora.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SobreLaAutora />
  </StrictMode>,
);

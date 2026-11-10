import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './promesas.css';
import './oscuro.css';
import {abrirTelon} from '../comun/telon';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

abrirTelon();

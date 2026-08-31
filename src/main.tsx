import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/variables.css';
import './styles/global.css';
import './styles/pixel-art.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error(' #root ausente no index.html');
createRoot(rootEl).render(<App />);

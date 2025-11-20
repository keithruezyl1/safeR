import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { DeviceProvider } from './context/DeviceContext.tsx'
import { WalletProvider } from './context/WalletContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DeviceProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </DeviceProvider>
    </BrowserRouter>
  </StrictMode>,
)

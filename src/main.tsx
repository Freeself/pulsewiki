import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
// @ts-ignore
import '@fontsource-variable/geist'
// @ts-ignore
import '@fontsource-variable/geist-mono'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </BrowserRouter>,
)

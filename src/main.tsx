import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = (createRoot as any)(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Use contextBridge
(window as any).ipcRenderer.on('main-process-message', (_event: any, message: any) => {
  console.log(message)
})

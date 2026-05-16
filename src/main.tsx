import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Use contextBridge
(window as any).ipcRenderer.on('main-process-message', (_event: any, message: any) => {
  console.log(message)
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import TopSearchDock from './TopSearchDock'
import './styles.css'
import './chatFilters.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/pai-opp">
      <App />
      <TopSearchDock />
    </BrowserRouter>
  </React.StrictMode>
)

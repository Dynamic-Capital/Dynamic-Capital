import React from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: '#0066cc', marginBottom: '20px' }}>
        Dynamic Capital VIP Bot
      </h1>
      <p style={{ color: '#666' }}>
        Management system is loading...
      </p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
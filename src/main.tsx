import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('main.tsx executing');

function App() {
  console.log('App component rendering');
  return React.createElement('div', { style: { padding: '20px' } }, 
    React.createElement('h1', { style: { color: '#0066cc' } }, 'Dynamic Capital VIP Bot'),
    React.createElement('p', null, 'Welcome to the management system.')
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  React.createElement(React.StrictMode, null, React.createElement(App))
);
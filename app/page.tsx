export default function HomePage() {
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      <h1 style={{ 
        color: '#2563eb', 
        fontSize: '2.5rem',
        marginBottom: '1rem',
        fontWeight: 'bold'
      }}>
        Dynamic Capital VIP Bot
      </h1>
      <p style={{ 
        color: '#6b7280',
        fontSize: '1.1rem',
        marginBottom: '2rem'
      }}>
        Telegram VIP Bot Management System
      </p>
      <div style={{
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '1rem',
          color: '#374151'
        }}>
          Welcome to Dynamic Capital
        </h2>
        <p style={{
          color: '#6b7280',
          lineHeight: '1.6'
        }}>
          Your premium Telegram bot for VIP services and crypto management.
        </p>
      </div>
    </div>
  )
}
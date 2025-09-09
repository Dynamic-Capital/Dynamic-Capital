import MiniAppPreview from '@/components/telegram/MiniAppPreview'

function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dynamic Capital VIP Bot
          </h1>
          <p className="text-muted-foreground">
            Lovable Preview Shell - Your Next.js app runs separately
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold mb-4">Mini App Preview</h2>
            <MiniAppPreview />
          </div>
          
          <div className="space-y-6">
            <div className="p-6 border border-border rounded-lg">
              <h3 className="font-semibold mb-3">Architecture Info</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• This is a Vite preview shell for Lovable</p>
                <p>• Your Next.js app remains untouched</p>
                <p>• Shared components work in both environments</p>
                <p>• Deploy your Next.js app normally</p>
              </div>
            </div>
            
            <div className="p-6 border border-border rounded-lg">
              <h3 className="font-semibold mb-3">Quick Start</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. Use this preview for UI development</p>
                <p>2. Test components visually</p>
                <p>3. Switch to Next.js for full features</p>
                <p>4. Both share the same component library</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
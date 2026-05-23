import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './index.css'
import App from './App.tsx'

const convexUrl = import.meta.env.VITE_CONVEX_URL

function MissingConfig() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="max-w-xl rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Configuration</p>
        <h1 className="mt-2 text-2xl font-semibold">Convex URL missing</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Add <code className="rounded bg-muted px-1.5 py-1">VITE_CONVEX_URL</code> to <code className="rounded bg-muted px-1.5 py-1">.env.local</code>, then restart the dev server.
        </p>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {convexUrl ? (
      <ConvexAuthProvider client={new ConvexReactClient(convexUrl)}>
        <App />
      </ConvexAuthProvider>
    ) : (
      <MissingConfig />
    )}
  </StrictMode>,
)

// app/layout.tsx
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-12">
          {children}
        </main>
      </body>
    </html>
  )
}

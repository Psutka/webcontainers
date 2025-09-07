import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Container Management Client',
  description: 'Web interface for managing application containers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
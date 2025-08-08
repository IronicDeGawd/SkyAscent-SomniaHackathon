'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Import DebugGame with no SSR to prevent server-side rendering issues
const DebugGame = dynamic(() => import('../../components/DebugGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="text-white text-xl">Loading Debug Mode...</div>
    </div>
  )
})

export default function DebugPage() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/" className="inline-block">
          <button className="pixel-button text-sm px-4 py-2 text-white bg-gray-600 border-gray-400">
            ← Back to Home
          </button>
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-50">
        <div className="text-right text-sm">
          <p className="font-bold text-yellow-300">DEBUG MODE</p>
          <p className="text-gray-300">Hitbox Visualization</p>
        </div>
      </div>

      {/* Debug Game */}
      <div className="w-full h-screen flex items-center justify-center">
        {isLoaded ? <DebugGame /> : (
          <div className="text-white text-xl">Loading Debug Mode...</div>
        )}
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-50">
        <div className="bg-black bg-opacity-70 rounded-lg p-4 text-sm">
          <h3 className="font-bold text-yellow-300 mb-2">Debug Instructions:</h3>
          <ul className="space-y-1 text-gray-300">
            <li>• Red boxes show actual collision boundaries</li>
            <li>• All sprites are displayed at their game scales</li>
            <li>• Hitboxes are reduced for fair gameplay collision detection</li>
            <li>• Use this to verify asset sizes and collision boundaries</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
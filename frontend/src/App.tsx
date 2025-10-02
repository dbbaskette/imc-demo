import { useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSharedSSE } from './lib/sse'
import Dashboard from './components/Dashboard'
import RAGPipeline from './components/RAGPipeline'
import TelemetryProcessing from './components/TelemetryProcessing'
import Deployment from './components/Deployment'
import DiagramView from './components/DiagramView'

const queryClient = new QueryClient()

function Header({ connected }: { connected: boolean }) {
  return (
    <header className="bg-gray-800/50 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <h1 className="text-xl font-semibold text-white">IMC Demo</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <path d="M12 17h.01"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">A</div>
          <span>platform_admin</span>
        </div>
      </div>
    </header>
  )
}

function Sidebar() {
  const location = useLocation()

  const navItems = [
    {
      to: '/',
      label: 'Systems Overview',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1"/>
        <rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/>
        <rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    },
    {
      to: '/rag-pipeline',
      label: 'RAG Pipeline',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    },
    {
      to: '/telemetry',
      label: 'Telemetry Processing',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* WiFi symbol above car */}
        <path d="M12 2c-2.5 0-4.5 1.5-5.5 3.5"/>
        <path d="M12 2c2.5 0 4.5 1.5 5.5 3.5"/>
        <path d="M12 4c-1.5 0-2.5 1-3 2"/>
        <path d="M12 4c1.5 0 2.5 1 3 2"/>
        <path d="M12 6c-0.5 0-1 0.5-1 1"/>
        <path d="M12 6c0.5 0 1 0.5 1 1"/>

        {/* Car body - side profile */}
        <path d="M3 17h18"/>
        <path d="M17 17V7c0-.6-.4-1-1-1H8c-.6 0-1 .4-1 1v10"/>

        {/* Car top/cabin */}
        <path d="M8 7h8v4H8z"/>

        {/* Windows */}
        <rect x="9" y="8" width="6" height="2" rx="0.5" fill="currentColor" opacity="0.2"/>

        {/* Wheels */}
        <circle cx="7" cy="17" r="2" fill="currentColor" opacity="0.3"/>
        <circle cx="17" cy="17" r="2" fill="currentColor" opacity="0.3"/>

        {/* Headlights and taillights */}
        <circle cx="8" cy="8" r="0.5" fill="currentColor"/>
        <circle cx="16" cy="8" r="0.5" fill="currentColor"/>
      </svg>
    },
    {
      to: '/diagram',
      label: 'Architecture Diagram',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <circle cx="12" cy="19" r="3"/>
        <path d="M12 16l4-4"/>
        <path d="M12 16l-4-4"/>
      </svg>
    },
    {
      to: '/deployment',
      label: 'Deployment',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    }
  ]

  const settingsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )

  return (
    <aside className="w-20 bg-gray-800/50 border-r border-gray-700 p-4 flex flex-col items-center justify-between">
      <div className="space-y-4">
        {navItems.map(({ to, label, icon }) => {
          const isActive = location.pathname === to || (to === '/' && location.pathname === '/')
          return (
            <Link
              key={to}
              to={to}
              className={`block p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              title={label}
            >
              {icon}
            </Link>
          )
        })}
      </div>
      <div className="space-y-4">
        <Link
          to="/settings"
          className={`block p-3 rounded-lg transition-colors ${
            location.pathname === '/settings'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
          title="Settings"
        >
          {settingsIcon}
        </Link>
      </div>
    </aside>
  )
}

function SettingsPage() {
  const [particleMaxCount, setParticleMaxCount] = useState(() => {
    const saved = localStorage.getItem('imc-particle-max-count');
    return saved ? parseInt(saved, 10) : 4;
  });

  const handleParticleCountChange = (newCount: number) => {
    setParticleMaxCount(newCount);
    localStorage.setItem('imc-particle-max-count', newCount.toString());

    // Dispatch custom event to notify the telemetry component
    const event = new CustomEvent('particle-settings-changed', {
      detail: { maxParticles: newCount }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
      <div className="space-y-6">
        {/* Particle Animation Settings */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Particle Animation Settings</h3>
          <p className="text-sm text-gray-400 mb-6">Configure the visual effects for the telemetry data flow</p>

          <div className="space-y-4">
            <div>
              <label htmlFor="particle-count" className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Particles per Connection
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="particle-count"
                  type="range"
                  min="1"
                  max="10"
                  value={particleMaxCount}
                  onChange={(e) => handleParticleCountChange(parseInt(e.target.value, 10))}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="min-w-[60px] bg-gray-700 border border-gray-600 rounded px-3 py-1 text-center">
                  <span className="text-white font-medium">{particleMaxCount}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Controls how many animated particles flow between each connection. Lower values improve performance.
              </p>
            </div>

            <div className="border-t border-gray-600 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-300">Current Setting</h4>
                  <p className="text-xs text-gray-500">Maximum {particleMaxCount} particles per connection segment</p>
                </div>
                <button
                  onClick={() => handleParticleCountChange(4)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium text-white transition-colors"
                >
                  Reset to Default (4)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Information */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Tips</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>Optimal Performance:</strong> 1-4 particles per connection provides smooth animation without performance impact.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>Moderate Load:</strong> 5-7 particles may cause slight performance reduction on slower devices.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>High Load:</strong> 8+ particles may cause noticeable slowdowns and should be used with caution.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const { debug: recent, connected, error } = useSharedSSE('/stream', {
    withCredentials: true,
    onEvent: (e) => {
      console.log('SSE Event received:', e)
      if (e.url) {
        console.log(`SSE Event with URL - app: ${e.app}, url: ${e.url}`)
      }
    }
  })

  console.log('SSE Status - Connected:', connected, 'Error:', error, 'Recent count:', recent.length)

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header connected={connected} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard recent={recent} />} />
              <Route path="/rag-pipeline" element={<RAGPipeline />} />
              <Route path="/telemetry" element={<TelemetryProcessing />} />
              <Route path="/diagram" element={<DiagramView />} />
              <Route path="/deployment" element={<Deployment />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
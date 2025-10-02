import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { EventDto } from '../lib/sse'

function Dashboard({ recent }: { recent: EventDto[] }) {
  // Real service data from service registry
  const [services, setServices] = useState<Array<{
    name: string;
    displayName: string;
    description: string;
    status: string;
  }>>([]);

  const [overview, setOverview] = useState<{
    totalServices: number;
    activeServices: number;
    overallStatus: string;
  } | null>(null);

  // Fetch services from the backend
  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Get RAG pipeline overview
        const overviewResponse = await fetch('/api/services/rag-pipeline/overview', {
          credentials: 'include'
        });
        if (overviewResponse.ok) {
          const overviewData = await overviewResponse.json();
          setOverview(overviewData);
          setServices(overviewData.services || []);
        }
      } catch (error) {
        console.error('Failed to fetch services:', error);
      }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const totalEvents = recent.length
  const errorEvents = recent.filter(e => e.status?.toLowerCase() === 'error').length
  const activeComponents = overview ? overview.activeServices : 0
  const totalComponents = overview ? overview.totalServices : 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">IMC Systems Overview</h2>
          <p className="text-gray-300 mt-1">Monitor your Insurance MegaCorp platform components and services</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium">System Settings</button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-medium text-white">Health Check</button>
        </div>
      </div>

      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Active Components */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Components</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{activeComponents}</p>
            </div>
            <div className="text-2xl">🟢</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">out of {totalComponents} total</p>
        </div>

        {/* Total Events */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Events</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{totalEvents}</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">in this session</p>
        </div>

        {/* Error Count */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Errors</p>
              <p className={`text-3xl font-bold mt-2 ${errorEvents > 0 ? 'text-red-400' : 'text-green-400'}`}>{errorEvents}</p>
            </div>
            <div className="text-2xl">{errorEvents > 0 ? '⚠️' : '✅'}</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">error events</p>
        </div>

        {/* Pipeline Health */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Pipeline Health</p>
              <p className={`text-lg font-bold mt-2 ${
                overview && overview.overallStatus === 'HEALTHY' ? 'text-green-400' :
                overview && overview.overallStatus === 'DEGRADED' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {overview ? overview.overallStatus : 'UNKNOWN'}
              </p>
            </div>
            <div className="text-2xl">
              {overview && overview.overallStatus === 'HEALTHY' ? '🟢' :
               overview && overview.overallStatus === 'DEGRADED' ? '🟡' : '🔴'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">overall status</p>
        </div>
      </div>

      {/* Quick Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* RAG Pipeline Status */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            <h3 className="text-lg font-semibold text-white">RAG Pipeline</h3>
          </div>
          <div className="space-y-3">
            {services.map((service) => {
              const isActive = service.status === 'STARTED'
              return (
                <div key={service.name} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{service.displayName}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <Link to="/rag-pipeline" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              View Details →
            </Link>
          </div>
        </div>

        {/* Telemetry Processing Status */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1h-2"/>
              <path d="M5 17H3c-.6 0-1-.4-1-1v-3c0-.6.4-1 1-1h2"/>
              <path d="M17 17V5c0-.6-.4-1-1-1H8c-.6 0-1 .4-1 1v12"/>
              <path d="M7 14h10"/>
              <path d="M10 14v4"/>
              <path d="M14 14v4"/>
              <path d="M7 10h10"/>
              <path d="M7 7h10"/>
            </svg>
            <h3 className="text-lg font-semibold text-white">Telemetry Processing</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Vehicle Events</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Data Processing</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">HDFS Sink</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                ACTIVE
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <Link to="/telemetry" className="text-green-400 hover:text-green-300 text-sm font-medium">
              View Details →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <p className="text-sm text-gray-400 mt-1">Latest system events and updates</p>
        </div>
        <div className="p-4">
          {recent.length > 0 ? (
            <div className="space-y-3">
              {recent.slice(0, 5).map((event, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    event.status?.toLowerCase() === 'error' ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{event.message || 'System event'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {event.app || 'System'} • {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'Recent'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard;
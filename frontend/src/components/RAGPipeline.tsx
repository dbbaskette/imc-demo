import { useEffect, useState } from 'react'

function RAGPipeline() {
  // Real service data from service registry
  const [services, setServices] = useState<Array<{
    name: string;
    displayName: string;
    description: string;
    status: string;
    lastCheck: string;
    url?: string;
  }>>([]);

  // HDFS files data
  const [hdfsFiles, setHdfsFiles] = useState<Array<{
    name: string;
    size: string;
    state: string;
  }>>([]);

  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [restartingPipeline, setRestartingPipeline] = useState(false);

  // Persistent total files count to prevent jumping to 0
  const [totalFilesCount, setTotalFilesCount] = useState(() => {
    // Initialize from localStorage to persist across re-renders
    const saved = localStorage.getItem('imc-totalFilesCount');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Pipeline progress data
  const [pipelineProgress, setPipelineProgress] = useState<{
    hdfsFiles: number;
    textProcFiles: number;
    embedProcFiles: number;
    completeFiles: number;
  }>({ hdfsFiles: 0, textProcFiles: 0, embedProcFiles: 0, completeFiles: 0 });
  const [overview, setOverview] = useState<{
    totalServices: number;
    activeServices: number;
    overallStatus: string;
  } | null>(null);

  // Helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return 'N/A';

    const kb = 1024;
    const mb = kb * 1024;

    if (bytes >= mb) {
      return `${(bytes / mb).toFixed(1)} MB`;
    } else if (bytes >= kb) {
      return `${(bytes / kb).toFixed(1)} KB`;
    } else {
      return `${bytes} B`;
    }
  };

  // Fetch HDFS files from hdfsWatcher via IMC Manager proxy
  const fetchHdfsFiles = async () => {
    try {
      console.log('Fetching files from hdfsWatcher via IMC Demo proxy: /api/services/hdfswatcher/files');

      // Use IMC Demo proxy to avoid CORS issues
      const response = await fetch(`/api/services/hdfswatcher/files`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('HDFS API Response:', data);

        if (data.error) {
          console.warn('API returned error:', data.error);
          // Don't clear hdfsFiles on API errors - preserve existing data
        } else {
          const files = (data.files || []).map((file: any) => ({
            name: file.name || file.filename || file.path || 'unknown',
            size: formatFileSize(file.size),
            state: file.state || 'pending'
          }));

          console.log(`Found ${files.length} files:`, files);
          setHdfsFiles(files);
          // Use totalFiles from hdfsWatcher API - this is the stable count of processed files
          if (data.totalFiles && data.totalFiles > 0) {
            const newCount = data.totalFiles;
            setTotalFilesCount(newCount);
            localStorage.setItem('imc-totalFilesCount', newCount.toString());
            console.log(`Updated totalFilesCount to ${newCount} from hdfsWatcher totalFiles`);
          }
        }
      } else {
        console.warn('Failed to fetch HDFS files:', response.status, response.statusText);
        // Don't clear hdfsFiles on temporary failures - keep existing data
      }
    } catch (error) {
      console.error('Failed to fetch HDFS files:', error);
      // Don't clear hdfsFiles on temporary failures - keep existing data
    } finally {
      setFilesLoading(false);
    }
  };

  // Fetch services from the backend
  const fetchServices = async () => {
    try {
      if (loading) setLoading(true);

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
    } finally {
      if (loading) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchServices();
    fetchHdfsFiles();
  }, []);

  // Fetch pipeline progress after files are loaded
  useEffect(() => {
    if (!filesLoading) {
      fetchPipelineProgress();
    }
  }, [hdfsFiles, filesLoading]);

  // Periodic refresh - separate intervals to avoid flashing
  useEffect(() => {
    const servicesInterval = setInterval(fetchServices, 10000);
    return () => clearInterval(servicesInterval);
  }, [loading]);

  useEffect(() => {
    const filesInterval = setInterval(fetchHdfsFiles, 15000); // Refresh files every 15 seconds
    return () => clearInterval(filesInterval);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(fetchPipelineProgress, 20000); // Refresh progress every 20 seconds
    return () => clearInterval(progressInterval);
  }, []);

  // Reprocess files function
  const reprocessFiles = async () => {
    try {
      setReprocessing(true);
      console.log('Reprocessing files via IMC Demo proxy: /api/services/hdfswatcher/reprocess');

      const response = await fetch(`/api/services/hdfswatcher/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Reprocess response:', data);

        if (data.error) {
          alert(`Error: ${data.error}`);
        } else {
          const clearedCount = data.clearedCount || 0;
          alert(`Reprocessing completed! ${clearedCount} files cleared and will be reprocessed.`);
          // Refresh the files list after a short delay
          setTimeout(() => {
            fetchHdfsFiles();
          }, 2000);
        }
      } else {
        const errorText = await response.text();
        console.error('Reprocess failed:', response.status, errorText);
        alert(`Failed to reprocess files: ${response.status}`);
      }
    } catch (error) {
      console.error('Error reprocessing files:', error);
      alert('Error reprocessing files. Check console for details.');
    } finally {
      setReprocessing(false);
    }
  };

  // Fetch pipeline progress from all services
  const fetchPipelineProgress = async () => {
    try {
      const [textProcResponse, embedProcResponse] = await Promise.all([
        fetch('/api/services/textproc/files/processed', { credentials: 'include' }).catch(() => null),
        fetch('/api/services/embedproc/files/processed', { credentials: 'include' }).catch(() => null)
      ]);

      let textProcFiles = 0;
      let embedProcFiles = 0;

      // Get textProc processed files
      if (textProcResponse && textProcResponse.ok) {
        const textData = await textProcResponse.json();
        textProcFiles = (textData.files && textData.files.length > 0) ? textData.files.length : (textData.processedCount || 0);
      }

      // Get embedProc processed files
      if (embedProcResponse && embedProcResponse.ok) {
        const embedData = await embedProcResponse.json();
        embedProcFiles = (embedData.files && embedData.files.length > 0) ? embedData.files.length : (embedData.processedCount || 0);
        console.log('EmbedProc API response:', embedData, 'Extracted count:', embedProcFiles);
      }

      // Use persistent total files count to prevent jumping to 0
      // FIXED: Always use totalFilesCount if it's been set, never allow hdfsFiles to drop to 0
      const currentHdfsCount = totalFilesCount > 0 ? totalFilesCount : 0;

      console.log('DEBUG: hdfsFiles.length =', hdfsFiles.length, 'totalFilesCount =', totalFilesCount, 'currentHdfsCount =', currentHdfsCount);

      const newProgress = {
        hdfsFiles: currentHdfsCount,
        textProcFiles,
        embedProcFiles,
        completeFiles: embedProcFiles // Complete = embedProc finished
      };

      console.log('Setting pipeline progress:', newProgress);
      setPipelineProgress(newProgress);

    } catch (error) {
      console.error('Error fetching pipeline progress:', error);
    }
  };

  // Restart entire pipeline
  const restartPipeline = async () => {
    try {
      setRestartingPipeline(true);
      console.log('Restarting entire pipeline...');

      const response = await fetch('/api/services/restart-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Pipeline restart response:', data);

        if (data.error) {
          alert(`Error: ${data.error}`);
        } else {
          const results = data.results || [];
          const errors = data.errors || [];
          let message = `Pipeline restart completed!\n\n${results.join('\n')}`;
          if (errors.length > 0) {
            message += `\n\nWarnings:\n${errors.join('\n')}`;
          }
          alert(message);

          // Reset persistent count and refresh everything after restart
          setTotalFilesCount(0);
          localStorage.setItem('imc-totalFilesCount', '0');
          setTimeout(() => {
            fetchHdfsFiles();
            fetchServices();
            fetchPipelineProgress();
          }, 3000);
        }
      } else {
        const errorText = await response.text();
        console.error('Pipeline restart failed:', response.status, errorText);
        alert(`Failed to restart pipeline: ${response.status}`);
      }
    } catch (error) {
      console.error('Error restarting pipeline:', error);
      alert('Error restarting pipeline. Check console for details.');
    } finally {
      setRestartingPipeline(false);
    }
  };

  // Reset textProc processing
  const resetTextProc = async () => {
    try {
      console.log('Resetting textProc processing...');

      const response = await fetch('/api/services/textproc/processing/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('TextProc reset response:', data);

        if (data.error) {
          alert(`Error: ${data.error}`);
        } else {
          alert('TextProc processing reset successfully!');
          // Refresh data after reset
          setTimeout(() => {
            fetchPipelineProgress();
          }, 1000);
        }
      } else {
        const errorText = await response.text();
        console.error('TextProc reset failed:', response.status, errorText);
        alert(`Failed to reset textProc: ${response.status}`);
      }
    } catch (error) {
      console.error('Error resetting textProc:', error);
      alert('Error resetting textProc. Check console for details.');
    }
  };

  // Service control functions
  const startService = async (serviceName: string) => {
    try {
      const response = await fetch(`/api/services/${serviceName}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh services after action
        setTimeout(() => {
          const event = new Event('refresh-services');
          window.dispatchEvent(event);
        }, 1000);
      }
    } catch (error) {
      console.error(`Failed to start ${serviceName}:`, error);
    }
  };

  const stopService = async (serviceName: string) => {
    try {
      const response = await fetch(`/api/services/${serviceName}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh services after action
        setTimeout(() => {
          const event = new Event('refresh-services');
          window.dispatchEvent(event);
        }, 1000);
      }
    } catch (error) {
      console.error(`Failed to stop ${serviceName}:`, error);
    }
  };

  const toggleService = async (serviceName: string) => {
    try {
      const response = await fetch(`/api/services/${serviceName}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh services after action
        setTimeout(() => {
          const event = new Event('refresh-services');
          window.dispatchEvent(event);
        }, 1000);
      }
    } catch (error) {
      console.error(`Failed to toggle ${serviceName}:`, error);
    }
  };

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      const fetchServices = async () => {
        try {
          const overviewResponse = await fetch('/api/services/rag-pipeline/overview', {
            credentials: 'include'
          });
          if (overviewResponse.ok) {
            const overviewData = await overviewResponse.json();
            setOverview(overviewData);
            setServices(overviewData.services || []);
          }
        } catch (error) {
          console.error('Failed to refresh services:', error);
        }
      };
      fetchServices();
    };

    window.addEventListener('refresh-services', handleRefresh);
    return () => window.removeEventListener('refresh-services', handleRefresh);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading RAG Pipeline services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">RAG Pipeline</h2>
        <p className="text-gray-300 mt-1">Retrieval-Augmented Generation processing pipeline status</p>
      </div>

      {/* Pipeline Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Services</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">{overview.totalServices}</p>
              </div>
              <div className="text-2xl">🔗</div>
            </div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Active Services</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{overview.activeServices}</p>
              </div>
              <div className="text-2xl">🟢</div>
            </div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Overall Status</p>
                <p className={`text-lg font-bold mt-2 ${
                  overview.overallStatus === 'HEALTHY' ? 'text-green-400' :
                  overview.overallStatus === 'DEGRADED' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {overview.overallStatus}
                </p>
              </div>
              <div className="text-2xl">
                {overview.overallStatus === 'HEALTHY' ? '🟢' :
                 overview.overallStatus === 'DEGRADED' ? '🟡' : '🔴'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Flow Visualization */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg mb-8">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Pipeline Architecture</h3>
          <p className="text-sm text-gray-400 mt-1">Real-time status of pipeline components</p>
        </div>

        <div className="p-8">
          {/* Architecture Diagram */}
          <div className="space-y-8">
            {/* Top Layer - Data Lake */}
            <div className="flex justify-center">
              <div className="bg-gray-700/30 border-2 border-gray-600 rounded-lg px-12 py-6 text-center">
                <h3 className="text-xl font-semibold text-white">Tanzu Data Lake</h3>
                <p className="text-sm text-gray-400 mt-1">Document Storage & Management</p>
              </div>
            </div>

            {/* Connecting lines from Data Lake */}
            <div className="flex justify-center">
              <div className="flex items-center space-x-16">
                <div className="w-px h-12 bg-gray-600"></div>
                <div className="w-px h-12 bg-gray-600"></div>
                <div className="w-px h-12 bg-gray-600"></div>
              </div>
            </div>

            {/* Middle Layer - Processing Components */}
            <div className="flex justify-center items-start space-x-8">
              {services.map((service) => {
                const isActive = service.status === 'STARTED';
                const isStopped = service.status === 'STOPPED';
                const isError = service.status === 'ERROR' || service.status === 'UNKNOWN';

                return (
                  <div key={service.name} className="flex flex-col items-center">
                    <div className={`relative px-8 py-6 rounded-lg border-2 min-w-[160px] text-center transition-all duration-300 ${
                      isActive ? 'bg-green-900/20 border-green-500' :
                      isStopped ? 'bg-red-900/20 border-red-500' :
                      isError ? 'bg-red-900/20 border-red-500 opacity-60' :
                      'bg-gray-700/20 border-gray-500'
                    }`}>
                      {/* Status indicator */}
                      <div className={`absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-green-500' :
                        isStopped ? 'bg-red-500' :
                        isError ? 'bg-red-500 animate-pulse' :
                        'bg-gray-500'
                      }`}>
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>

                      {/* Component info */}
                      <h4 className="font-semibold text-white text-lg">{service.displayName}</h4>
                      <p className="text-xs text-gray-400 mt-2">{service.description}</p>

                      {/* Status */}
                      <div className="mt-3">
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                          isActive ? 'bg-green-500/20 text-green-300' :
                          isStopped ? 'bg-red-500/20 text-red-300' :
                          isError ? 'bg-red-500/20 text-red-300 animate-pulse' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                    </div>

                    {/* Connecting line down */}
                    <div className="w-px h-12 bg-gray-600 mt-4"></div>
                  </div>
                )
              })}

              {/* Vector Store - separate from main flow */}
              <div className="flex flex-col items-center ml-8">
                <div className="bg-gray-700/30 border-2 border-gray-600 rounded-lg px-8 py-6 text-center min-w-[160px]">
                  <h4 className="font-semibold text-white text-lg">Vector Store</h4>
                  <p className="text-xs text-gray-400 mt-2">Embedding Storage</p>
                  <div className="mt-3">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                      ACTIVE
                    </span>
                  </div>
                </div>
                <div className="w-px h-12 bg-gray-600 mt-4"></div>
              </div>
            </div>

            {/* Horizontal connecting line */}
            <div className="flex justify-center">
              <div className="w-3/4 h-px bg-gray-600"></div>
            </div>

            {/* Bottom Layer - RabbitMQ */}
            <div className="flex justify-center">
              <div className="bg-gray-700/30 border-2 border-gray-600 rounded-lg px-16 py-6 text-center">
                <h3 className="text-xl font-semibold text-white">RabbitMQ</h3>
                <p className="text-sm text-gray-400 mt-1">Message Queue & Event Streaming</p>
                <div className="mt-3">
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-500/20 text-green-300">
                    CONNECTED
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Legend */}
          <div className="mt-12 flex flex-wrap gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">Stopped</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Error</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-gray-300">Unknown/Stale</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((service) => {
          const isActive = service.status === 'STARTED';

          return (
            <div key={service.name} className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">{service.displayName}</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4">{service.description}</p>

              {/* Service Control Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => startService(service.name)}
                  disabled={isActive}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                >
                  Start
                </button>
                <button
                  onClick={() => stopService(service.name)}
                  disabled={!isActive}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    !isActive
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  Stop
                </button>
                <button
                  onClick={() => toggleService(service.name)}
                  className="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Toggle
                </button>
                {/* Add Reset Processing button for textproc */}
                {service.name === 'textproc' && (
                  <button
                    onClick={resetTextProc}
                    className="px-3 py-1 rounded text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white"
                  >
                    Reset Processing
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span className={isActive ? 'text-green-400' : 'text-red-400'}>{service.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last Check:</span>
                  <span className="text-gray-300">{service.lastCheck}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pipeline Progress Flow Visualization - Option A Style */}
      <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Pipeline Progress</h3>
            <p className="text-sm text-gray-400 mt-1">Real-time document processing flow</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Start all services
                services.filter(s => s.status !== 'STARTED').forEach(service => {
                  startService(service.name);
                });
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              Start All
            </button>
            <button
              onClick={() => {
                // Stop all services
                services.filter(s => s.status === 'STARTED').forEach(service => {
                  stopService(service.name);
                });
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Stop All
            </button>
            <button
              onClick={restartPipeline}
              disabled={restartingPipeline}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                restartingPipeline
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {restartingPipeline ? 'Restarting Pipeline...' : 'Restart Pipeline'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Horizontal Pipeline Flow */}
          <div className="flex items-center justify-between">
            {/* HDFS Watcher Stage */}
            <div className="flex flex-col items-center">
              <div className="bg-blue-900/20 border-2 border-blue-500 rounded-lg p-4 min-w-[120px] text-center">
                <h4 className="font-semibold text-white text-sm">HDFS Watcher</h4>
                <p className="text-xs text-gray-400 mt-1">File Discovery</p>
                <div className="mt-3">
                  <span className="text-lg font-bold text-blue-300">
                    {pipelineProgress.hdfsFiles}
                  </span>
                  <p className="text-xs text-gray-400">files found</p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center">
              <div className="w-8 h-px bg-gray-500"></div>
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Text Processor Stage */}
            <div className="flex flex-col items-center">
              <div className="bg-purple-900/20 border-2 border-purple-500 rounded-lg p-4 min-w-[120px] text-center">
                <h4 className="font-semibold text-white text-sm">Text Processor</h4>
                <p className="text-xs text-gray-400 mt-1">Text Extraction</p>
                <div className="mt-3">
                  <span className="text-lg font-bold text-purple-300">
                    {pipelineProgress.textProcFiles}
                  </span>
                  <p className="text-xs text-gray-400">files processed</p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center">
              <div className="w-8 h-px bg-gray-500"></div>
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Embedding Processor Stage */}
            <div className="flex flex-col items-center">
              <div className="bg-green-900/20 border-2 border-green-500 rounded-lg p-4 min-w-[120px] text-center">
                <h4 className="font-semibold text-white text-sm">Embed Processor</h4>
                <p className="text-xs text-gray-400 mt-1">Vector Generation</p>
                <div className="mt-3">
                  <span className="text-lg font-bold text-green-300">
                    {pipelineProgress.embedProcFiles}
                  </span>
                  <p className="text-xs text-gray-400">files embedded</p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center">
              <div className="w-8 h-px bg-gray-500"></div>
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Complete Stage */}
            <div className="flex flex-col items-center">
              <div className="bg-teal-900/20 border-2 border-teal-500 rounded-lg p-4 min-w-[120px] text-center">
                <h4 className="font-semibold text-white text-sm">Complete</h4>
                <p className="text-xs text-gray-400 mt-1">Ready for Query</p>
                <div className="mt-3">
                  <span className="text-lg font-bold text-teal-300">
                    {pipelineProgress.completeFiles}
                  </span>
                  <p className="text-xs text-gray-400">files ready</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Processing Progress</span>
              <span>{(() => {
                // Calculate incremental progress across 3 stages: HDFS (33%), TextProc (33%), EmbedProc (33%)
                if (pipelineProgress.hdfsFiles === 0) return 0;

                const totalFiles = pipelineProgress.hdfsFiles;
                const textProgress = (pipelineProgress.textProcFiles / totalFiles) * 33.33; // 0-33%
                const embedProgress = (pipelineProgress.embedProcFiles / totalFiles) * 33.33; // 0-33%
                const hdfsProgress = 33.33; // HDFS stage is complete when we have files

                const totalProgress = hdfsProgress + textProgress + embedProgress;
                return Math.round(totalProgress);
              })()}% Complete</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 via-purple-500 via-green-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(() => {
                    // Calculate incremental progress across 3 stages
                    if (pipelineProgress.hdfsFiles === 0) return 0;

                    const totalFiles = pipelineProgress.hdfsFiles;
                    const textProgress = (pipelineProgress.textProcFiles / totalFiles) * 33.33;
                    const embedProgress = (pipelineProgress.embedProcFiles / totalFiles) * 33.33;
                    const hdfsProgress = 33.33;

                    return hdfsProgress + textProgress + embedProgress;
                  })()}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* File Management Section */}
      <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Pipeline Files</h3>
            <p className="text-sm text-gray-400 mt-1">Document processing status and file management</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reprocessFiles}
              disabled={reprocessing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reprocessing
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {reprocessing ? 'Reprocessing...' : 'Reprocess Files'}
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-gray-700/30 rounded-lg border border-gray-600">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-700/50">
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 font-medium text-gray-300">Name</th>
                    <th className="text-left p-3 font-medium text-gray-300">Size</th>
                    <th className="text-left p-3 font-medium text-gray-300">Status</th>
                    <th className="text-left p-3 font-medium text-gray-300">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {filesLoading ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-400">
                        Loading files from HDFS Watcher...
                      </td>
                    </tr>
                  ) : hdfsFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-400">
                        No files found in HDFS or connection failed
                      </td>
                    </tr>
                  ) : (
                    hdfsFiles.map((file, i) => {
                      // Map API states to display states
                      const displayStatus =
                        file.state === 'processed' ? 'Processed' :
                        file.state === 'processing' || file.state === 'running' ? 'Processing' :
                        'Pending';

                      // Determine overall pipeline stage for this file
                      const getOverallStage = () => {
                        if (displayStatus === 'Processed') {
                          // Check if file has been through all stages - start from the furthest stage
                          if (pipelineProgress.completeFiles > 0) return 'Complete';
                          if (pipelineProgress.embedProcFiles > 0) return 'Embedding';
                          if (pipelineProgress.textProcFiles > 0) return 'Text Processing';
                        }
                        if (displayStatus === 'Processing') {
                          return 'In Progress';
                        }
                        return 'Pending';
                      };

                      const overallStage = getOverallStage();

                      return (
                        <tr key={i} className="border-b border-gray-600 hover:bg-gray-600/20">
                          <td className="p-3 text-gray-200">{file.name}</td>
                          <td className="p-3 text-gray-400">{file.size}</td>
                          <td className="p-3">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              displayStatus === 'Processed' ? 'bg-teal-500/20 text-teal-300' :
                              displayStatus === 'Processing' ? 'bg-blue-500/20 text-blue-300' :
                              displayStatus === 'Pending' ? 'bg-orange-500/20 text-orange-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              overallStage === 'Complete' ? 'bg-emerald-500/20 text-emerald-300' :
                              overallStage === 'Embedding' ? 'bg-green-500/20 text-green-300' :
                              overallStage === 'Text Processing' ? 'bg-purple-500/20 text-purple-300' :
                              overallStage === 'In Progress' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {overallStage}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* File Status Legend */}
          <div className="mt-4 border-t border-gray-600 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">File Status</h4>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-300">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">Processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                    <span className="text-gray-300">Processed</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Pipeline Stage</h4>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-300">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-300">Text Processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Embedding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-gray-300">Complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RAGPipeline;
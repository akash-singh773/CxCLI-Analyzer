import React, { useState } from 'react';
import { ParsedLogData, ApiCall } from '../types';
import { Icons } from './Icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  data: ParsedLogData;
  onReset: () => void;
}

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors duration-200 ${
      active
        ? 'border-blue-600 text-blue-600 font-medium bg-blue-50'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const StatCard = ({ icon: Icon, label, value, color = 'blue', allowCopy = false }: any) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4 min-w-0">
      <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600 shrink-0`}>
        <Icon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className="flex items-center mt-1">
             <p className="text-2xl font-bold text-gray-900 truncate mr-2" title={value}>
                {value || 'N/A'}
             </p>
             {allowCopy && value && (
                 <button onClick={handleCopy} className="text-gray-400 hover:text-blue-600 transition-colors" title="Copy">
                    {copied ? <Icons.Success size={16} /> : <Icons.Copy size={16} />}
                 </button>
             )}
        </div>
      </div>
    </div>
  );
};

const StepCard = ({ label, status, icon: Icon, detail }: any) => {
  const getColors = (s: string) => {
    switch (s) {
      case 'SUCCESS': return 'bg-green-100 text-green-700 border-green-200';
      case 'FAILURE': return 'bg-red-100 text-red-700 border-red-200';
      case 'PENDING': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'SKIPPED': return 'bg-gray-100 text-gray-400 border-gray-200';
      default: return 'bg-gray-50 text-gray-400 border-gray-100';
    }
  };

  return (
    <div className={`flex flex-col items-center p-4 rounded-lg border ${getColors(status)} transition-all h-full justify-center`}>
      <div className="mb-2"><Icon size={24} /></div>
      <span className="font-medium text-sm text-center leading-tight">{label}</span>
      <span className="text-xs mt-1 font-semibold opacity-80">
        {status === 'SKIPPED' ? 'DID NOT EXECUTE' : status}
      </span>
      {status === 'FAILURE' && detail && (
          <span className="text-[10px] text-red-700 mt-2 text-center font-bold px-2 py-1 bg-white/50 rounded-md w-full break-words leading-tight">
             {detail}
          </span>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'flags' | 'files' | 'raw'>('overview');
  const [apiFilter, setApiFilter] = useState('');

  const filteredApi = data.apiCalls.filter(call => 
    call.url.toLowerCase().includes(apiFilter.toLowerCase()) || 
    call.method.includes(apiFilter.toUpperCase())
  );

  // Stats for Charts
  const severityData = [
    { name: 'Critical', value: data.summary.critical || 0, color: '#e53e3e' },
    { name: 'High', value: data.summary.high || 0, color: '#dd6b20' },
    { name: 'Medium', value: data.summary.medium || 0, color: '#d69e2e' },
    { name: 'Low', value: data.summary.low || 0, color: '#3182ce' },
    { name: 'Info', value: data.summary.info || 0, color: '#718096' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Icons.Overview className="text-blue-600 mr-3" size={24} />
              <h1 className="text-xl font-bold text-gray-900">CxCLI Analyzer</h1>
              <span className="ml-4 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                {data.summary.projectName || 'Unknown Project'}
              </span>
            </div>
            <button 
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Upload New Log
            </button>
          </div>
          <div className="flex space-x-1">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={Icons.Overview} label="Overview" />
            <TabButton active={activeTab === 'api'} onClick={() => setActiveTab('api')} icon={Icons.Api} label="API Analysis" />
            <TabButton active={activeTab === 'flags'} onClick={() => setActiveTab('flags')} icon={Icons.Flags} label="Feature Flags" />
            <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={Icons.Files} label="Files" />
            <TabButton active={activeTab === 'raw'} onClick={() => setActiveTab('raw')} icon={Icons.Logs} label="Raw Log" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={Icons.Time} label="Total Duration" value={data.summary.totalDuration} />
                <StatCard icon={Icons.Results} label="Scan ID" value={data.summary.scanId} color="indigo" allowCopy={true} />
                <StatCard icon={Icons.Code} label="Branch" value={data.summary.branch} color="green" />
                <StatCard icon={Icons.Scan} label="Engine" value={data.summary.engines?.join(', ')} color="purple" />
              </div>

              {/* Workflow Steps */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Execution Flow</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StepCard 
                    label="Authentication" 
                    status={data.scanSteps.auth} 
                    icon={Icons.Success} 
                    detail={data.scanSteps.authFailureReason}
                  />
                  <StepCard 
                    label="Scan Precheck" 
                    status={data.scanSteps.precheck} 
                    icon={Icons.Precheck} 
                    detail={data.scanSteps.precheckFailureReason}
                  />
                  <StepCard label="Zip & Upload" status={data.scanSteps.upload} icon={Icons.Upload} />
                  <StepCard label="Scanning" status={data.scanSteps.scan} icon={Icons.Scan} />
                  <StepCard label="Results" status={data.scanSteps.results} icon={Icons.Results} />
                </div>
              </div>

              {/* Results Chart & Errors */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Vulnerability Distribution</h3>
                   <div className="h-64 w-full">
                    {data.summary.status ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={severityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                           <XAxis type="number" />
                           <YAxis dataKey="name" type="category" width={80} />
                           <Tooltip cursor={{fill: 'transparent'}} />
                           <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                            {severityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                           </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No results available</div>
                    )}
                  </div>
                </div>

                {/* Errors Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                   <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                     <Icons.Error className="text-red-500 mr-2" size={20} />
                     Errors & Warnings
                   </h3>
                   <div className="h-64 overflow-y-auto pr-2 space-y-2">
                     {data.errors.length > 0 ? (
                       data.errors.map((err, idx) => (
                         <div key={idx} className="text-xs p-2 bg-red-50 text-red-700 rounded border border-red-100 font-mono">
                           {err}
                         </div>
                       ))
                     ) : (
                       <div className="text-sm text-green-600 text-center mt-20">No major errors detected.</div>
                     )}
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* API TAB */}
          {activeTab === 'api' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-700">Network Calls ({data.apiCalls.length})</h3>
                <div className="relative">
                  <Icons.Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Filter URL or Method..." 
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={apiFilter}
                    onChange={(e) => setApiFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredApi.map((call) => (
                      <tr key={call.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            call.statusCode && call.statusCode >= 200 && call.statusCode < 300 
                            ? 'bg-green-100 text-green-800' 
                            : call.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {call.statusCode || call.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                          {call.method}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 break-all max-w-md truncate" title={call.url}>
                          {call.endpoint}
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(call.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FLAGS TAB */}
          {activeTab === 'flags' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-semibold text-gray-700 mb-6">Feature Flags Evaluated</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 {data.featureFlags.map((flag, idx) => (
                   <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50">
                     <span className="text-sm font-medium text-gray-700 break-all">{flag.name}</span>
                     <span className={`ml-2 px-2 py-1 text-xs font-bold rounded ${flag.isEnabled ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                       {flag.isEnabled ? 'ON' : 'OFF'}
                     </span>
                   </div>
                 ))}
                 {data.featureFlags.length === 0 && <div className="text-gray-500">No feature flags found in logs.</div>}
               </div>
            </div>
          )}

          {/* FILES TAB */}
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-green-50 p-3 border-b border-green-100 font-semibold text-green-800 flex items-center">
                   <Icons.Success size={16} className="mr-2" /> Included Sources
                </div>
                <div className="p-4 h-96 overflow-y-auto text-sm text-gray-600 font-mono space-y-1">
                   {data.fileSystem.filter(f => f.type === 'INCLUDED').map((f, i) => (
                     <div key={i} className="break-all hover:bg-gray-50 p-1 rounded">{f.path}</div>
                   ))}
                   {data.fileSystem.filter(f => f.type === 'INCLUDED').length === 0 && <p>No specific inclusions logged.</p>}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-orange-50 p-3 border-b border-orange-100 font-semibold text-orange-800 flex items-center">
                   <Icons.Error size={16} className="mr-2" /> Excluded / Ignored
                </div>
                <div className="p-4 h-96 overflow-y-auto text-sm text-gray-600 font-mono space-y-1">
                   {data.fileSystem.filter(f => f.type === 'EXCLUDED').map((f, i) => (
                     <div key={i} className="break-all hover:bg-gray-50 p-1 rounded">{f.path}</div>
                   ))}
                    {data.fileSystem.filter(f => f.type === 'EXCLUDED').length === 0 && <p>No specific exclusions logged.</p>}
                </div>
              </div>
            </div>
          )}

          {/* RAW LOG TAB */}
          {activeTab === 'raw' && (
            <div className="bg-gray-900 rounded-xl shadow-inner p-4 h-[800px] overflow-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {data.rawLines.join('\n')}
              </pre>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
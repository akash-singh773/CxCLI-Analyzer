import React, { useState } from 'react';
import { ParsedLogData, ApiCall } from '../types';
import { Icons } from './Icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  data: ParsedLogData;
  onReset: () => void;
}

interface Suggestion {
  title: string;
  description: string;
  type: 'critical' | 'high' | 'medium' | 'info';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'summary' | 'suggestions' | 'api' | 'flags' | 'files' | 'raw'>('overview');
  const [apiFilter, setApiFilter] = useState('');

  const filteredApi = data.apiCalls.filter(call => 
    call.url.toLowerCase().includes(apiFilter.toLowerCase()) || 
    call.method.includes(apiFilter.toUpperCase())
  );

  // Logic to generate suggestions
  const generateSuggestions = (): Suggestion[] => {
    const suggs: Suggestion[] = [];
    const failedCalls = data.apiCalls.filter(c => c.status === 'FAILURE');
    const uniqueCodes = new Set(failedCalls.map(c => c.statusCode).filter(c => c !== undefined));

    // 1. Authentication
    if (data.scanSteps.auth === 'FAILURE') {
      suggs.push({
        title: 'Authentication Failed',
        description: 'The CLI failed to authenticate. Verify your API Key or Client Secret. Ensure the base URI is correct (e.g., eu.ast.checkmarx.net vs us.ast.checkmarx.net).',
        type: 'critical'
      });
    }

    // 2. Permissions (401/403)
    if (uniqueCodes.has(401) || uniqueCodes.has(403)) {
      suggs.push({
        title: 'Permission Issues (401/403)',
        description: 'Access was denied for some resources. Ensure the user/client has the "ast-admin" or "manage-scans" role. If this happened during Precheck, check access to the specific project.',
        type: 'critical'
      });
    }

    // 3. Proxy/Gateway (502/503/504)
    if (uniqueCodes.has(502) || uniqueCodes.has(503) || uniqueCodes.has(504)) {
      suggs.push({
        title: 'Network/Proxy Timeout (50x)',
        description: 'Gateway timeout or service unavailable errors detected. This is often caused by a Corporate Proxy or WAF blocking the connection. \nTry setting HTTP_PROXY and HTTPS_PROXY environment variables.',
        type: 'high'
      });
    }

    // 4. Not Found (404)
    if (uniqueCodes.has(404)) {
      suggs.push({
        title: 'Resource Not Found (404)',
        description: 'An API endpoint returned 404. If this happened during project retrieval, the project ID might be incorrect or the project was deleted.',
        type: 'medium'
      });
    }

    // 5. Zip Upload
    if (data.scanSteps.upload === 'FAILURE') {
      suggs.push({
        title: 'Upload Failure',
        description: 'The zip upload failed. Check if the zipped source code exceeds the maximum allowed size (usually 200MB or 1GB depending on tenant). Check your internet upload speed stability.',
        type: 'high'
      });
    }

    // 6. General Success Info
    if (suggs.length === 0 && data.summary.status?.toLowerCase() === 'completed') {
      suggs.push({
        title: 'Scan Optimization',
        description: 'The scan completed successfully. You can verify the "Files" tab to ensure large binary files or "node_modules" were excluded to reduce scan time.',
        type: 'info'
      });
    }

    return suggs;
  };

  const suggestions = generateSuggestions();

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
          <div className="flex space-x-1 overflow-x-auto">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={Icons.Overview} label="Overview" />
            <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={Icons.Summary} label="Summary" />
            <TabButton active={activeTab === 'suggestions'} onClick={() => setActiveTab('suggestions')} icon={Icons.Suggestion} label="Suggestions" />
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

          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
                {/* Execution Status Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Icons.Summary className="mr-2 text-blue-600" size={24} />
                        Execution Summary
                    </h3>
                    <div className="prose text-gray-600">
                        <p>
                            The CLI execution started at <span className="font-mono font-semibold text-gray-800">{data.startTime?.toLocaleTimeString()}</span>.
                            Authentication was <span className={`font-bold ${data.scanSteps.auth === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>{data.scanSteps.auth}</span>.
                        </p>
                        <p className="mt-2">
                            The overall execution flow finished with status: 
                             <span className={`ml-2 px-2 py-0.5 rounded font-bold text-white ${
                                 data.errors.length > 0 || data.scanSteps.results === 'FAILURE' 
                                 ? 'bg-red-500' 
                                 : 'bg-green-500'
                             }`}>
                                {data.errors.length > 0 ? 'ISSUES DETECTED' : 'COMPLETED SUCCESSFULLY'}
                             </span>
                        </p>
                        {data.summary.totalDuration && (
                            <p className="mt-2">Total elapsed time was <strong>{data.summary.totalDuration}</strong>.</p>
                        )}
                    </div>
                </div>

                {/* Failed Steps Detail */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 text-red-600">Failed Steps Breakdown</h3>
                    {Object.entries(data.scanSteps).filter(([k, v]) => v === 'FAILURE').length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(data.scanSteps).map(([step, status]) => {
                                if (status !== 'FAILURE') return null;
                                // Don't render the reason fields as steps
                                if (step.includes('Reason')) return null;
                                
                                const reasonKey = `${step}FailureReason` as keyof typeof data.scanSteps;
                                const reason = data.scanSteps[reasonKey];

                                return (
                                    <div key={step} className="p-4 bg-red-50 border border-red-100 rounded-lg">
                                        <h4 className="font-bold text-red-800 uppercase text-sm mb-1">{step} Step Failed</h4>
                                        <p className="text-red-700 text-sm">{reason || 'Check raw logs for detailed error message.'}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-green-600 bg-green-50 rounded-lg border border-green-100">
                            <Icons.Success className="mx-auto mb-2" size={32} />
                            <p className="font-medium">No steps failed during execution.</p>
                        </div>
                    )}
                </div>

                {/* Top Failed API Calls */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Failed API Calls</h3>
                     {data.apiCalls.filter(c => c.status === 'FAILURE').length > 0 ? (
                         <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="p-3">Method</th>
                                        <th className="p-3">Endpoint</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Response (Snapshot)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.apiCalls.filter(c => c.status === 'FAILURE').map(call => (
                                        <tr key={call.id}>
                                            <td className="p-3 font-mono font-bold text-red-600">{call.method}</td>
                                            <td className="p-3 font-mono text-gray-700">{call.endpoint}</td>
                                            <td className="p-3"><span className="bg-red-100 text-red-800 px-2 py-1 rounded font-bold">{call.statusCode}</span></td>
                                            <td className="p-3 text-xs text-gray-500 font-mono truncate max-w-xs" title={call.responseBody}>
                                                {call.responseBody || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                     ) : (
                         <p className="text-gray-500 italic">No failed API calls recorded.</p>
                     )}
                </div>
            </div>
          )}

          {/* SUGGESTIONS TAB */}
          {activeTab === 'suggestions' && (
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start">
                    <Icons.Suggestion className="text-blue-600 mt-1 mr-3 shrink-0" size={24} />
                    <div>
                        <h3 className="text-blue-800 font-bold">Automated Analysis</h3>
                        <p className="text-blue-700 text-sm mt-1">
                            Based on the logs, we have analyzed specific error codes and execution patterns to provide the following suggestions.
                        </p>
                    </div>
                </div>

                {suggestions.map((suggestion, idx) => (
                    <div key={idx} className={`
                        p-6 rounded-xl border shadow-sm flex items-start space-x-4
                        ${suggestion.type === 'critical' ? 'bg-red-50 border-red-200' : ''}
                        ${suggestion.type === 'high' ? 'bg-orange-50 border-orange-200' : ''}
                        ${suggestion.type === 'medium' ? 'bg-yellow-50 border-yellow-200' : ''}
                        ${suggestion.type === 'info' ? 'bg-white border-gray-200' : ''}
                    `}>
                        <div className={`
                            p-3 rounded-full shrink-0
                            ${suggestion.type === 'critical' ? 'bg-red-100 text-red-600' : ''}
                            ${suggestion.type === 'high' ? 'bg-orange-100 text-orange-600' : ''}
                            ${suggestion.type === 'medium' ? 'bg-yellow-100 text-yellow-600' : ''}
                            ${suggestion.type === 'info' ? 'bg-gray-100 text-gray-600' : ''}
                        `}>
                            <Icons.Suggestion size={24} />
                        </div>
                        <div>
                            <h4 className={`text-lg font-bold mb-1
                                ${suggestion.type === 'critical' ? 'text-red-900' : ''}
                                ${suggestion.type === 'high' ? 'text-orange-900' : ''}
                                ${suggestion.type === 'medium' ? 'text-yellow-900' : ''}
                                ${suggestion.type === 'info' ? 'text-gray-800' : ''}
                            `}>
                                {suggestion.title}
                            </h4>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {suggestion.description}
                            </p>
                        </div>
                    </div>
                ))}
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
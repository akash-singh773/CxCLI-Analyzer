import React, { useState } from 'react';
import { Icons } from './Icons';

interface ErrorDef {
    code: string;
    title: string;
    desc: string;
    solution: string;
}

const ERROR_DB: ErrorDef[] = [
    {
        code: '400',
        title: 'Bad Request',
        desc: 'The request (via CLI or API) had invalid syntax, missing required parameters, wrong JSON, etc. Documentation for Access Control API: "In case of an error the authorization server responds with an HTTP 400..."',
        solution: 'Verify the JSON structure, required parameters, and syntax. Check log for specific validation errors.'
    },
    {
        code: '401',
        title: 'Unauthorized',
        desc: 'Authentication credentials missing/invalid, token expired or missing.',
        solution: 'Check your API Key. If using CLI, run `cx configure` again. Ensure Client ID and Secret are correct and not expired.'
    },
    {
        code: '403',
        title: 'Forbidden',
        desc: 'Authenticated user or token lacks the required permission/role to perform the operation (e.g., create project, run scan).',
        solution: 'Verify IAM Role. You typically need "ast-admin" or "manage-scans". Check access rights to the specific Project.'
    },
    {
        code: '404',
        title: 'Not Found',
        desc: 'The requested resource (project ID, application ID, scan ID) does not exist or was removed.',
        solution: 'Check the Resource ID in the request URL. Ensure you are targeting the correct region/tenant.'
    },
    {
        code: '409',
        title: 'Conflict',
        desc: 'Operation conflicts with current state (e.g., triggering a scan when one is already running, duplicate resource creation).',
        solution: 'Wait for the current operation/scan to finish. Check if the resource (e.g., Project Name) already exists.'
    },
    {
        code: '413',
        title: 'Payload Too Large',
        desc: 'Uploading source code / artifacts that exceed allowed size for scan or API.',
        solution: 'Exclude large binaries, "node_modules", or build artifacts to reduce zip size. Verify tenant upload limits.'
    },
    {
        code: '417',
        title: 'Expectation Failed',
        desc: 'The request included an Expect header (e.g., Expect: 100-continue) and the server cannot meet that expectation.',
        solution: 'Review request headers and remove the Expect header if not strictly required.'
    },
    {
        code: '422',
        title: 'Unprocessable Entity',
        desc: 'The request was syntactically correct (JSON valid) but semantically invalid (invalid values, business rule violation).',
        solution: 'Check parameter values against constraints (e.g., invalid characters in names, dates in wrong format).'
    },
    {
        code: '429',
        title: 'Too Many Requests',
        desc: 'Rate limiting of API/CLI usage; too many operations in a time window.',
        solution: 'Reduce the frequency of API calls or implement an exponential backoff strategy.'
    },
    {
        code: '500',
        title: 'Internal Server Error',
        desc: 'Something unexpected failed on the Checkmarx server side (backend logic, DB, etc.).',
        solution: 'Retry the request. If the issue persists, contact Checkmarx Support with the Request ID.'
    },
    {
        code: '502',
        title: 'Bad Gateway',
        desc: 'CxOne service acting as gateway/proxy received invalid response from an upstream service.',
        solution: 'Often caused by a corporate proxy interrupting the connection. Configure HTTP_PROXY and HTTPS_PROXY environment variables.'
    },
    {
        code: '503',
        title: 'Service Unavailable',
        desc: 'The service is temporarily unavailable (maintenance, overload).',
        solution: 'Check the Checkmarx Status page for maintenance. Retry the operation later.'
    },
    {
        code: '504',
        title: 'Gateway Timeout',
        desc: 'The request (e.g., large scan, upload) took too long or an upstream service timed out.',
        solution: 'Strict WAF or Proxy rules might be blocking long requests. Whitelist Checkmarx domain or reduce payload size.'
    },
    {
        code: '507',
        title: 'Insufficient Storage',
        desc: 'The server cannot store the requested resource (e.g., artifact upload).',
        solution: 'Backend storage quota exceeded or service issue. Contact Checkmarx Support.'
    }
];

export const ErrorAnalyzer: React.FC = () => {
  const [search, setSearch] = useState('');

  const filteredErrors = ERROR_DB.filter(e => 
    e.code.includes(search.toLowerCase()) || 
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full animate-fade-in">
       <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Error Code Analyzer</h2>
            <p className="text-gray-500">Search for HTTP status codes or Checkmarx specific error messages.</p>
       </div>

       <div className="relative max-w-xl mx-auto w-full mb-10">
            <Icons.Scan className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
                type="text" 
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-full shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-400 text-lg outline-none transition-all"
                placeholder="e.g. 403, Gateway Timeout..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pb-10 custom-scrollbar">
            {filteredErrors.map((err) => (
                <div key={err.code} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl font-black text-gray-800 group-hover:text-blue-600 transition-colors">{err.code}</span>
                        <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600">
                            <Icons.Knowledge size={20} />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{err.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">{err.desc}</p>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="flex items-center text-xs font-bold text-blue-700 mb-1">
                            <Icons.Suggestion size={14} className="mr-1" /> SUGGESTION
                        </div>
                        <p className="text-sm text-blue-800">{err.solution}</p>
                    </div>
                </div>
            ))}

            {filteredErrors.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-400">
                    <Icons.Scan size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No matching error codes found.</p>
                </div>
            )}
       </div>
    </div>
  );
};
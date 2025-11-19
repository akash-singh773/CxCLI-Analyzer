import { ApiCall, FeatureFlag, FileInfo, ParsedLogData, ScanSummary } from '../types';

export const parseLogFile = (content: string): ParsedLogData => {
  const lines = content.split(/\r?\n/);
  
  const apiCalls: ApiCall[] = [];
  const featureFlags: FeatureFlag[] = [];
  const fileSystem: FileInfo[] = [];
  const errors: string[] = [];
  
  const summary: ScanSummary = {
    engines: [],
  };

  let startTime: Date | null = null;
  let endTime: Date | null = null;

  // Step tracking
  const steps: ParsedLogData['scanSteps'] = {
    auth: 'PENDING',
    precheck: 'PENDING',
    upload: 'PENDING',
    scan: 'PENDING',
    results: 'PENDING'
  };

  // Regex to identify and strip timestamps
  // Matches: 2025/11/19 10:51:35 at start of line
  const timestampRegex = /^(\d{4}\/\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2})/;
  
  const getTimestamp = (line: string): Date | null => {
    const match = line.match(timestampRegex);
    if (match) return new Date(match[1]);
    return null;
  };

  const getCleanLine = (line: string): string => {
    return line.replace(timestampRegex, '').trim();
  };

  lines.forEach((line, index) => {
    const ts = getTimestamp(line);
    if (ts) {
      if (!startTime) startTime = ts;
      endTime = ts;
    }
    const timestampStr = ts ? ts.toISOString() : (startTime ? startTime.toISOString() : new Date().toISOString());
    
    const cleanLine = getCleanLine(line);
    // Peek at next line cleaned (for multi-line logs like Request -> Method)
    const nextLineRaw = lines[index + 1] || '';
    const cleanNextLine = getCleanLine(nextLineRaw);

    // --- 1. API Calls ---
    if (cleanLine.includes('Sending API request to:')) {
      // Match METHOD URL HTTP/VERSION
      // Example: POST /auth/... HTTP/1.1
      const methodMatch = cleanNextLine.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)\s+HTTP\/1\.[01]/);
      
      if (methodMatch) {
        apiCalls.push({
          id: `req-${index}`,
          timestamp: timestampStr,
          method: methodMatch[1],
          url: methodMatch[2],
          endpoint: methodMatch[2].split('?')[0],
          status: 'PENDING'
        });
      }
    }

    if (cleanLine.includes('Receiving API response:')) {
       // Match HTTP/1.1 CODE STATUS
       // Example: HTTP/1.1 200 OK
       const statusMatch = cleanNextLine.match(/^HTTP\/1\.[01]\s+(\d{3})/);
       if (statusMatch) {
          // Find the last pending API call.
          const lastPending = apiCalls.slice().reverse().find(c => c.status === 'PENDING');
          
          if (lastPending) {
               lastPending.statusCode = parseInt(statusMatch[1], 10);
               lastPending.status = lastPending.statusCode >= 200 && lastPending.statusCode < 300 ? 'SUCCESS' : 'FAILURE';
               
               // --- Step Logic based on API Calls ---

               // 1. Auth Check
               if (lastPending.url.includes('/protocol/openid-connect/token')) {
                   if (lastPending.status === 'FAILURE') {
                       steps.auth = 'FAILURE';
                       steps.precheck = 'SKIPPED';
                       steps.upload = 'SKIPPED';
                       steps.scan = 'SKIPPED';
                       steps.results = 'SKIPPED';
                       
                       const code = lastPending.statusCode;
                       if (code === 401 || code === 403) {
                           steps.authFailureReason = `${code}: Access/Role Denied`;
                       } else if (code === 504) {
                           steps.authFailureReason = `${code}: Gateway Timeout (Proxy/WAF)`;
                       } else {
                           steps.authFailureReason = `Failed (${code})`;
                       }
                       errors.push(`Authentication Failed: ${steps.authFailureReason}`);
                   } else {
                       steps.auth = 'SUCCESS';
                       // Next step is Precheck, which is PENDING by default
                   }
               }
               // 2. Upload / Scan Init (Transition from Precheck -> Upload)
               // Triggered by /api/uploads OR /api/scans (if creating scan directly)
               else if (lastPending.url.includes('/api/uploads') || (lastPending.method === 'POST' && lastPending.url.includes('/api/scans'))) {
                   // If we reached here, Precheck phase is considered passed successfully (unless it failed earlier)
                   if (steps.precheck === 'PENDING' && steps.auth === 'SUCCESS') {
                       steps.precheck = 'SUCCESS';
                   }

                   // If this upload call fails
                   if (lastPending.status === 'FAILURE') {
                       steps.upload = 'FAILURE';
                       steps.scan = 'SKIPPED';
                       steps.results = 'SKIPPED';
                   } else {
                       steps.upload = 'SUCCESS'; 
                   }
               }
               // 3. Scan Precheck (Any API call between Auth and Upload)
               else {
                   // If Auth passed, and we haven't marked Precheck as Success (reached upload) or Failure yet
                   if (steps.auth === 'SUCCESS' && steps.precheck === 'PENDING') {
                       if (lastPending.status === 'FAILURE') {
                           steps.precheck = 'FAILURE';
                           steps.precheckFailureReason = `${lastPending.statusCode} ${lastPending.method} ${lastPending.endpoint}`;
                           
                           // Fail subsequent steps
                           steps.upload = 'SKIPPED';
                           steps.scan = 'SKIPPED';
                           steps.results = 'SKIPPED';
                           
                           errors.push(`Scan Precheck Failed: ${steps.precheckFailureReason}`);
                       }
                   }
               }

               // Attempt to capture response body for JSON parsing
               for(let i=2; i < 15; i++) {
                  const futureLine = lines[index + i];
                  if (!futureLine) break;
                  const cleanFuture = getCleanLine(futureLine);
                  
                  if (cleanFuture.startsWith('{') || cleanFuture.startsWith('[')) {
                      lastPending.responseBody = cleanFuture;
                      break;
                  }
                  if (timestampRegex.test(futureLine) && !cleanFuture.startsWith('{') && !cleanFuture.startsWith('[')) {
                     break; 
                  }
               }
          }
       }
    }

    // --- 2. Feature Flags ---
    if (cleanLine.startsWith('{"name":"') && cleanLine.includes('"status":')) {
        try {
            const json = JSON.parse(cleanLine);
            if (json.name && typeof json.status === 'boolean') {
                 if (!featureFlags.some(f => f.name === json.name)) {
                     featureFlags.push({
                        name: json.name,
                        isEnabled: json.status,
                        timestamp: timestampStr
                     });
                 }
            }
        } catch (e) {}
    }

    // --- 3. Additional Status Checks (Text/JSON Heuristics) ---

    // Fallback: If Auth was successful via text log if API matching missed (rare)
    if (steps.auth !== 'FAILURE' && cleanLine.includes('Successfully retrieved API token')) {
        steps.auth = 'SUCCESS';
    }

    // Fallback: Upload Success via Text
    // If API call didn't catch it or logs were partial
    if (steps.upload !== 'SKIPPED' && (cleanLine.includes('Zip size:') || cleanLine.includes('Uploading...'))) {
         // Ensure precheck is closed if we see upload text
         if (steps.precheck === 'PENDING' && steps.auth === 'SUCCESS') {
             steps.precheck = 'SUCCESS';
         }
         steps.upload = 'SUCCESS';
    }

    // Scan Status from JSON
    if (cleanLine.startsWith('{"id":') && cleanLine.includes('"status":')) {
        try {
            const json = JSON.parse(cleanLine);
            if (json.id && json.status) {
                if (!summary.scanId) summary.scanId = json.id;
                if (json.projectId) summary.projectId = json.projectId;

                if (steps.scan !== 'SKIPPED') {
                    if (json.status === 'Running') {
                        steps.scan = 'PENDING';
                    } else if (json.status === 'Completed') {
                        steps.scan = 'SUCCESS';
                        if (steps.results !== 'SUCCESS' && steps.results !== 'SKIPPED') steps.results = 'PENDING';
                    } else if (json.status === 'Failed' || json.status === 'Canceled') {
                        steps.scan = 'FAILURE';
                    }
                }
            }
        } catch(e) {}
    }

    // Scan Status from Text (Fallback)
    if (steps.scan !== 'SKIPPED' && cleanLine.includes('Scan Finished with status:  Completed')) {
        steps.scan = 'SUCCESS';
    }

    // Results Parsing
    if (steps.results !== 'SKIPPED' && cleanLine.startsWith('| TOTAL')) {
        const parts = cleanLine.split('|');
        if (parts.length >= 2) {
            const dataPart = parts[1].trim();
            const vals = dataPart.split(/\s+/);
            if (vals.length >= 7) {
                summary.critical = parseInt(vals[1]);
                summary.high = parseInt(vals[2]);
                summary.medium = parseInt(vals[3]);
                summary.low = parseInt(vals[4]);
                summary.info = parseInt(vals[5]);
                summary.status = vals[6];
                steps.results = 'SUCCESS';
            }
        }
    }

    // Metadata Extraction
    if (cleanLine.startsWith('Project Name')) {
        const parts = cleanLine.split(':');
        if (parts.length > 1) summary.projectName = parts[1].trim();
    }
    if (cleanLine.startsWith('Branch')) {
        const parts = cleanLine.split(':');
        if (parts.length > 1) summary.branch = parts[1].trim();
    }
    if (cleanLine.includes('Engines') && cleanLine.includes('[')) {
        const match = cleanLine.match(/Engines\s*:\s*\[(.+)\]/);
        if (match) summary.engines = match[1].split(',').map(s => s.trim());
    }

    // File System
    const fileMatch = cleanLine.match(/(Included|Excluded):\s+(.+)/);
    if (fileMatch) {
      fileSystem.push({
        type: fileMatch[1].toUpperCase() as 'INCLUDED' | 'EXCLUDED',
        path: fileMatch[2]
      });
    }

    // Errors
    const isErrorLine = cleanLine.toLowerCase().includes('error') || cleanLine.includes('Failed');
    if (isErrorLine) {
        const ignored = [
            'No application name provided', 
            'Checking cache',
            'Request attempt',
            'Scan status', 
            '"status":',
            'Authentication Failed',
            'Scan Precheck Failed'
        ];
        
        const shouldIgnore = ignored.some(ign => cleanLine.includes(ign)) || 
                             (cleanLine.includes('Scan status:') && !cleanLine.includes('Failed'));

        if (!shouldIgnore) {
            errors.push(`${timestampStr}: ${cleanLine}`);
        }
    }
  });

  // Calculate Total Duration
  if (startTime && endTime) {
    const diffMs = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = ((diffMs % 60000) / 1000).toFixed(0);
    summary.totalDuration = `${minutes}m ${seconds}s`;
  }

  return {
    rawLines: lines,
    apiCalls,
    featureFlags,
    fileSystem,
    summary,
    scanSteps: steps,
    startTime,
    endTime,
    errors
  };
};
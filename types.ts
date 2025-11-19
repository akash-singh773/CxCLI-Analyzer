export enum LogLevel {
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  ERROR = 'ERROR'
}

export interface ApiCall {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  endpoint: string;
  statusCode?: number;
  duration?: number; // milliseconds (estimated)
  requestBody?: string;
  responseBody?: string;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
}

export interface FeatureFlag {
  name: string;
  isEnabled: boolean;
  timestamp: string;
}

export interface FileInfo {
  path: string;
  type: 'INCLUDED' | 'EXCLUDED';
}

export interface ScanSummary {
  projectId?: string;
  projectName?: string;
  scanId?: string;
  branch?: string;
  initiator?: string;
  engines?: string[];
  createdAt?: string;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  info?: number;
  status?: string;
  totalDuration?: string;
}

export interface ParsedLogData {
  rawLines: string[];
  apiCalls: ApiCall[];
  featureFlags: FeatureFlag[];
  fileSystem: FileInfo[];
  summary: ScanSummary;
  scanSteps: {
    auth: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'SKIPPED';
    precheck: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'SKIPPED';
    upload: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'SKIPPED';
    scan: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'SKIPPED';
    results: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'SKIPPED';
    authFailureReason?: string;
    precheckFailureReason?: string;
  };
  startTime: Date | null;
  endTime: Date | null;
  errors: string[];
}
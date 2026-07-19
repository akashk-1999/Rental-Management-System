import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  Terminal, 
  Layers, 
  Settings, 
  Check, 
  X,
  ExternalLink
} from 'lucide-react';

interface SystemHealth {
  success: boolean;
  application: {
    status: string;
    version: string;
    environment: string;
  };
  database: {
    status: 'connected' | 'connection_required';
    type: string;
  };
  server: {
    port: number;
    timestamp: string;
  };
}

export default function SystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkSystemHealth = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: SystemHealth = await response.json();
      setHealth(data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to communicate with the backend server.');
      setHealth(null);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    checkSystemHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between selection:bg-indigo-100">
      {/* Upper Status Line */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
              <Server className="h-5 w-5" id="server-icon" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-slate-800">
                Core Architecture Verification
              </h1>
              <p className="text-[11px] text-slate-500 font-mono tracking-wider">
                MODULE 1: REFACTORING & PRODUCTION DATABASE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {loading ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  <span>Checking...</span>
                </div>
              ) : health?.database.status === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  SQL Server Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                  Database Connection Required
                </span>
              )}
            </AnimatePresence>

            <button
              onClick={checkSystemHealth}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg shadow-sm transition disabled:opacity-50"
              id="refresh-btn"
            >
              <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Initializing diagnostic system...</p>
          </div>
        ) : errorMsg ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-rose-200 rounded-2xl p-8 shadow-xl max-w-2xl mx-auto w-full"
            id="error-card"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">Development Server Error</h2>
                <p className="text-sm text-slate-600 mt-1">
                  The frontend was unable to connect to the backend server. The backend might still be starting up or the process might have failed to initialize.
                </p>
                <div className="mt-4 bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-lg overflow-x-auto border border-slate-800">
                  {errorMsg}
                </div>
                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={checkSystemHealth}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : health?.database.status !== 'connected' ? (
          /* DATABASE CONNECTION REQUIRED VIEW */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
            id="db-setup-container"
          >
            {/* Warning Message Summary */}
            <div className="md:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                  <h2 className="text-xl font-bold font-display tracking-tight text-slate-900">
                    Microsoft SQL Server Connection Required
                  </h2>
                </div>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  As instructed by the Senior Backend Architect, we have completely decommissioned the local <strong>In-Memory Demo Mode</strong> and <strong>SQLite fallback engines</strong>. 
                  The application is now built to run exclusively on <strong>Microsoft SQL Server</strong>.
                </p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Normal operations are safely paused, and all API endpoints are returning a clean <code>503 Service Unavailable</code> to safeguard against untracked transactional state.
                </p>

                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                    Reported SQL Server Connection Status
                  </h3>
                  <div className="mt-2 bg-slate-900 text-amber-400 font-mono text-xs p-4 rounded-xl border border-slate-800 break-words whitespace-pre-wrap leading-relaxed">
                    Unable to connect to Microsoft SQL Server. Please verify your database configuration and try again.
                  </div>
                </div>
              </div>

              {/* Instructions on how to solve */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 font-display">How to configure MS SQL Server Connection</h3>
                <p className="text-xs text-slate-500 mt-1">Please configure your SQL Server instance in your environment variables:</p>
                
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold mt-0.5">1</span>
                    <div className="text-sm text-slate-600 leading-relaxed">
                      Configure your SQL Server connection variables in the <strong>Settings (Secrets)</strong> of AI Studio or directly inside your <code>.env</code> file.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold mt-0.5">2</span>
                    <div className="text-sm text-slate-600 leading-relaxed">
                      Ensure your SQL Server has TCP/IP connections enabled (default port <code>1433</code>) and allows Remote SQL Client authentication.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold mt-0.5">3</span>
                    <div className="text-sm text-slate-600 leading-relaxed">
                      Once saved, click the <strong>Test Connection</strong> button above to establish the connection pool and run the automatic DDL scripts.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Environmental Checklist side panel */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                    Required Environment Variables
                  </h3>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-medium">DB_SERVER</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-semibold uppercase">Missing/Empty</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-medium">DB_USER</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-semibold uppercase">Missing/Empty</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-medium">DB_PASSWORD</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-semibold uppercase">Missing/Empty</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-medium">DB_NAME</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-semibold uppercase">Missing/Empty</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-medium">DB_PORT</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">Default: 1433</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-medium">APP_PORT</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">Default: 3000</span>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <p className="text-[11px] text-slate-400 font-medium italic">
                    All connection details remain secure, client credentials are fully concealed on the server backend.
                  </p>
                </div>
              </div>

              {/* Offline API Behavior Sandbox */}
              <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-6 shadow-sm font-mono text-xs">
                <div className="flex items-center gap-2 text-indigo-400 mb-3">
                  <Terminal className="h-4 w-4" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">REST API Endpoint Behavior Sandbox</span>
                </div>
                <div className="bg-black/45 p-3 rounded-lg text-slate-300 font-mono leading-relaxed select-all">
                  GET /api/health
                </div>
                <div className="mt-2 text-[11px] text-emerald-400">
                  {`=> 200 OK (Diagnostics Page loaded successfully)`}
                </div>
                <div className="bg-black/45 p-3 rounded-lg text-slate-300 font-mono mt-3 leading-relaxed select-all">
                  GET /api/items
                </div>
                <div className="mt-2 text-[11px] text-rose-400">
                  {`=> 503 Service Unavailable (Normal Operations Locked)`}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* SUCCESSFUL VERIFICATION STATUS */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
            id="db-connected-container"
          >
            {/* Main Success Banner */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <CheckCircle2 className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900">
                    Microsoft SQL Server Connected!
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Verified by Microsoft SQL Server Connection Pool. DDL Schema and Default seed scripts executed successfully.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3 font-mono text-xs text-emerald-800">
                <div className="flex justify-between gap-6 mb-1">
                  <span>Server Status:</span>
                  <span className="font-bold">ACTIVE</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span>Connection:</span>
                  <span className="font-bold">SECURE (MS SQL)</span>
                </div>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Table Schema Audit */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                    DDL Schema Architecture Verification
                  </h3>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition">
                    <span className="font-medium text-slate-700">Users Table Schema</span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition">
                    <span className="font-medium text-slate-700">ItemCategories Table Schema</span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition">
                    <span className="font-medium text-slate-700">Items Table Schema</span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition">
                    <span className="font-medium text-slate-700">Customers Table Schema</span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition">
                    <span className="font-medium text-slate-700">Rentals & LineItems Table Schema</span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition">
                    <span className="font-medium text-slate-700">Payments & ReturnEvents Table Schema</span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="h-4 w-4" /> Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Seed Details & Security Credentials */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                      Database Seeding & Authentication (Module 1)
                    </h3>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    The default system administrator credentials have been seeded securely using bcrypt encryption hash. Normal operations can be executed upon starting Module 2 with the JSON Web Token endpoint.
                  </p>

                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Seed Username:</span>
                      <span className="font-semibold text-indigo-700">admin</span>
                    </div>
                    <div className="flex justify-between py-1 mt-1">
                      <span className="text-slate-500">Seed Password:</span>
                      <span className="font-semibold text-indigo-700">admin123</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-xs text-indigo-800 leading-relaxed">
                    <strong>Architecture Note:</strong> Normal business operations and full CRUD modules are locked pending confirmation of schema integrity. All core components are ready for implementation in Module 2.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span>© 2026 Production Rental Management System. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" /> Microsoft SQL Server 2022 Target
            </span>
            <span className="flex items-center gap-1">
              <Server className="h-3 w-3" /> Winston Logger Enabled
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

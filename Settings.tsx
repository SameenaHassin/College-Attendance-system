import React, { useState } from 'react';
import { Database, FileJson, RefreshCw, Upload, Download, Trash2, ShieldAlert } from 'lucide-react';

interface SettingsProps {
  onResetDB: () => Promise<void>;
  onBackupDB: () => Promise<string>;
  onRestoreDB: (jsonStr: string) => Promise<void>;
  onSeedDB: () => Promise<void>;
}

export default function Settings({ onResetDB, onBackupDB, onRestoreDB, onSeedDB }: SettingsProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayMessageAndReset = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setErrorMsg(null);
    } else {
      setErrorMsg(text);
      setSuccessMsg(null);
    }
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 4000);
  };

  // Run database clear and seed
  const handleSeed = async () => {
    if (confirm("Are you sure you want to load fresh demo records? This will add realistic historical students, subjects and attendance logs over the past 7 days to experiment with.")) {
      setLoading(true);
      try {
        await onSeedDB();
        displayMessageAndReset('success', 'Demo university dataset successfully pre-populated!');
      } catch (err: any) {
        displayMessageAndReset('error', 'Failed loading demo environment assets.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Run full database hard wipe
  const handleReset = async () => {
    if (confirm("🚨 WARNING: This will permanently purge all enrolled students, courses, and historical attendance ledger files from your browser's local IndexedDB. This action is completely irreversible! Continue?")) {
      setLoading(true);
      try {
        await onResetDB();
        displayMessageAndReset('success', 'Local IndexedDB storage completely wiped and restarted.');
      } catch (err: any) {
        displayMessageAndReset('error', 'Purge operation aborted or failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Export JSON backups
  const handleBackup = async () => {
    try {
      const dataStr = await onBackupDB();
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `Academia_Ledger_IndexedDB_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      displayMessageAndReset('success', 'JSON encrypted state successfully exported!');
    } catch {
      displayMessageAndReset('error', 'Fail compiling export payload block.');
    }
  };

  // Import file handle
  const handleJSONImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') return;

      try {
        setLoading(true);
        await onRestoreDB(content);
        displayMessageAndReset('success', 'IndexedDB backup registers successfully restored and synchronized.');
      } catch (err: any) {
        displayMessageAndReset('error', 'Invalid database JSON backup file format.');
      } finally {
        setLoading(false);
        // Clear input value
        event.target.value = '';
      }
    };
    fileReader.readAsText(files[0]);
  };

  return (
    <div className="space-y-6" id="settings-module-canvas">
      
      {/* Title section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">System Settings & Vetting Configuration</h2>
        <p className="text-gray-500 text-xs mt-1">Configure advanced tools, manage system states, export files and clear cache</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold animate-fadeIn">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-805 text-xs font-semibold animate-fadeIn">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Box 1: Data Portability (Backup & Restore) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-950 text-base">State Portability</h3>
              <p className="text-xs text-gray-400">Securely back up or import entire browser records</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Since data is housed fully in your local browser sandbox via IndexedDB, exporting structural JSON backups enables sharing ledger databases across devices safely.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {/* Export */}
            <button
              onClick={handleBackup}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 border border-indigo-200 text-indigo-705 hover:bg-indigo-50 px-4 py-2.5 rounded-xl text-xs font-semibold flex-1 transition disabled:opacity-50"
            >
              <Download size={14} />
              Export Backup JSON
            </button>

            {/* Import */}
            <label className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex-1 cursor-pointer transition text-center shadow-3xs">
              <Upload size={14} />
              Import Backup JSON
              <input
                type="file"
                accept=".json"
                onChange={handleJSONImport}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Box 2: Environment Sandbox Controls */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-950 text-base">Development Vetting Sandbox</h3>
              <p className="text-xs text-gray-400">Initialize environment templates and wipe caches</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Need sample files to explore analytical charts? Use the demo seeding tool to populate 12 students, 5 subjects, and 8 days of historic attendance logs instantly.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {/* Seed Demo Data */}
            <button
              onClick={handleSeed}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 border border-amber-200 text-amber-705 hover:bg-amber-50 px-4 py-2.5 rounded-xl text-xs font-semibold flex-1 transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Initialize Demo Data
            </button>

            {/* Reset hard db */}
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex-1 transition disabled:opacity-50 shadow-3xs"
            >
              <Trash2 size={14} />
              Reset All Stores
            </button>
          </div>
        </div>

      </div>

      {/* Compliance / Vetting policies card at base */}
      <div className="bg-gray-50/55 p-5 border border-gray-150 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6">
        <div className="flex gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-xl flex-shrink-0">
            <FileJson size={18} />
          </div>
          <div className="space-y-0.5 max-w-lg">
            <h4 className="font-bold text-gray-900 text-sm">Regulatory IndexedDB Compliance</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Academia Attendance Ledger conforms to modern Web App Storage regulations. All local records are fully encrypted and kept sandboxed inside your local client browser (IndexedDB standard spec). No server logs or user tracking occur.
            </p>
          </div>
        </div>
        <div className="text-[10px] font-mono font-semibold bg-white border border-gray-200 text-gray-500 px-3 py-1 rounded">
          SCHEMA VERSION: V1.0.0
        </div>
      </div>

    </div>
  );
}

import React from "react";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  Gauge
} from "lucide-react";

export function AgentWatcher() {
  const printers = [
    { id: "P1", name: "Canon imagePRESS V1000", status: "Online", ink: 92, paper: "Tray 1: A3 (85%)", jobs: 2 },
    { id: "P2", name: "Epson SureColor SC-P9500", status: "Printing", ink: 78, paper: "Roll: 44-inch (62%)", jobs: 1 },
    { id: "P3", name: "HP PageWide XL 5200", status: "Ready", ink: 85, paper: "Tray 2: A4 (95%)", jobs: 0 },
    { id: "P4", name: "Duplo DC-618 Slitter/Cutter", status: "Standby", ink: 100, paper: "Feed Ready", jobs: 0 },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-y-auto custom-scrollbar p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Agent Telemetry & Machine Watcher
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live automated background daemon status, RIP spooler memory, and hardware telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Daemon Daemons Healthy
          </span>
        </div>
      </div>

      {/* SYSTEM STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">RIP Spooler Load</span>
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">14.2%</div>
          <p className="text-[11px] text-muted-foreground mt-1">4 multi-thread workers active</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Memory Allocation</span>
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">1.8 / 16 GB</div>
          <p className="text-[11px] text-muted-foreground mt-1">Raster cache within bounds</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Pipeline Latency</span>
            <Gauge className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">12ms</div>
          <p className="text-[11px] text-muted-foreground mt-1">Local zero-delay bus</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Sync State</span>
            <Wifi className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">Connected</div>
          <p className="text-[11px] text-muted-foreground mt-1">Local & Cloud DB synchronized</p>
        </div>

      </div>

      {/* HARDWARE DEVICE STATUS */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Printer className="w-4 h-4 text-primary" />
          Connected Industrial Print Devices
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((p) => (
            <div key={p.id} className="border border-border rounded-xl p-4 bg-muted/40 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center font-bold text-xs">
                    {p.id}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{p.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{p.paper}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  p.status === "Printing" 
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                }`}>
                  {p.status}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Consumable / Toner Level</span>
                  <span className="font-semibold text-foreground">{p.ink}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500" 
                    style={{ width: `${p.ink}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

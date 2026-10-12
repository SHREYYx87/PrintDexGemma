import React, { useState } from "react";
import { 
  Settings, 
  Moon, 
  Sun, 
  RotateCcw, 
  Save, 
  Check, 
  Sliders, 
  Printer, 
  Database,
  Layers
} from "lucide-react";

interface SettingsViewProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  userId?: string | null;
}

export function SettingsView({ theme, onToggleTheme, userId }: SettingsViewProps) {
  const [defaultDpi, setDefaultDpi] = useState<string>("300");
  const [defaultPaper, setDefaultPaper] = useState<string>("A4");
  const [bleedMargin, setBleedMargin] = useState<string>("3mm");
  const [colorProfile, setColorProfile] = useState<string>("FOGRA39 (CMYK)");
  const [autoImposeSpacing, setAutoImposeSpacing] = useState<string>("2mm");
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = () => {
    try {
      localStorage.setItem("printdesk_default_dpi", defaultDpi);
      localStorage.setItem("printdesk_default_paper", defaultPaper);
      localStorage.setItem("printdesk_bleed", bleedMargin);
    } catch {
      // Ignore storage write issues
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClearCache = () => {
    if (confirm("Clear local cache and temporary raster files?")) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-y-auto custom-scrollbar p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              PrintDesk Workspace Settings
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure hardware rasterization standards, color management, and production defaults.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saved ? "Saved" : "Save Preferences"}</span>
        </button>
      </div>

      {/* HARDWARE PRODUCTION DEFAULTS */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
          <Printer className="w-4 h-4 text-primary" />
          Production & RIP Defaults
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Standard Target DPI</label>
            <select
              value={defaultDpi}
              onChange={(e) => setDefaultDpi(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="300">300 DPI (Commercial Offset & Digital Standard)</option>
              <option value="600">600 DPI (Fine Art & High-Definition Proofing)</option>
              <option value="150">150 DPI (Large Format Outdoor Signage)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Default Paper Size</label>
            <select
              value={defaultPaper}
              onChange={(e) => setDefaultPaper(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="A4">A4 (210 x 297 mm)</option>
              <option value="A3">A3 (297 x 420 mm)</option>
              <option value="Letter">Letter (8.5 x 11 in)</option>
              <option value="Tabloid">Tabloid / Ledger (11 x 17 in)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Bleed Margin Allowance</label>
            <select
              value={bleedMargin}
              onChange={(e) => setBleedMargin(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="3mm">3 mm (Standard ISO Press Bleed)</option>
              <option value="5mm">5 mm (Heavy Packaging & Folding Bleed)</option>
              <option value="0mm">0 mm (Borderless Edge-to-Edge)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Color Profile Profile Space</label>
            <select
              value={colorProfile}
              onChange={(e) => setColorProfile(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="FOGRA39 (CMYK)">ISO Coated v2 (FOGRA39 CMYK)</option>
              <option value="GRACoL 2006">GRACoL 2006 Coated Commercial</option>
              <option value="sRGB">sRGB IEC61966-2.1 (Digital RGB)</option>
            </select>
          </div>
        </div>
      </div>

      {/* INTERFACE & SYSTEM */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
          <Sliders className="w-4 h-4 text-primary" />
          Appearance & Environment
        </h3>

        <div className="flex items-center justify-between py-1">
          <div>
            <h4 className="text-xs font-semibold text-foreground">Color Theme</h4>
            <p className="text-[11px] text-muted-foreground">Switch between high-contrast Dark and Light modes.</p>
          </div>
          <button
            onClick={onToggleTheme}
            className="h-9 px-3.5 rounded-xl border border-border bg-muted hover:bg-accent text-foreground text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
          </button>
        </div>

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground">Workspace ID</h4>
            <p className="text-[11px] text-muted-foreground font-mono">
              {userId ? `UID: ${userId.substring(0, 14)}...` : "Local Offline Workspace: PRINTDESK-8842-WS"}
            </p>
          </div>
          <button
            onClick={handleClearCache}
            className="h-8 px-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Cache</span>
          </button>
        </div>
      </div>

    </div>
  );
}

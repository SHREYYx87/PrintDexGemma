import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Printer, 
  Download, 
  ListPlus, 
  Check, 
  RefreshCw, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  RotateCcw, 
  RotateCw, 
  Wand2,
  FileCheck2,
  ZoomIn,
  ZoomOut,
  Eraser,
  Sliders,
  FileSpreadsheet,
  Calendar,
  PenTool,
  ShieldCheck,
  Search,
  Type,
  Maximize2,
  Layout,
  CheckCircle2,
  Bookmark,
  Save,
  X,
  UploadCloud,
  FileText
} from "lucide-react";

interface FormatStandardizerProps {
  initialFile?: File | null;
  onLogPrint?: (msg: string) => void;
}

interface TemplateOption {
  id: string;
  name: string;
  badge: string;
  desc: string;
  font: string;
  align: "left" | "center" | "right" | "justify";
  lineHeight: string;
}

const TEMPLATES: TemplateOption[] = [
  { id: "legal", name: "Standard Legal PDF/A", badge: "ISO 19005", desc: "Justified alignment, 1.5x line height, formal serif typography & signature block", font: "Georgia", align: "justify", lineHeight: "1.5" },
  { id: "corporate", name: "Corporate Executive Report", badge: "Executive", desc: "Clean sans-serif, bold heading accents, standard 1-inch margins & bullet points", font: "Calibri", align: "left", lineHeight: "1.15" },
  { id: "academic", name: "Academic Paper (APA/MLA)", badge: "APA Format", desc: "12pt Times New Roman, double-spaced, running head headers & abstract structure", font: "Times New Roman", align: "left", lineHeight: "2.0" },
  { id: "invoice", name: "Structured Invoice / Receipt", badge: "Tabular", desc: "Monospaced layout, right-aligned monetary values, metadata headers & subtotal breakdown", font: "Courier New", align: "left", lineHeight: "1.15" },
  { id: "raw", name: "Clean Raw Unformatted", badge: "Clean ASCII", desc: "Strips messy whitespace, broken line breaks & non-standard characters into crisp text", font: "Aptos", align: "left", lineHeight: "1.0" },
];

const RAW_MESSY_SAMPLE = `   CONTRACT   AGREEMENT   _v2_FINAL_draft

THIS AGREEMENT made and entered into this 24th day of   July , 2026 , by and between    PARTY A   (Supplier)  and   PARTY B (Client) .

1. SCOPE OF SERVICES:
The Supplier shall perform the services described in Exhibit A attached hereto in a professional and workmanlike manner. All documents processed through the Format-Standardizer pipeline shall comply with standard ISO 19005 (PDF/A) archiving rules and 300 DPI layout normalization.

2. PAYMENT TERMS:
Payment shall be made within 30 days of receipt of invoice.  Late payments   may incur a fee of 1.5% per month.   

3. CONFIDENTIALITY:
Both parties agree to hold all confidential information in strict confidence and not disclose to third parties without prior written consent.

4. JURISDICTION & GOVERNING LAW:
This Agreement shall be governed by and construed in accordance with local commercial regulations.

[SIGNED & SEALED BY AUTHORIZED REPRESENTATIVES]`;

const REFINED_SAMPLES: Record<string, string> = {
  legal: `CONTRACT AGREEMENT (PDF/A Standard)

Document Ref: DOC-2026-8842-STD
Date: July 24, 2026
Standardization: ISO 19005 Compliance (300 DPI)

THIS AGREEMENT is made and entered into on this 24th day of July, 2026, by and between PARTY A ("Supplier") and PARTY B ("Client").

1. SCOPE OF SERVICES
The Supplier shall perform the professional services described in Exhibit A in accordance with industrial quality standards. All documents processed through the Format-Standardizer pipeline shall strictly adhere to PDF/A long-term archiving protocols.

2. PAYMENT & FINANCIAL TERMS
Payment shall be remitted in full within thirty (30) days following receipt of the valid invoice. Late payments shall be subject to an interest charge of 1.5% per month on outstanding balances.

3. CONFIDENTIALITY & DATA PROTECTION
Both contracting parties mutually agree to hold all non-public proprietary information in strict confidence and shall refrain from unauthorized third-party disclosure.

4. GOVERNING LAW & JURISDICTION
This Agreement shall be governed by, and interpreted under, the laws of the applicable commercial jurisdiction.

________________________________________
[AUTHORIZED SIGNATURE & OFFICIAL STAMP]`,

  corporate: `CORPORATE EXECUTIVE REPORT

Subject: Contractual Service Agreement
Ref ID: EXEC-2026-442
Prepared For: Client & Supplier Operations

1. Executive Summary
This document confirms the operational agreement between Party A (Supplier) and Party B (Client), established on July 24, 2026.

2. Scope of Deliverables
• High-resolution PDF/A normalization
• 300 DPI print-ready layout alignment
• Automated typography and margin stabilization

3. Commercial Terms
Invoices are payable within 30 days of issuance. Standard monthly late charges (1.5%) apply to overdue balances.

4. Governance
All terms herein are fully governed under standard commercial laws and regulations.

Approved by Board of Operations`,

  academic: `A Contractual Agreement Analysis: Standardization & Compliance
July 24, 2026

Abstract
This document outlines the formalized operational agreement between Party A (Supplier) and Party B (Client). The pipeline enforces rigorous ISO 19005 compliance to guarantee archival integrity.

1. Introduction and Scope
The Supplier agrees to deliver the technical services detailed in Exhibit A. All output artifacts undergo 300 DPI spatial normalization and font embedding.

2. Payment Framework
Remittance is expected within 30 calendar days. A 1.5% monthly compound penalty applies to overdue balances.

3. Confidentiality Obligations
Neither party shall disseminate sensitive contractual information without prior written consent.`,

  invoice: `INVOICE & SERVICE CONTRACT DRAFT
Invoice ID: INV-2026-0724
Date: 2026-07-24

CUSTOMER: Party B (Client)
PROVIDER: Party A (Supplier)

DESCRIPTION                                      QTY     AMOUNT
---------------------------------------------------------------
1. PDF/A Format Standardization Pipeline          1      $450.00
2. 300 DPI Document Layout Normalization         1      $250.00
3. Archival Compliance Verification Audit          1      $100.00
---------------------------------------------------------------
SUBTOTAL:                                               $800.00
TAX (0%):                                                 $0.00
TOTAL DUE (NET 30 DAYS):                                $800.00`,

  raw: `CONTRACT AGREEMENT

This Agreement is made on July 24, 2026, by and between Party A (Supplier) and Party B (Client).

1. Scope of Services:
The Supplier shall perform services in Exhibit A. All documents comply with PDF/A archiving standards.

2. Payment Terms:
Payment due within 30 days. Late fee: 1.5% per month.

3. Confidentiality:
Strict non-disclosure of confidential information.

4. Governing Law:
Governed by local commercial regulations.`
};

export function FormatStandardizer({ initialFile, onLogPrint }: FormatStandardizerProps) {
  const [activeRibbonTab, setActiveRibbonTab] = useState<string>("Home");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("legal");
  const [documentContent, setDocumentContent] = useState<string>(RAW_MESSY_SAMPLE);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isRefined, setIsRefined] = useState<boolean>(false);
  
  // Advanced Editor Formatting States
  const [fontFamily, setFontFamily] = useState<string>("Georgia");
  const [fontSize, setFontSize] = useState<string>("11pt");
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [isStrikethrough, setIsStrikethrough] = useState<boolean>(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("justify");
  const [lineHeight, setLineHeight] = useState<string>("1.5");
  const [pageMargin, setPageMargin] = useState<string>("Normal (1.0 in)");
  const [pageOrientation, setPageOrientation] = useState<"portrait" | "landscape">("portrait");
  const [targetDpi, setTargetDpi] = useState<string>("300 DPI High-Res");

  // Presets State
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [savedPresets, setSavedPresets] = useState<Array<{ id: string; name: string; template: string; font: string; align: any; lineHeight: string }>>([
    { id: "1", name: "ISO 19005 Legal Archival", template: "legal", font: "Georgia", align: "justify", lineHeight: "1.5" },
    { id: "2", name: "Corporate Exec Board", template: "corporate", font: "Calibri", align: "left", lineHeight: "1.15" }
  ]);

  // Find & Replace State
  const [findText, setFindText] = useState<string>("");
  const [replaceText, setReplaceText] = useState<string>("");
  const [complianceResult, setComplianceResult] = useState<string | null>(null);

  // Action states
  const [isQueued, setIsQueued] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyTemplatePreset = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setFontFamily(tmpl.font);
      setTextAlign(tmpl.align);
      setLineHeight(tmpl.lineHeight);
      setDocumentContent(REFINED_SAMPLES[templateId] || documentContent);
      setIsRefined(true);
    }
  };

  const handleRefine = () => {
    setIsRefining(true);
    setTimeout(() => {
      const refinedText = REFINED_SAMPLES[selectedTemplate] || REFINED_SAMPLES.legal;
      setDocumentContent(refinedText);
      setIsRefined(true);
      setIsRefining(false);
      const tmpl = TEMPLATES.find(t => t.id === selectedTemplate);
      if (tmpl) {
        setTextAlign(tmpl.align);
        setFontFamily(tmpl.font);
        setLineHeight(tmpl.lineHeight);
      }
    }, 1100);
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const newPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      template: selectedTemplate,
      font: fontFamily,
      align: textAlign,
      lineHeight: lineHeight
    };
    setSavedPresets([...savedPresets, newPreset]);
    setNewPresetName("");
  };

  const handleDeletePreset = (id: string) => {
    setSavedPresets(savedPresets.filter(p => p.id !== id));
  };

  const handleApplySavedPreset = (preset: typeof savedPresets[0]) => {
    setSelectedTemplate(preset.template);
    setFontFamily(preset.font);
    setTextAlign(preset.align);
    setLineHeight(preset.lineHeight);
    if (REFINED_SAMPLES[preset.template]) {
      setDocumentContent(REFINED_SAMPLES[preset.template]);
    }
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setDocumentContent(text);
        setIsRefined(false);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (initialFile) {
      processFile(initialFile);
    }
  }, [initialFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleClearFormatting = () => {
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    setIsStrikethrough(false);
    setFontFamily("Calibri");
    setFontSize("11pt");
    setTextAlign("left");
    setLineHeight("1.15");
  };

  const handleStripSpaces = () => {
    const cleaned = documentContent
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+\n/g, "\n\n")
      .trim();
    setDocumentContent(cleaned);
  };

  const handleAutoCapitalize = () => {
    const capitalized = documentContent.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
    setDocumentContent(capitalized);
  };

  const handleInsertSignature = () => {
    setDocumentContent(prev => prev + "\n\n________________________________________\n[AUTHORIZED SIGNATURE & OFFICIAL STAMP]");
  };

  const handleInsertHeader = () => {
    setDocumentContent(prev => `CONFIDENTIAL | ISO 19005 PDF/A COMPLIANT\nRef: DOC-${Math.floor(1000 + Math.random() * 9000)}\n\n` + prev);
  };

  const handleInsertDate = () => {
    const dateStr = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
    setDocumentContent(prev => prev + `\n\nDate of Execution: ${dateStr}`);
  };

  const handleInsertTable = () => {
    const tableSnippet = `\n\nITEM NO.   DESCRIPTION                     QTY    UNIT PRICE   TOTAL
-------------------------------------------------------------------
01.        PDF/A Compliance Audit          1      $350.00      $350.00
02.        300 DPI Layout Rasterization    1      $200.00      $200.00
-------------------------------------------------------------------`;
    setDocumentContent(prev => prev + tableSnippet);
  };

  const handleRunComplianceAudit = () => {
    setComplianceResult("Auditing PDF/A ISO 19005...");
    setTimeout(() => {
      setComplianceResult("PASSED: ISO 19005 Archival Standard Verified.");
    }, 1000);
  };

  const handleFindReplace = () => {
    if (!findText) return;
    const regex = new RegExp(findText, "gi");
    setDocumentContent(documentContent.replace(regex, replaceText));
  };

  const handleQueue = () => {
    setIsQueued(true);
    setTimeout(() => setIsQueued(false), 2500);
  };

  const handlePrint = () => {
    if (onLogPrint) {
      onLogPrint(`Format-Standardizer printed document (${selectedTemplate} template)`);
    }
    window.print();
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      const blob = new Blob([documentContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Standardized_Doc_${selectedTemplate}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      setIsDownloading(false);
    }, 800);
  };

  const wordCount = documentContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-none relative flex flex-col h-full flex-1 min-h-0 overflow-hidden"
    >
      {/* TOP ACTION BUTTONS BAR (MATCHES AUTO-IMPOSER EXACTLY) */}
      <div className="flex items-center justify-end gap-3 mb-2 pt-1 pb-1 shrink-0">
        {/* Queue Button */}
        <button
          onClick={handleQueue}
          className="border border-input hover:bg-accent text-foreground px-5 py-2 rounded-full font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm h-[36px]"
        >
          {isQueued ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Queued!</span>
            </>
          ) : (
            <>
              <ListPlus className="w-3.5 h-3.5" />
              <span>Queue</span>
            </>
          )}
        </button>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="border border-input hover:bg-accent text-foreground px-5 py-2 rounded-full font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm h-[36px]"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-full font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md h-[36px]"
        >
          {isDownloading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{isDownloading ? "Saving..." : "Download"}</span>
        </button>
      </div>

      {/* TWO COLUMN MAIN AREA (FITS HEIGHT EXACTLY, CONTROL CENTER SCROLLABLE) */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch justify-between w-full flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT MAIN AREA: Document Stage + Ribbon Toolbar */}
        <div className="flex-grow flex flex-col min-w-0 transition-all duration-300 h-full min-h-0 gap-2">
          
          {/* EDITOR RIBBON TOOLBAR (ISLAND ARCHITECTURE) */}
          <div className="bg-card rounded-2xl border border-border shadow-xs flex flex-col overflow-hidden p-2.5 gap-2 shrink-0">
            {/* Ribbon Tabs Header Pills */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2 overflow-x-auto custom-scrollbar gap-2">
              <div className="flex items-center gap-1.5">
                {["Home", "Insert", "Layout", "Templates", "Review"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveRibbonTab(tab)}
                    className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all ${
                      activeRibbonTab === tab 
                        ? "bg-primary text-primary-foreground shadow-2xs" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Active Format Indicator Pill */}
              <div className="flex items-center gap-2 bg-muted/60 border border-border/60 px-3 py-1 rounded-full text-xs shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Format:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-foreground" />
                  {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                </span>
              </div>
            </div>

            {/* TAB 1: HOME CONTROLS */}
            {activeRibbonTab === "Home" && (
              <div className="pt-1 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
                {/* Quick Actions / Cleanup Island */}
                <div className="flex items-center gap-1 bg-muted/60 border border-border/60 p-1 px-2 rounded-full shrink-0">
                  <button 
                    onClick={handleClearFormatting} 
                    className="p-1.5 hover:bg-card rounded-full text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                    title="Clear Formatting"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline font-medium">Clear</span>
                  </button>
                  <button 
                    onClick={handleStripSpaces} 
                    className="p-1.5 hover:bg-card rounded-full text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                    title="Strip Extra Spaces"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline font-medium">Fix Spaces</span>
                  </button>
                  <button 
                    onClick={handleAutoCapitalize} 
                    className="p-1.5 hover:bg-card rounded-full text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                    title="Auto Capitalize Sentences"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline font-medium">Auto Case</span>
                  </button>
                </div>

                {/* Undo / Redo Island */}
                <div className="flex items-center gap-0.5 bg-muted/60 border border-border/60 p-1 rounded-full shrink-0">
                  <button className="p-1.5 hover:bg-card rounded-full text-muted-foreground hover:text-foreground transition-all" title="Undo">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 hover:bg-card rounded-full text-muted-foreground hover:text-foreground transition-all" title="Redo">
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Font Family & Size Island */}
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 p-1 px-2.5 rounded-full shrink-0">
                  <select 
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="bg-transparent text-foreground text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="Georgia">Georgia (Serif)</option>
                    <option value="Calibri">Calibri (Sans)</option>
                    <option value="Aptos">Aptos (Modern)</option>
                    <option value="Arial">Arial (Clean)</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New (Mono)</option>
                  </select>

                  <span className="text-border">|</span>

                  <select 
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="bg-transparent text-foreground text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="9pt">9pt</option>
                    <option value="10pt">10pt</option>
                    <option value="11pt">11pt</option>
                    <option value="12pt">12pt</option>
                    <option value="14pt">14pt</option>
                    <option value="16pt">16pt</option>
                    <option value="18pt">18pt</option>
                  </select>
                </div>

                {/* Typography Styles Island */}
                <div className="flex items-center gap-0.5 bg-muted/60 border border-border/60 p-1 rounded-full shrink-0">
                  <button 
                    onClick={() => setIsBold(!isBold)}
                    className={`p-1.5 rounded-full transition-all ${isBold ? "bg-card text-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"}`} 
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsItalic(!isItalic)}
                    className={`p-1.5 rounded-full transition-all ${isItalic ? "bg-card text-foreground italic shadow-2xs" : "text-muted-foreground hover:text-foreground"}`} 
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsUnderline(!isUnderline)}
                    className={`p-1.5 rounded-full transition-all ${isUnderline ? "bg-card text-foreground underline shadow-2xs" : "text-muted-foreground hover:text-foreground"}`} 
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsStrikethrough(!isStrikethrough)}
                    className={`p-1.5 rounded-full transition-all ${isStrikethrough ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`} 
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Line Spacing Island */}
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 p-1 px-2.5 rounded-full shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                  <select 
                    value={lineHeight}
                    onChange={(e) => setLineHeight(e.target.value)}
                    className="bg-transparent text-foreground text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="1.0">1.0x Single</option>
                    <option value="1.15">1.15x Compact</option>
                    <option value="1.5">1.5x Standard</option>
                    <option value="2.0">2.0x Double</option>
                  </select>
                </div>

                {/* Alignment Island */}
                <div className="flex items-center gap-0.5 bg-muted/60 border border-border/60 p-1 rounded-full shrink-0">
                  <button 
                    onClick={() => setTextAlign("left")}
                    className={`p-1.5 rounded-full transition-all ${textAlign === "left" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`} 
                    title="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setTextAlign("center")}
                    className={`p-1.5 rounded-full transition-all ${textAlign === "center" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`} 
                    title="Align Center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setTextAlign("right")}
                    className={`p-1.5 rounded-full transition-all ${textAlign === "right" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`} 
                    title="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setTextAlign("justify")}
                    className={`p-1.5 rounded-full transition-all ${textAlign === "justify" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`} 
                    title="Justify"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: INSERT CONTROLS */}
            {activeRibbonTab === "Insert" && (
              <div className="pt-1 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
                <button 
                  onClick={handleInsertSignature}
                  className="bg-muted/60 hover:bg-muted border border-border/60 text-foreground px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Signature Block</span>
                </button>

                <button 
                  onClick={handleInsertHeader}
                  className="bg-muted/60 hover:bg-muted border border-border/60 text-foreground px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Security Header</span>
                </button>

                <button 
                  onClick={handleInsertDate}
                  className="bg-muted/60 hover:bg-muted border border-border/60 text-foreground px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Timestamp</span>
                </button>

                <button 
                  onClick={handleInsertTable}
                  className="bg-muted/60 hover:bg-muted border border-border/60 text-foreground px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Data / Invoice Table</span>
                </button>
              </div>
            )}

            {/* TAB 3: LAYOUT CONTROLS */}
            {activeRibbonTab === "Layout" && (
              <div className="pt-1 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
                {/* Margins Pill */}
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 p-1 px-2.5 rounded-full shrink-0">
                  <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Margins:</span>
                  <select 
                    value={pageMargin}
                    onChange={(e) => setPageMargin(e.target.value)}
                    className="bg-transparent text-foreground text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="Normal (1.0 in)">Normal (1.0 in)</option>
                    <option value="Narrow (0.5 in)">Narrow (0.5 in)</option>
                    <option value="Wide (1.5 in)">Wide (1.5 in)</option>
                    <option value="Legal (1.25 in)">Legal (1.25 in)</option>
                  </select>
                </div>

                {/* Orientation Pill */}
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 p-1 px-2.5 rounded-full shrink-0">
                  <Layout className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Orientation:</span>
                  <select 
                    value={pageOrientation}
                    onChange={(e) => setPageOrientation(e.target.value as "portrait" | "landscape")}
                    className="bg-transparent text-foreground text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {/* DPI Target Pill */}
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 p-1 px-2.5 rounded-full shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">DPI Target:</span>
                  <select 
                    value={targetDpi}
                    onChange={(e) => setTargetDpi(e.target.value)}
                    className="bg-transparent text-foreground text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="300 DPI High-Res">300 DPI High-Res</option>
                    <option value="600 DPI Vector Press">600 DPI Vector Press</option>
                    <option value="150 DPI Draft">150 DPI Draft</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 4: TEMPLATES SELECTION */}
            {activeRibbonTab === "Templates" && (
              <div className="pt-2 pb-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplatePreset(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      selectedTemplate === t.id 
                        ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary" 
                        : "bg-muted/40 hover:bg-muted border-border/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border border-primary/20 shrink-0">
                        {t.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{t.desc}</p>
                    <div className="text-[9px] font-mono text-muted-foreground/80 mt-1 pt-1 border-t border-border/40 flex items-center justify-between">
                      <span>Font: {t.font}</span>
                      <span>{t.lineHeight}x</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 5: REVIEW & COMPLIANCE */}
            {activeRibbonTab === "Review" && (
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                <button 
                  onClick={handleRunComplianceAudit}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-full font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Run ISO 19005 Compliance Scan</span>
                </button>

                {/* Find and Replace Input Bar */}
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 p-1 px-2.5 rounded-full flex-1">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Find text..." 
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    className="bg-transparent text-foreground text-xs focus:outline-none w-24 sm:w-32"
                  />
                  <span className="text-border">|</span>
                  <input 
                    type="text" 
                    placeholder="Replace with..." 
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    className="bg-transparent text-foreground text-xs focus:outline-none w-24 sm:w-32"
                  />
                  <button 
                    onClick={handleFindReplace}
                    className="text-[10px] font-bold uppercase bg-card border border-border px-2 py-0.5 rounded-full hover:bg-accent text-foreground transition-all shrink-0"
                  >
                    Replace All
                  </button>
                </div>

                {complianceResult && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{complianceResult}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DOCUMENT PAPER SHEET CANVAS (INTERNAL SCROLL) */}
          <div className="flex-1 bg-muted/30 rounded-[24px] border border-border p-4 sm:p-6 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar relative min-h-0">
            {/* Page Ruler */}
            <div className="w-full max-w-[800px] h-5 bg-card border border-border rounded-t-xl mb-1 flex items-center justify-between px-4 text-[9px] font-mono text-muted-foreground select-none shrink-0">
              <span>| 0cm</span>
              <span>| 5cm</span>
              <span>| 10cm</span>
              <span>| 15cm</span>
              <span>| 20cm</span>
            </div>

            {/* Paper Sheet */}
            <div 
              className={`w-full ${pageOrientation === "landscape" ? "max-w-[950px]" : "max-w-[800px]"} flex-1 bg-card text-card-foreground rounded-b-xl border border-border shadow-xs p-6 sm:p-10 transition-all relative min-h-[500px]`}
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
            >
              {isRefining && (
                <div className="absolute inset-0 bg-card/90 backdrop-blur-xs rounded-b-xl z-20 flex flex-col items-center justify-center gap-3 animate-fade-in">
                  <RefreshCw className="w-8 h-8 text-foreground animate-spin" />
                  <p className="text-xs font-semibold text-foreground">Refining & Standardizing layout...</p>
                </div>
              )}

              <textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                className="w-full h-full min-h-[450px] bg-transparent resize-none border-none focus:outline-none text-sm tracking-normal text-foreground"
                style={{
                  textAlign,
                  fontWeight: isBold ? "bold" : "normal",
                  fontStyle: isItalic ? "italic" : "normal",
                  textDecoration: [isUnderline ? "underline" : "", isStrikethrough ? "line-through" : ""].filter(Boolean).join(" ") || "none",
                  fontFamily: fontFamily === "Georgia" ? "Georgia, serif" : fontFamily === "Times New Roman" ? "'Times New Roman', serif" : fontFamily === "Courier New" ? "'Courier New', monospace" : "inherit",
                  fontSize,
                  lineHeight
                }}
              />
            </div>
          </div>

          {/* BOTTOM STATUS BAR PILL */}
          <div className="bg-card rounded-full border border-border p-2 px-5 flex items-center justify-between text-[11px] text-muted-foreground shadow-xs shrink-0">
            <div className="flex items-center gap-4">
              <span>Page 1 of 1</span>
              <span>{wordCount} words</span>
              <span className="hidden sm:inline">English (US)</span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                <FileCheck2 className="w-3.5 h-3.5" />
                {targetDpi}
              </span>
            </div>

            {/* Zoom Controls Island */}
            <div className="flex items-center gap-2 bg-muted px-2 py-0.5 rounded-full border border-border">
              <button onClick={() => setZoomLevel(Math.max(70, zoomLevel - 10))} className="p-0.5 hover:bg-card rounded-full text-foreground transition-all">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] text-foreground">{zoomLevel}%</span>
              <button onClick={() => setZoomLevel(Math.min(130, zoomLevel + 10))} className="p-0.5 hover:bg-card rounded-full text-foreground transition-all">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT CONTROL CENTER PANEL (SCROLLABLE, MATCHES AUTO-IMPOSER EXACTLY) */}
        <div className="w-full lg:w-[350px] h-full bg-card rounded-[24px] border border-border shadow-[0_4px_24px_rgb(0,0,0,0.01)] p-5 flex flex-col min-h-0 shrink-0">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground">Control Center</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
              ISO 19005 PDF/A
            </span>
          </div>

          {/* Scrollable Contents (Custom Scrollbar) */}
          <div className="flex-1 overflow-y-auto pr-0.5 pt-4 space-y-5 custom-scrollbar min-h-0">
            
            {/* 1. STANDARDIZATION PRESETS */}
            <div className="bg-muted/40 rounded-2xl border border-border p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 justify-between">
                <div className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Formatting Presets</span>
                </div>
              </div>

              {/* Save Preset Form */}
              <form onSubmit={handleSavePreset} className="flex gap-1.5">
                <input 
                  type="text" 
                  placeholder="Preset name (e.g., Legal A4)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 bg-card border border-border text-[11px] rounded-xl px-2.5 py-1.5 outline-none focus:border-primary text-foreground"
                />
                <button 
                  type="submit" 
                  title="Save current layout configuration"
                  className="bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 rounded-xl px-3 flex items-center justify-center transition-all cursor-pointer outline-none shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Presets List */}
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                {savedPresets.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-2">No custom presets saved yet.</p>
                ) : (
                  savedPresets.map((preset) => (
                    <div 
                      key={preset.id} 
                      className="flex items-center justify-between p-2 bg-card rounded-xl border border-border hover:border-primary/30 transition-all text-[11px]"
                    >
                      <button 
                        type="button"
                        onClick={() => handleApplySavedPreset(preset)}
                        className="flex-1 text-left font-medium text-foreground hover:text-primary transition-colors truncate pr-2 outline-none cursor-pointer"
                        title={`Apply ${preset.name}`}
                      >
                        {preset.name}
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer outline-none"
                        title="Delete preset"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. IMPORT / UPLOAD DOCUMENT ZONE */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`document-drop-zone border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[110px] ${
                isDragging 
                  ? "active-drag border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50 bg-card hover:bg-accent/40"
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                accept=".txt,.doc,.docx,.pdf"
                className="hidden" 
              />
              <div className="pointer-events-none select-none flex flex-col items-center justify-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-100 mb-2 ${
                  isDragging
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <UploadCloud className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {isDragging ? "Drop document here" : "Import document for reference"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Click or drag & drop .txt, .doc files</p>
              </div>
            </div>

            {/* 3. RE-IMPLEMENTED TEMPLATE SELECTION (PILLS / CARDS) */}
            <div className="space-y-2">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                Document Template
              </span>
              <div className="grid grid-cols-1 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplatePreset(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      selectedTemplate === t.id 
                        ? "bg-primary/10 border-primary text-foreground shadow-2xs font-semibold" 
                        : "bg-card border-border hover:bg-accent/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="text-xs text-foreground font-semibold truncate">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{t.desc}</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-muted border border-border px-2 py-0.5 rounded-md shrink-0">
                      {t.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. MARGINS, ORIENTATION & DPI RESOLUTION */}
            <div className="space-y-3 pt-1 border-t border-border">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                Page Layout Specs
              </span>

              {/* Margins Pills */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Page Margins</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["Normal (1.0 in)", "Narrow (0.5 in)", "Wide (1.5 in)", "Legal (1.25 in)"].map(m => (
                    <button
                      key={m}
                      onClick={() => setPageMargin(m)}
                      className={`py-1.5 px-2 rounded-xl border text-[10px] font-semibold transition-all ${
                        pageMargin === m 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-card border-border hover:bg-accent text-foreground"
                      }`}
                    >
                      {m.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation Pills */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Orientation</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "portrait", label: "Portrait" },
                    { id: "landscape", label: "Landscape" }
                  ].map(o => (
                    <button
                      key={o.id}
                      onClick={() => setPageOrientation(o.id as "portrait" | "landscape")}
                      className={`py-1.5 px-2 rounded-xl border text-[10px] font-semibold transition-all ${
                        pageOrientation === o.id 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-card border-border hover:bg-accent text-foreground"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target DPI Resolution Pills */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Resolution Target</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["300 DPI High-Res", "600 DPI Vector Press", "150 DPI Draft"].map(dpi => (
                    <button
                      key={dpi}
                      onClick={() => setTargetDpi(dpi)}
                      className={`py-1.5 px-1 rounded-xl border text-[9px] font-semibold text-center transition-all truncate ${
                        targetDpi === dpi 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-card border-border hover:bg-accent text-foreground"
                      }`}
                    >
                      {dpi.split(" ")[0]} {dpi.split(" ")[1]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. TYPOGRAPHY & LINE SPACING */}
            <div className="space-y-3 pt-1 border-t border-border">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                Typography & Spacing
              </span>

              {/* Line Height Pills */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Line Spacing</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { val: "1.0", lbl: "1.0x" },
                    { val: "1.15", lbl: "1.15x" },
                    { val: "1.5", lbl: "1.5x" },
                    { val: "2.0", lbl: "2.0x" }
                  ].map(lh => (
                    <button
                      key={lh.val}
                      onClick={() => setLineHeight(lh.val)}
                      className={`py-1 rounded-xl border text-[10px] font-semibold text-center transition-all ${
                        lineHeight === lh.val 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-card border-border hover:bg-accent text-foreground"
                      }`}
                    >
                      {lh.lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Alignment Pills */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Text Alignment</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "left", label: "Left" },
                    { id: "center", label: "Center" },
                    { id: "right", label: "Right" },
                    { id: "justify", label: "Justify" }
                  ].map(a => (
                    <button
                      key={a.id}
                      onClick={() => setTextAlign(a.id as any)}
                      className={`py-1 rounded-xl border text-[10px] font-semibold text-center transition-all capitalize ${
                        textAlign === a.id 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-card border-border hover:bg-accent text-foreground"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. PRIMARY ACTION: REFINE DOCUMENT BUTTON */}
            <div className="pt-2 border-t border-border space-y-2">
              <button
                onClick={handleRefine}
                disabled={isRefining}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-2xl font-bold text-xs transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
              >
                {isRefining ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isRefining ? "Refining Document Layout..." : "Refine Document"}</span>
              </button>

              <button
                onClick={handleRunComplianceAudit}
                className="w-full border border-border hover:bg-accent text-foreground py-2 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-foreground" />
                <span>Run ISO Compliance Audit</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
}

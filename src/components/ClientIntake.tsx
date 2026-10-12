import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { 
  QrCode, 
  Printer, 
  Download, 
  Check, 
  User, 
  Building, 
  Phone, 
  Mail, 
  FileCheck, 
  Layers, 
  Sparkles,
  Copy
} from "lucide-react";

interface ClientIntakeProps {
  onLogPrint?: (msg: string) => void;
}

export function ClientIntake({ onLogPrint }: ClientIntakeProps) {
  const [clientName, setClientName] = useState<string>("Samantha Vance");
  const [company, setCompany] = useState<string>("Northwind Creative");
  const [phone, setPhone] = useState<string>("+1 (555) 019-2834");
  const [email, setEmail] = useState<string>("svance@northwind.io");
  const [printType, setPrintType] = useState<string>("Brochures & Flysheets");
  const [paperStock, setPaperStock] = useState<string>("300gsm Silk Matte");
  const [quantity, setQuantity] = useState<number>(250);
  const [urgency, setUrgency] = useState<string>("Standard (24h)");
  const [orderId, setOrderId] = useState<string>("PD-INTAKE-8842");

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [printed, setPrinted] = useState<boolean>(false);

  useEffect(() => {
    const intakePayload = JSON.stringify({
      orderId,
      clientName,
      company,
      phone,
      email,
      printType,
      quantity,
      paperStock,
      timestamp: new Date().toISOString(),
    });

    QRCode.toDataURL(intakePayload, {
      width: 260,
      margin: 1.5,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code error:", err));
  }, [orderId, clientName, company, phone, email, printType, quantity, paperStock]);

  const handleRegenerateId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setOrderId(`PD-INTAKE-${randomNum}`);
  };

  const handleCopyLink = async () => {
    const intakeUrl = `${window.location.origin}/#intake?order=${orderId}`;
    try {
      await navigator.clipboard.writeText(intakeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrintTicket = () => {
    window.print();
    setPrinted(true);
    setTimeout(() => setPrinted(false), 3000);
    if (onLogPrint) {
      onLogPrint(`Printed Client Intake Ticket #${orderId} (${clientName})`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-y-auto custom-scrollbar p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Client Intake & QR Routing
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate instant digital order routing sheets with embedded scannable QR tokens.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied" : "Share Intake Link"}</span>
          </button>

          <button
            onClick={handlePrintTicket}
            className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{printed ? "Sent to Print" : "Print Job Sheet"}</span>
          </button>
        </div>
      </div>

      {/* FORM AND TICKET PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: INTAKE SPEC FORM (7 COLS) */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" />
              Order Intake Details
            </h3>
            <button
              onClick={handleRegenerateId}
              className="text-xs text-muted-foreground hover:text-foreground font-medium underline transition-colors cursor-pointer"
            >
              New Order ID
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Client Full Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Company / Studio</label>
              <div className="relative">
                <Building className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  placeholder="e.g. Design Agency"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Contact Phone</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  placeholder="e.g. +1 555-0100"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  placeholder="e.g. client@domain.com"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Print Category</label>
              <select
                value={printType}
                onChange={(e) => setPrintType(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="Brochures & Flysheets">Brochures & Flysheets</option>
                <option value="Architectural Blueprints">Architectural Blueprints</option>
                <option value="Passport / Visa Photos">Passport / Visa Photos</option>
                <option value="Premium Business Cards">Premium Business Cards</option>
                <option value="Vinyl Banners / Posters">Vinyl Banners / Posters</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Turnaround</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="Standard (24h)">Standard (24h)</option>
                <option value="Express Same-Day (4h)">Express Same-Day (4h)</option>
                <option value="Rush While-You-Wait">Rush While-You-Wait</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Paper Stock / Material</label>
            <input
              type="text"
              value={paperStock}
              onChange={(e) => setPaperStock(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              placeholder="e.g. 300gsm Silk Matte, Uncoated Bond 80gsm"
            />
          </div>
        </div>

        {/* RIGHT: TICKET PREVIEW & LIVE QR (5 COLS) */}
        <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col justify-between" id="printable-intake-ticket">
          <div>
            <div className="flex items-center justify-between border-b border-dashed border-border pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">PrintDesk Mission Control</span>
                <h4 className="font-bold text-base text-foreground mt-0.5">{orderId}</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            {/* QR CODE CONTAINER */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-neutral-200 shadow-inner mb-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Order QR Code" className="w-44 h-44 object-contain" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-neutral-400">
                  Generating QR...
                </div>
              )}
              <span className="text-[10px] font-mono text-neutral-500 mt-2">Scan on intake station</span>
            </div>

            {/* SUMMARY FIELDS */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between border-b border-border/60 pb-1.5">
                <span className="font-medium">Client:</span>
                <span className="font-semibold text-foreground">{clientName || "Unnamed"}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-1.5">
                <span className="font-medium">Specification:</span>
                <span className="font-semibold text-foreground">{printType}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-1.5">
                <span className="font-medium">Stock / Volume:</span>
                <span className="font-semibold text-foreground">{quantity} units ({paperStock})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Turnaround:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{urgency}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-border text-center">
            <p className="text-[10px] text-muted-foreground">
              Scannable with any standard 2D barcode imager or PrintDesk Mobile Companion.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

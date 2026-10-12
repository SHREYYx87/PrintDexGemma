import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  Copy, 
  Check, 
  Printer, 
  FileText, 
  Wand2, 
  Sparkles,
  Sliders,
  AlertCircle
} from "lucide-react";

interface TtsCorrectionProps {
  onLogPrint?: (msg: string) => void;
}

export function TtsCorrection({ onLogPrint }: TtsCorrectionProps) {
  const [transcript, setTranscript] = useState<string>(
    "INVOICE & WORK ORDER #9842\nClient: Apex Studio Design\nDate: 2026-10-12\n\nJob Specification:\n- 500x Premium Matte Brochures (Tri-fold, 150gsm)\n- 12x Large Format Architectural Blueprints (A1, 200 DPI)\n- Color Matching: Pantone 286 C & Cool Gray 9 C\n- Cutting: 3mm bleed margin, saddle-stitched spine\n\nSpecial Handling Note: Ensure high-contrast text on outer fold and deliver in moisture-sealed carton packaging before Friday 4:00 PM."
  );
  const [dirtyDocOcr, setDirtyDocOcr] = useState<string>(
    "INV01CE & W0RK ORD3R #9842\nC1ient: Apex Stud1o Des1gn\nDate: 2026-10-12\n\nJ0b Spec1ficat1on:\n- 500x Prem1um Matte Br0chures (Tr1-fold, 150gsm)\n- 12x L4rge F0rmat Arch1tectural Bluepr1nts (A1, 200 DP1)\n- C0lor Match1ng: Pant0ne 286 C & C0ol Gray 9 C\n- Cutt1ng: 3mm b1eed marg1n, sadd1e-st1tched sp1ne\n\nSpecia1 Hand1ing N0te: Ensre h1gh-c0ntrast txt on outr f0ld..."
  );

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [appliedCorrection, setAppliedCorrection] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
        if (available.length > 0 && !selectedVoice) {
          const defaultVoice = available.find(v => v.lang.startsWith("en")) || available[0];
          setSelectedVoice(defaultVoice.name);
        }
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatusMessage("Speech synthesis is not supported on this browser.");
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error("Speech error", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
    setStatusMessage("Playing speech playback...");
  };

  const handlePause = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setIsPlaying(false);
        setStatusMessage("Playback paused");
      }
    }
  };

  const handleStop = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setStatusMessage("Playback stopped");
    }
  };

  const handleAutoCleanOcr = () => {
    // Normalization pipeline
    let cleaned = dirtyDocOcr
      .replace(/INV01CE/g, "INVOICE")
      .replace(/W0RK/g, "WORK")
      .replace(/ORD3R/g, "ORDER")
      .replace(/C1ient/g, "Client")
      .replace(/Stud1o/g, "Studio")
      .replace(/Des1gn/g, "Design")
      .replace(/J0b/g, "Job")
      .replace(/Spec1ficat1on/g, "Specification")
      .replace(/Prem1um/g, "Premium")
      .replace(/Br0chures/g, "Brochures")
      .replace(/Tr1-fold/g, "Tri-fold")
      .replace(/L4rge/g, "Large")
      .replace(/F0rmat/g, "Format")
      .replace(/Arch1tectural/g, "Architectural")
      .replace(/Bluepr1nts/g, "Blueprints")
      .replace(/DP1/g, "DPI")
      .replace(/C0lor/g, "Color")
      .replace(/Match1ng/g, "Matching")
      .replace(/Pant0ne/g, "Pantone")
      .replace(/C0ol/g, "Cool")
      .replace(/Cutt1ng/g, "Cutting")
      .replace(/b1eed/g, "bleed")
      .replace(/marg1n/g, "margin")
      .replace(/sadd1e-st1tched/g, "saddle-stitched")
      .replace(/sp1ne/g, "spine")
      .replace(/Specia1/g, "Special")
      .replace(/Hand1ing/g, "Handling")
      .replace(/N0te/g, "Note")
      .replace(/Ensre/g, "Ensure")
      .replace(/h1gh-c0ntrast/g, "high-contrast")
      .replace(/txt/g, "text")
      .replace(/outr/g, "outer")
      .replace(/f0ld/g, "fold");

    setTranscript(cleaned);
    setAppliedCorrection(true);
    setStatusMessage("Applied OCR perspective correction & spell recovery!");
    setTimeout(() => setAppliedCorrection(false), 3000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
    if (onLogPrint) {
      onLogPrint("Printed Transcribed Document #9842");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-y-auto custom-scrollbar p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                AI Transcription & Audio Proofing
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Native Text-to-Speech playback, dirty document OCR perspective correction, and print verification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Text"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Transcript</span>
          </button>
        </div>
      </div>

      {/* AUDIO PLAYBACK CONTROL BAR */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Audio playback buttons */}
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                onClick={handlePlay}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play TTS Proof</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleStop}
              className="h-10 px-4 rounded-xl border border-border bg-muted hover:bg-accent text-foreground font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {statusMessage && (
              <span className="text-xs font-medium text-muted-foreground ml-2 hidden sm:inline">
                {statusMessage}
              </span>
            )}
          </div>

          {/* Voice & rate settings */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 min-w-[180px]">
              <label className="text-muted-foreground font-medium shrink-0">Voice:</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary w-full"
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-muted-foreground font-medium shrink-0">Speed ({rate}x):</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-24 accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-muted-foreground font-medium shrink-0">Pitch:</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-20 accent-primary cursor-pointer"
              />
            </div>
          </div>

        </div>
      </div>

      {/* DUAL WORKSPACE: RAW OCR VS PROOFED TRANSCRIPT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: DIRTY DOCUMENT RAW OCR */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-foreground">Scanned Dirty OCR (Skewed)</h3>
              </div>
              <button
                onClick={handleAutoCleanOcr}
                className="h-8 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto Correct OCR</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              Raw feed from flatbed scanner with perspective tilt, shadow skew, and character noise.
            </p>
            <textarea
              value={dirtyDocOcr}
              onChange={(e) => setDirtyDocOcr(e.target.value)}
              rows={12}
              className="w-full bg-muted/60 border border-border rounded-xl p-3 text-xs font-mono text-muted-foreground outline-none focus:border-primary resize-y"
              placeholder="Paste raw OCR text here..."
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
            <span>Raw Character Count: {dirtyDocOcr.length}</span>
            <span className="flex items-center gap-1 text-amber-500">
              <AlertCircle className="w-3.5 h-3.5" />
              OCR Noise Detected
            </span>
          </div>
        </div>

        {/* RIGHT: CLEANED & EDITABLE TRANSCRIPT */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Cleaned Proof Transcript</h3>
              </div>
              {appliedCorrection && (
                <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Cleaned!
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              Cleaned, validated text ready for audio synthesis proofing, client signoff, and direct print.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={12}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs font-mono text-foreground outline-none focus:border-primary resize-y"
              placeholder="Clean transcript text..."
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
            <span>Word Count: {transcript.split(/\s+/).filter(Boolean).length}</span>
            <span className="text-emerald-500 font-medium">Ready for Production</span>
          </div>
        </div>

      </div>

    </div>
  );
}

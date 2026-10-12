import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from "../lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  UploadCloud, 
  Settings, 
  FileText, 
  Layout, 
  Download, 
  RefreshCw, 
  Layers, 
  X, 
  Plus, 
  Minus,
  Trash2, 
  Printer,
  ListPlus,
  Check,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Save,
  Bookmark,
  Lock
} from "lucide-react";

export interface ImageConfig {
  scaleType: "35x45" | "2x2" | "custom" | "original";
  customScaleW: number;
  customScaleH: number;
  cornerRadiusMm: number;
  copies: number;
  rotation: number;
  scalePercent: number;
  copyScales?: number[];
}

const getOriginalCalculatedGrid = (qty: number, aspect: number, size: string, marginEnabled: boolean, marginVal: number) => {
  let sheetW = 320; // default Custom
  let sheetH = 450;
  if (size === "A3") { sheetW = 297; sheetH = 420; }
  if (size === "A4") { sheetW = 210; sheetH = 297; }
  if (size === "Letter") { sheetW = 216; sheetH = 279; }
  
  const currentMargin = marginEnabled ? marginVal : 0;
  const sheetPad = 10;
  const activeW = sheetW - 2 * sheetPad;
  const activeH = sheetH - 2 * sheetPad;
  
  let bestC = 1;
  let bestR = qty;
  let maxArea = 0;
  
  for (let currentC = 1; currentC <= qty; currentC++) {
    const currentR = Math.ceil(qty / currentC);
    const availCellW = (activeW - Math.max(0, currentC - 1) * currentMargin) / currentC;
    const availCellH = (activeH - Math.max(0, currentR - 1) * currentMargin) / currentR;
    
    if (availCellW <= 0 || availCellH <= 0) continue;
    
    let drawW = 0;
    let drawH = 0;
    if (aspect > availCellW / availCellH) {
      drawW = availCellW;
      drawH = availCellW / aspect;
    } else {
      drawH = availCellH;
      drawW = availCellH * aspect;
    }
    
    const area = drawW * drawH;
    if (area > maxArea) {
      maxArea = area;
      bestC = currentC;
      bestR = currentR;
    }
  }
  
  return { cols: bestC, rows: bestR };
};

export function AutoImposer({ initialFile, onLogPrint }: { initialFile?: File | null; onLogPrint?: (msg: string) => void }) {
  // Firebase Preset states
  const [user, setUser] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setPresets([]);
      return;
    }

    const presetsColRef = collection(db, "users", user.uid, "presets");
    const q = query(presetsColRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() });
      });
      setPresets(loaded);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/presets`);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || !user) return;

    const presetId = doc(collection(db, "users", user.uid, "presets")).id;
    try {
      await setDoc(doc(db, "users", user.uid, "presets", presetId), {
        id: presetId,
        name: newPresetName.trim(),
        layoutType,
        sheetSize,
        hasMargin,
        marginMm,
        cornerRadiusMm,
        photoScaleType,
        customScaleW,
        customScaleH,
        slotCopies,
        slotRotation,
        slotScalePercent,
        createdAt: serverTimestamp(),
      });
      setNewPresetName("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/presets/${presetId}`);
    }
  };

  const handleApplyPreset = (preset: any) => {
    if (preset.layoutType) setLayoutType(preset.layoutType);
    if (preset.sheetSize) setSheetSize(preset.sheetSize);
    if (preset.hasMargin !== undefined) setHasMargin(preset.hasMargin);
    if (preset.marginMm !== undefined) setMarginMm(preset.marginMm);
    if (preset.cornerRadiusMm !== undefined) setCornerRadiusMm(preset.cornerRadiusMm);
    if (preset.photoScaleType) setPhotoScaleType(preset.photoScaleType);
    if (preset.customScaleW !== undefined) setCustomScaleW(preset.customScaleW);
    if (preset.customScaleH !== undefined) setCustomScaleH(preset.customScaleH);
    if (preset.slotCopies !== undefined) setSlotCopies(preset.slotCopies);
    if (preset.slotRotation !== undefined) setSlotRotation(preset.slotRotation);
    if (preset.slotScalePercent !== undefined) setSlotScalePercent(preset.slotScalePercent);
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "presets", presetId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/presets/${presetId}`);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  // Support multiple photos
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [layoutType, setLayoutType] = useState<"passport-max" | "custom-grid" | "original">("passport-max");

  const [detectedAspect, setDetectedAspect] = useState<number>(35 / 45);
  const [isQueued, setIsQueued] = useState<boolean>(false);

  const handleQueue = () => {
    setIsQueued(true);
    setTimeout(() => setIsQueued(false), 2500);
  };
  
  const [marchingAnts, setMarchingAnts] = useState<boolean>(true);
  const [hasMargin, setHasMargin] = useState<boolean>(true);
  const [marginMm, setMarginMm] = useState<number>(5);
  const [cornerRadiusMm, setCornerRadiusMm] = useState<number>(5); // defaults to 5mm (~24px equivalent grid corner rounding)
  const [customRows, setCustomRows] = useState<number>(2);
  const [customCols, setCustomCols] = useState<number>(2);
  const [sheetSize, setSheetSize] = useState<string>("A3");
  
   const [photoScaleType, setPhotoScaleType] = useState<"35x45" | "2x2" | "custom" | "original">("35x45");
  const [customScaleW, setCustomScaleW] = useState<number>(35);
  const [customScaleH, setCustomScaleH] = useState<number>(45);
  const [slotCopies, setSlotCopies] = useState<number>(1);
  const [slotRotation, setSlotRotation] = useState<number>(0);
  const [slotScalePercent, setSlotScalePercent] = useState<number>(100);
  const [slotCopyScales, setSlotCopyScales] = useState<number[]>([]);

  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);

  // Expanded Layout settings state
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [selectedImgIdx, setSelectedImgIdx] = useState<number>(0);
  
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showZoomToast, setShowZoomToast] = useState<boolean>(false);
  const zoomToastTimerRef = useRef<any>(null);

  const updateZoom = (val: number) => {
    setZoomLevel(val);
    setShowZoomToast(true);
    if (zoomToastTimerRef.current) clearTimeout(zoomToastTimerRef.current);
    zoomToastTimerRef.current = setTimeout(() => {
      setShowZoomToast(false);
    }, 2000);
  };

  // Drag-to-zoom interactive gesture
  const [isDragZooming, setIsDragZooming] = useState<boolean>(false);
  const [dragZoomLevel, setDragZoomLevel] = useState<number>(100);
  const [dragZoomOrigin, setDragZoomOrigin] = useState<string>("center center");
  
  const dragContainerRef = useRef<HTMLDivElement>(null);
  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialZoomRef = useRef<number>(100);

  const handleDragZoomStart = (e: React.MouseEvent<HTMLDivElement>) => {
    // Left-click only
    if (e.button !== 0) return;
    
    const rect = zoomTargetRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialZoomRef.current = zoomLevel;
    
    // Clamp pctX and pctY between 0% and 100% to keep origin inside the actual sheet preview
    const pctX = Math.min(100, Math.max(0, (x / rect.width) * 100));
    const pctY = Math.min(100, Math.max(0, (y / rect.height) * 100));
    
    setDragZoomOrigin(`${pctX}% ${pctY}%`);
    setDragZoomLevel(zoomLevel);
    setIsDragZooming(true);
    
    // Prevent default browser drags
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragZooming) return;

    const handleGlobalMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      
      const startY = dragStartRef.current.y;
      const currentY = e.clientY;
      const deltaY = currentY - startY;
      
      // Scale factor: dragging down zooms in, dragging up zooms out. Range is strictly 25% to 800% for drag-zooming.
      const scaleFactor = 3.5;
      const calculatedZoom = Math.min(800, Math.max(25, initialZoomRef.current + deltaY * scaleFactor));
      const roundedZoom = parseFloat(calculatedZoom.toFixed(1));
      
      setDragZoomLevel(roundedZoom);
    };

    const handleGlobalUp = () => {
      setIsDragZooming(false);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
    };
  }, [isDragZooming]);
  
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  
  const [imageConfigs, setImageConfigs] = useState<Array<{
    scaleType: "35x45" | "2x2" | "custom" | "original";
    customScaleW: number;
    customScaleH: number;
    cornerRadiusMm: number;
    copies: number;
    rotation: number;
    scalePercent: number;
    copyScales?: number[];
  }>>([
    { scaleType: "35x45", customScaleW: 35, customScaleH: 45, cornerRadiusMm: 5, copies: 1, rotation: 0, scalePercent: 100, copyScales: [] },
  ]);

  const calculatedAutoColsRef = useRef<number>(6);
  const calculatedAutoRowsRef = useRef<number>(8);

  const originalGrid = getOriginalCalculatedGrid(
    Math.max(1, previewUrls.length),
    detectedAspect,
    sheetSize,
    hasMargin,
    marginMm
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize initial file if provided
  useEffect(() => {
    if (initialFile) {
      setSelectedFiles([initialFile]);
    }
  }, [initialFile]);

  // Manage object URLs for multiple preview streams
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  // Synchronize dynamic configurations with loaded images size
  useEffect(() => {
    const targetLength = Math.max(1, previewUrls.length);

    setImageConfigs(prev => {
      if (prev.length === targetLength) return prev;
      if (prev.length < targetLength) {
        const next = [...prev];
        while (next.length < targetLength) {
          next.push({ scaleType: "35x45", customScaleW: 35, customScaleH: 45, cornerRadiusMm: cornerRadiusMm, copies: 1, rotation: 0, scalePercent: 100 });
        }
        return next;
      } else {
        return prev.slice(0, targetLength);
      }
    });

    if (selectedImgIdx >= targetLength) {
      setSelectedImgIdx(0);
    }
  }, [previewUrls.length]);

  // Calculated maximums for custom grid
  const [maxRows, setMaxRows] = useState<number>(20);
  const [maxCols, setMaxCols] = useState<number>(20);

  // Auto-calculate maximum possible custom grid dimensions
  useEffect(() => {
    let sW = 320; let sH = 450;
    if (sheetSize === "A3") { sW = 297; sH = 420; }
    if (sheetSize === "A4") { sW = 210; sH = 297; }
    if (sheetSize === "Letter") { sW = 216; sH = 279; }
    
    const m = hasMargin ? marginMm : 0;
    const p = 10; // Internal padding
    
    // Use the slotScalePercent or current config
    const sc = slotScalePercent / 100;
    
    let pw = 35; let ph = 45;
    if (photoScaleType === "2x2") { pw = 50.8; ph = 50.8; }
    else if (photoScaleType === "custom") { pw = customScaleW; ph = customScaleH; }
    else if (photoScaleType === "original") {
      const selectedImgAspect = detectedAspect || (35 / 45);
      ph = 45;
      pw = 45 * selectedImgAspect;
    }

    const scaledW = pw * sc;
    const scaledH = ph * sc;

    const limitCols = Math.floor((sW - 2 * p + m) / (scaledW + m));
    const limitRows = Math.floor((sH - 2 * p + m) / (scaledH + m));
    
    setMaxCols(Math.max(1, limitCols));
    setMaxRows(Math.max(1, limitRows));

    // Clamp current values if they exceed new limits
    if (layoutType === "custom-grid") {
      setCustomCols(prev => Math.min(prev, Math.max(1, limitCols)));
      setCustomRows(prev => Math.min(prev, Math.max(1, limitRows)));
    }
  }, [sheetSize, marginMm, hasMargin, slotScalePercent, photoScaleType, customScaleW, customScaleH]);

  useEffect(() => {
    if (layoutType === "custom-grid") {
      // Set to max by default when switching or scaling, but allowing manual override later
      setCustomCols(maxCols);
      setCustomRows(maxRows);
    }
  }, [layoutType, maxCols, maxRows]);

  // Helper for smart flow-based packing
  const getSmartPackedLayout = (
    seq: Array<{ slotIndex: number; imgElement: HTMLImageElement | null; config: ImageConfig }>,
    sheetW: number,
    sheetH: number,
    margin: number,
    padding: number,
    isCustomGridValue?: boolean,
    gridColsValue?: number,
    gridRowsValue?: number
  ) => {
    const activeW = sheetW - 2 * padding;
    const activeH = sheetH - 2 * padding;
    const result: Array<{
      x: number; y: number; w: number; h: number;
      slotIndex: number; config: ImageConfig; imgElement: HTMLImageElement | null;
      adaptiveScale: number;
    }> = [];

    if (layoutType === "original") {
      const qty = seq.length;
      if (qty === 0) return [];

      let aspect = detectedAspect || (35 / 45);
      if (seq[0] && seq[0].imgElement) {
        aspect = seq[0].imgElement.width / seq[0].imgElement.height;
      }

      // Find the best columns/rows count using the helper
      const { cols, rows } = getOriginalCalculatedGrid(qty, aspect, sheetSize, hasMargin, marginMm);

      const availCellW = (activeW - (cols - 1) * margin) / cols;
      const availCellH = (activeH - (rows - 1) * margin) / rows;

      // Base original cell aspect ratio width & height
      let cellDrawW = 0;
      let cellDrawH = 0;
      if (aspect > availCellW / availCellH) {
        cellDrawW = availCellW;
        cellDrawH = availCellW / aspect;
      } else {
        cellDrawH = availCellH;
        cellDrawW = availCellH * aspect;
      }

      const totalGridW = cols * cellDrawW + (cols - 1) * margin;
      const totalGridH = rows * cellDrawH + (rows - 1) * margin;

      const startX = padding + (activeW - totalGridW) / 2;
      const startY = padding + (activeH - totalGridH) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (idx >= seq.length) break;

          const item = seq[idx];
          const sc = (item.config.scalePercent ?? 100) / 100;

          let itemAspect = aspect;
          if (item.imgElement) {
            itemAspect = item.imgElement.width / item.imgElement.height;
          }

          const rotationAngle = item.config.rotation ?? 0;
          let effectiveAspect = itemAspect;
          if (rotationAngle % 180 !== 0) {
            effectiveAspect = 1 / itemAspect;
          }

          let drawW = 0;
          let drawH = 0;
          if (effectiveAspect > availCellW / availCellH) {
            drawW = availCellW;
            drawH = availCellW / effectiveAspect;
          } else {
            drawH = availCellH;
            drawW = availCellH * effectiveAspect;
          }

          drawW *= sc;
          drawH *= sc;

          const cellX = startX + c * (cellDrawW + margin) + (cellDrawW - drawW) / 2;
          const cellY = startY + r * (cellDrawH + margin) + (cellDrawH - drawH) / 2;

          result.push({
            x: cellX, y: cellY, w: drawW, h: drawH,
            slotIndex: item.slotIndex, config: item.config, imgElement: item.imgElement,
            adaptiveScale: sc
          });
        }
      }
      return result;
    }

    if (isCustomGridValue) {
      // Fixed grid for custom mode
      const cols = gridColsValue || 1;
      const rows = gridRowsValue || 1;
      
      const colWidths = Array(cols).fill(0);
      const rowHeights = Array(rows).fill(0);

      // Pass 1: Find row/col max dimensions
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const item = seq[idx % seq.length];
          const sc = (item.config.scalePercent ?? 100) / 100;
          let pw = 35; let ph = 45;
          if (item.config.scaleType === "2x2") { pw = 50.8; ph = 50.8; }
          else if (item.config.scaleType === "custom") { pw = item.config.customScaleW; ph = item.config.customScaleH; }
          else if (item.config.scaleType === "original") {
            const itemAspect = item.imgElement ? item.imgElement.width / item.imgElement.height : (35 / 45);
            ph = 45;
            pw = 45 * itemAspect;
          }
          
          if ((item.config.rotation ?? 0) % 180 !== 0) { const t = pw; pw = ph; ph = t; }
          colWidths[c] = Math.max(colWidths[c], pw * sc);
          rowHeights[r] = Math.max(rowHeights[r], ph * sc);
        }
      }

      const totalGridW = colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * margin;
      const totalGridH = rowHeights.reduce((a, b) => a + b, 0) + (rows - 1) * margin;
      
      const startX = padding + (activeW - totalGridW) / 2;
      const startY = padding + (activeH - totalGridH) / 2;

      let curY = startY;
      for (let r = 0; r < rows; r++) {
        let curX = startX;
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const item = seq[idx % seq.length];
          const sc = (item.config.scalePercent ?? 100) / 100;
          let pw = 35; let ph = 45;
          if (item.config.scaleType === "2x2") { pw = 50.8; ph = 50.8; }
          else if (item.config.scaleType === "custom") { pw = item.config.customScaleW; ph = item.config.customScaleH; }
          else if (item.config.scaleType === "original") {
            const itemAspect = item.imgElement ? item.imgElement.width / item.imgElement.height : (35 / 45);
            ph = 45;
            pw = 45 * itemAspect;
          }
          if ((item.config.rotation ?? 0) % 180 !== 0) { const t = pw; pw = ph; ph = t; }
          
          const drawW = pw * sc;
          const drawH = ph * sc;
          
          // Center item in cell
          const cellX = curX + (colWidths[c] - drawW) / 2;
          const cellY = curY + (rowHeights[r] - drawH) / 2;

          result.push({
            x: cellX, y: cellY, w: drawW, h: drawH,
            slotIndex: item.slotIndex, config: item.config, imgElement: item.imgElement,
            adaptiveScale: 1
          });
          curX += colWidths[c] + margin;
        }
        curY += rowHeights[r] + margin;
      }
      return result;
    }

    // Flow packing for others
    let currentY = padding;
    let seqIdx = 0;

    while (seqIdx < seq.length) {
      const rowItems: any[] = [];
      let rowW = 0;

      // Packing logic with adaptive scaling
      while (seqIdx < seq.length) {
        const item = seq[seqIdx];
        const sc = (item.config.scalePercent ?? 100) / 100;
        let pw = 35; let ph = 45;
        if (item.config.scaleType === "2x2") { pw = 50.8; ph = 50.8; }
        else if (item.config.scaleType === "custom") { pw = item.config.customScaleW; ph = item.config.customScaleH; }
        else if (item.config.scaleType === "original") {
          const itemAspect = item.imgElement ? item.imgElement.width / item.imgElement.height : (35 / 45);
          ph = 45;
          pw = 45 * itemAspect;
        }
        if ((item.config.rotation ?? 0) % 180 !== 0) { const t = pw; pw = ph; ph = t; }

        const itemW = pw * sc;
        const itemH = ph * sc;

        const potentialW = rowW + (rowItems.length > 0 ? margin : 0) + itemW;
        
        if (potentialW <= activeW) {
          rowItems.push({ ...item, itemW, itemH, baseW: itemW, baseH: itemH, adaptiveScale: 1 });
          rowW = potentialW;
          seqIdx++;
          // In passport-max, if we have limited slots, we might loop. 
          // But seq already has all copies.
        } else {
          // Flow: try scaling down existing row items + this one to fit one more?
          // User: "change their scaling at minimum 80%"
          const rowWithNewW = potentialW;
          const scaleToFit80 = activeW / rowWithNewW;
          if (scaleToFit80 >= 0.8) {
            // Apply adaptive scale to all on this row
            rowItems.push({ ...item, itemW, itemH, baseW: itemW, baseH: itemH, adaptiveScale: 1 });
            rowItems.forEach(ri => {
              ri.adaptiveScale = scaleToFit80;
              ri.itemW = ri.baseW * scaleToFit80;
              ri.itemH = ri.baseH * scaleToFit80;
            });
            seqIdx++;
            break; // row filled by scaling
          } else {
            break; // item moves to next row
          }
        }
      }

      if (rowItems.length === 0 && seqIdx < seq.length) {
        // Single item overflows row even when alone - scale it to fit or move on
        const item = seq[seqIdx];
        const sc = (item.config.scalePercent ?? 100) / 100;
        let pw = 35; let ph = 45;
        if (item.config.scaleType === "2x2") { pw = 50.8; ph = 50.8; }
        else if (item.config.scaleType === "custom") { pw = item.config.customScaleW; ph = item.config.customScaleH; }
        else if (item.config.scaleType === "original") {
          const itemAspect = item.imgElement ? item.imgElement.width / item.imgElement.height : (35 / 45);
          ph = 45;
          pw = 45 * itemAspect;
        }
        if ((item.config.rotation ?? 0) % 180 !== 0) { const t = pw; pw = ph; ph = t; }
        
        const itemW = pw * sc;
        const itemH = ph * sc;
        const scaleToFit = activeW / itemW;
        const finalScale = Math.max(0.5, scaleToFit); // limit
        rowItems.push({ ...item, itemW: itemW * finalScale, itemH: itemH * finalScale, adaptiveScale: finalScale });
        seqIdx++;
      }

      const rowMaxH = rowItems.reduce((max, it) => Math.max(max, it.itemH), 0);
      if (currentY + rowMaxH > activeH + padding) break; // Overflow height -> done

      const finalRowW = rowItems.reduce((s, it, i) => s + it.itemW + (i > 0 ? margin : 0), 0);
      let curX = padding + (activeW - finalRowW) / 2;

      rowItems.forEach(item => {
        result.push({
          x: curX, y: currentY, w: item.itemW, h: item.itemH,
          slotIndex: item.slotIndex, config: item.config, imgElement: item.imgElement,
          adaptiveScale: item.adaptiveScale
        });
        curX += item.itemW + margin;
      });
      
      currentY += rowMaxH + margin;
    }

    return result;
  };

  const clearAllPhotos = () => {
    setSelectedFiles([]);
    setLivePreviewUrl(null);
    setSelectedImgIdx(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle slot/photo selection and load stored properties
  const handleSelectImgIdx = (idx: number) => {
    setSelectedImgIdx(idx);
    const config = imageConfigs[idx] || { scaleType: "35x45", customScaleW: 35, customScaleH: 45, cornerRadiusMm: 5, copies: 1, rotation: 0, scalePercent: 100, copyScales: [] };
    setPhotoScaleType(config.scaleType);
    setCustomScaleW(config.customScaleW);
    setCustomScaleH(config.customScaleH);
    setCornerRadiusMm(config.cornerRadiusMm ?? 5);
    setSlotCopies(config.copies ?? 1);
    setSlotRotation(config.rotation ?? 0);
    setSlotScalePercent(config.scalePercent ?? 100);
    setSlotCopyScales(config.copyScales ?? Array(config.copies ?? 1).fill(100));
  };

  const handleApplyToAllChange = (checked: boolean) => {
    setApplyToAll(checked);
    if (checked) {
      setImageConfigs(prev => prev.map(cfg => ({
        ...cfg,
        scaleType: photoScaleType,
        customScaleW: customScaleW,
        customScaleH: customScaleH,
        cornerRadiusMm: cornerRadiusMm,
        copies: slotCopies,
        rotation: slotRotation,
        scalePercent: slotScalePercent,
        copyScales: [...slotCopyScales],
      })));
    }
  };

  const updateScaleType = (scale: "35x45" | "2x2" | "custom" | "original") => {
    setPhotoScaleType(scale);
    setImageConfigs(prev => {
      const next = [...prev];
      if (applyToAll) {
        return next.map(cfg => ({ ...cfg, scaleType: scale }));
      } else {
        if (next[selectedImgIdx]) {
          next[selectedImgIdx] = { ...next[selectedImgIdx], scaleType: scale };
        }
        return next;
      }
    });
  };

  const updateCustomScaleW = (val: number) => {
    setCustomScaleW(val);
    setImageConfigs(prev => {
      const next = [...prev];
      if (applyToAll) {
        return next.map(cfg => ({ ...cfg, customScaleW: val }));
      } else {
        if (next[selectedImgIdx]) {
          next[selectedImgIdx] = { ...next[selectedImgIdx], customScaleW: val };
        }
        return next;
      }
    });
  };

  const updateCustomScaleH = (val: number) => {
    setCustomScaleH(val);
    setImageConfigs(prev => {
      const next = [...prev];
      if (applyToAll) {
        return next.map(cfg => ({ ...cfg, customScaleH: val }));
      } else {
        if (next[selectedImgIdx]) {
          next[selectedImgIdx] = { ...next[selectedImgIdx], customScaleH: val };
        }
        return next;
      }
    });
  };

  const updateCornerRadius = (val: number) => {
    setCornerRadiusMm(val);
    setImageConfigs(prev => {
      const next = [...prev];
      if (applyToAll) {
        return next.map(cfg => ({ ...cfg, cornerRadiusMm: val }));
      } else {
        if (next[selectedImgIdx]) {
          next[selectedImgIdx] = { ...next[selectedImgIdx], cornerRadiusMm: val };
        }
        return next;
      }
    });
  };

  const updateCopies = (val: number) => {
    setSlotCopies(val);
    setImageConfigs(prev => {
      const next = [...prev];
      if (applyToAll) {
        return next.map(cfg => {
          const existing = cfg.copyScales || [];
          const updated = Array(val).fill(0).map((_, i) => existing[i] !== undefined ? existing[i] : (cfg.scalePercent ?? 100));
          return { ...cfg, copies: val, copyScales: updated };
        });
      } else {
        if (next[selectedImgIdx]) {
          const cfg = next[selectedImgIdx];
          
          // Apply copy locking logic if in custom-grid mode
          let finalVal = val;
          if (layoutType === "custom-grid" && !applyToAll) {
            const totalSlots = customRows * customCols;
            const otherCopies = prev.reduce((sum, it, idx) => {
              if (idx === selectedImgIdx) return sum;
              return sum + (it.copies || 1);
            }, 0);
            const maxAllowed = Math.max(1, totalSlots - otherCopies);
            if (val > maxAllowed) {
              finalVal = maxAllowed;
            }
          }
          
          const existing = cfg.copyScales || [];
          const updated = Array(finalVal).fill(0).map((_, i) => existing[i] !== undefined ? existing[i] : (cfg.scalePercent ?? 100));
          next[selectedImgIdx] = { ...cfg, copies: finalVal, copyScales: updated };
          setSlotCopyScales(updated);
          setSlotCopies(finalVal);
        }
        return next;
      }
    });
  };

  const updateRotation = (val: number) => {
    setSlotRotation(val);
    setImageConfigs(prev => {
      const next = [...prev];
      if (applyToAll) {
        return next.map(cfg => ({ ...cfg, rotation: val }));
      } else {
        if (next[selectedImgIdx]) {
          next[selectedImgIdx] = { ...next[selectedImgIdx], rotation: val };
        }
        return next;
      }
    });
  };

  const updateScalePercent = (val: number) => {
    setSlotScalePercent(val);
    setImageConfigs(prev => {
      const next = [...prev];
      if (applyToAll || layoutType === "custom-grid") {
        return next.map(cfg => ({ ...cfg, scalePercent: val }));
      } else {
        if (next[selectedImgIdx]) {
          next[selectedImgIdx] = { ...next[selectedImgIdx], scalePercent: val };
        }
        return next;
      }
    });
  };

  const updateIndividualCopyScale = (copyIdx: number, val: number) => {
    setSlotCopyScales(prev => {
      const nextArr = [...prev];
      while (nextArr.length <= copyIdx) {
        nextArr.push(100);
      }
      nextArr[copyIdx] = val;
      return nextArr;
    });

    setImageConfigs(prev => {
      const next = [...prev];
      if (applyToAll) {
        return next.map(cfg => {
          const arr = [...(cfg.copyScales || Array(cfg.copies).fill(100))];
          while (arr.length <= copyIdx) {
            arr.push(100);
          }
          arr[copyIdx] = val;
          return { ...cfg, copyScales: arr };
        });
      } else {
        if (next[selectedImgIdx]) {
          const cfg = next[selectedImgIdx];
          const arr = [...(cfg.copyScales || Array(cfg.copies).fill(100))];
          while (arr.length <= copyIdx) {
            arr.push(100);
          }
          arr[copyIdx] = val;
          next[selectedImgIdx] = { ...cfg, copyScales: arr };
        }
        return next;
      }
    });
  };

  const handleLayoutTypeChange = (newType: "passport-max" | "custom-grid" | "original") => {
    // Reset all scales when changing imposition to prevent layout breakage
    setSlotScalePercent(100);
    setSlotCopyScales([]);
    if (newType === "original") {
      setPhotoScaleType("original");
      setImageConfigs(prev => prev.map(cfg => ({ 
        ...cfg, 
        scalePercent: 100, 
        copyScales: [],
        scaleType: "original"
      })));
    } else {
      setImageConfigs(prev => prev.map(cfg => ({ 
        ...cfg, 
        scalePercent: 100, 
        copyScales: [] // Use empty as default
      })));
    }

    if (newType === "custom-grid" || newType === "passport-max") {
      setCustomCols(maxCols);
      setCustomRows(maxRows);
    }
    setLayoutType(newType);
  };

  // Load all images cleanly
  const loadGalleryImages = async (urls: string[]): Promise<HTMLImageElement[]> => {
    const promises = urls.map(url => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image failed loading"));
      });
    });
    const results = await Promise.allSettled(promises);
    return results
      .filter((r): r is PromiseFulfilledResult<HTMLImageElement> => r.status === "fulfilled")
      .map(r => r.value);
  };

  // Safe round rectangle drawing path
  const drawRoundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Live Canvas Generator
  useEffect(() => {
    if (selectedFiles.length === 0 || previewUrls.length === 0) {
      setLivePreviewUrl(null);
      return;
    }

    let active = true;
    setIsGeneratingPreview(true);

    const render = async () => {
      try {
        let sheetW = 320;
        let sheetH = 450;
        if (sheetSize === "A3") { sheetW = 297; sheetH = 420; }
        if (sheetSize === "A4") { sheetW = 210; sheetH = 297; }
        if (sheetSize === "Letter") { sheetW = 216; sheetH = 279; }

        const loadedImgElements = await loadGalleryImages(previewUrls);
        if (!active) return;

        let r = customRows;
        let c = customCols;

        let photoW = 35;
        let photoH = 45;
        if (photoScaleType === "2x2") { photoW = 50.8; photoH = 50.8; }
        else if (photoScaleType === "custom") { photoW = Math.max(1, customScaleW); photoH = Math.max(1, customScaleH); }
        else if (photoScaleType === "original") {
          const aspect = (loadedImgElements && loadedImgElements[0]) ? loadedImgElements[0].width / loadedImgElements[0].height : detectedAspect;
          photoH = 45;
          photoW = 45 * aspect;
        }

        const currentMarginMm = hasMargin ? marginMm : 0;
        const sheetPadMm = 10;

        if (loadedImgElements.length > 0) {
          const aspect = loadedImgElements[0].width / loadedImgElements[0].height;
          if (Math.abs(detectedAspect - aspect) > 0.001) {
            setDetectedAspect(aspect);
          }
        }

        // Construct the sequence of slot draws based on copies count
        let slotSequence: Array<{
          slotIndex: number;
          imgElement: HTMLImageElement | null;
          config: typeof imageConfigs[0];
        }> = [];

        const targetLength = Math.max(1, previewUrls.length);

        for (let i = 0; i < targetLength; i++) {
          const config = imageConfigs[i] || { scaleType: "35x45", customScaleW: 35, customScaleH: 45, cornerRadiusMm: 5, copies: 1, rotation: 0, scalePercent: 100, copyScales: [] };
          const imgElement = loadedImgElements.length > 0 ? loadedImgElements[i % loadedImgElements.length] : null;
          const numCopies = Math.max(1, config.copies ?? 1);
          const copyScales = config.copyScales || [];
          for (let cpy = 0; cpy < numCopies; cpy++) {
            const indScale = copyScales[cpy] !== undefined ? copyScales[cpy] : (config.scalePercent ?? 100);
            slotSequence.push({
              slotIndex: i,
              imgElement,
              config: {
                ...config,
                scalePercent: indScale
              },
            });
          }
        }

        // If layoutType is passport-max (Auto Fill), fill the entire grid up to capacity
        if (layoutType === "passport-max" && slotSequence.length > 0) {
          const capacity = customCols * customRows;
          const baseSequence = [...slotSequence];
          while (slotSequence.length < capacity) {
            const indexToCopy = slotSequence.length % baseSequence.length;
            slotSequence.push(baseSequence[indexToCopy]);
          }
          slotSequence = slotSequence.slice(0, capacity);
        }

        const itemsToDraw = getSmartPackedLayout(
          slotSequence,
          sheetW,
          sheetH,
          currentMarginMm,
          sheetPadMm,
          layoutType === "custom-grid" || layoutType === "passport-max",
          customCols,
          customRows
        );

        const scale = 4; // screen resolution scale
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(sheetW * scale);
        canvas.height = Math.round(sheetH * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        itemsToDraw.forEach((item) => {
          const { x, y, w, h, config, imgElement } = item;
          const drawX = x * scale;
          const drawY = y * scale;
          const drawW = w * scale;
          const drawH = h * scale;

          ctx.save();
          
          const activeCornerRadius = typeof config.cornerRadiusMm === "number" ? config.cornerRadiusMm : cornerRadiusMm;
          if (activeCornerRadius > 0) {
            const rPx = Math.min(activeCornerRadius * scale, drawW / 2, drawH / 2);
            drawRoundRectPath(ctx, drawX, drawY, drawW, drawH, rPx);
            ctx.clip();
          }

          if (imgElement) {
            ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
            ctx.rotate(((config.rotation ?? 0) * Math.PI) / 180);
            ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
          } else {
            ctx.fillStyle = "#f3f4f6";
            ctx.fillRect(drawX, drawY, drawW, drawH);
            ctx.strokeStyle = "#d1d5db";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(drawX, drawY, drawW, drawH);
          }
          ctx.restore();

          // Draw marching ants (cutting guides) overlapping the boundary of the image slot (exactly centered between images)
          if (marchingAnts) {
            ctx.save();
            ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
            ctx.rotate(((config.rotation ?? 0) * Math.PI) / 180);
            ctx.strokeStyle = "#4b5563"; // Deep neutral grey/black for cutting guidelines
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]); // Dashed line for marching ants cutting guide
            const offset = (currentMarginMm * scale) / 2;
            ctx.strokeRect(-drawW / 2 - offset, -drawH / 2 - offset, drawW + 2 * offset, drawH + 2 * offset);
            ctx.restore();
          }
        });
        if (active) {
          setLivePreviewUrl(canvas.toDataURL("image/jpeg", 0.9));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) {
          setIsGeneratingPreview(false);
        }
      }
    };

    render();

    return () => {
      active = false;
    };
  }, [
    selectedFiles,
    previewUrls,
    sheetSize,
    layoutType,
    photoScaleType,
    customScaleW,
    customScaleH,
    hasMargin,
    marginMm,
    customRows,
    customCols,
    marchingAnts,
    cornerRadiusMm,
    imageConfigs,
    selectedImgIdx
  ]);

  const [isDraggingUpload, setIsDraggingUpload] = useState<boolean>(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDraggingUpload) setIsDraggingUpload(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingUpload(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingUpload(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const incoming = Array.from(e.dataTransfer.files).filter((file: File) => 
        file.type.includes("image") || file.type.includes("pdf") || /\.(png|jpe?g|webp|gif|svg|pdf)$/i.test(file.name)
      );
      if (incoming.length > 0) {
        setSelectedFiles(prev => [...prev, ...incoming]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const incoming = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...incoming]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const downloadOutput = async () => {
    if (selectedFiles.length === 0 || previewUrls.length === 0) return;

    setIsProcessing(true);

    try {
      let sheetW = 320;
      let sheetH = 450;
      if (sheetSize === "A3") { sheetW = 297; sheetH = 420; }
      if (sheetSize === "A4") { sheetW = 210; sheetH = 297; }
      if (sheetSize === "Letter") { sheetW = 216; sheetH = 279; }

      const loadedImgElements = await loadGalleryImages(previewUrls);

      let r = customRows;
      let c = customCols;

      let photoW = 35;
      let photoH = 45;
      if (photoScaleType === "2x2") { photoW = 50.8; photoH = 50.8; }
      else if (photoScaleType === "custom") { photoW = Math.max(1, customScaleW); photoH = Math.max(1, customScaleH); }
      else if (photoScaleType === "original") {
        const aspect = (loadedImgElements && loadedImgElements[0]) ? loadedImgElements[0].width / loadedImgElements[0].height : detectedAspect;
        photoH = 45;
        photoW = 45 * aspect;
      }

      const currentMarginMm = hasMargin ? marginMm : 0;
      const sheetPadMm = 10;

      // Construct the sequence of slot draws based on copies count
      let slotSequence: Array<{
        slotIndex: number;
        imgElement: HTMLImageElement | null;
        config: typeof imageConfigs[0];
      }> = [];

      const targetLength = Math.max(1, previewUrls.length);

      for (let i = 0; i < targetLength; i++) {
        const config = imageConfigs[i] || { scaleType: "35x45", customScaleW: 35, customScaleH: 45, cornerRadiusMm: 5, copies: 1, rotation: 0, scalePercent: 100, copyScales: [] };
        const imgElement = loadedImgElements.length > 0 ? loadedImgElements[i % loadedImgElements.length] : null;
        const numCopies = Math.max(1, config.copies ?? 1);
        const copyScales = config.copyScales || [];
        for (let cpy = 0; cpy < numCopies; cpy++) {
          const indScale = copyScales[cpy] !== undefined ? copyScales[cpy] : (config.scalePercent ?? 100);
          slotSequence.push({
            slotIndex: i,
            imgElement,
            config: {
              ...config,
              scalePercent: indScale
            },
          });
        }
      }

      // If layoutType is passport-max (Auto Fill), fill the entire grid up to capacity
      if (layoutType === "passport-max" && slotSequence.length > 0) {
        const capacity = customCols * customRows;
        const baseSequence = [...slotSequence];
        while (slotSequence.length < capacity) {
          const indexToCopy = slotSequence.length % baseSequence.length;
          slotSequence.push(baseSequence[indexToCopy]);
        }
        slotSequence = slotSequence.slice(0, capacity);
      }

      const itemsToDraw = getSmartPackedLayout(
        slotSequence,
        sheetW,
        sheetH,
        currentMarginMm,
        sheetPadMm,
        layoutType === "custom-grid" || layoutType === "passport-max",
        customCols,
        customRows
      );

      const scale = 11.811; // ~300 DPI high-res scale
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sheetW * scale);
      canvas.height = Math.round(sheetH * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2d context");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      itemsToDraw.forEach((item) => {
        const { x, y, w, h, config, imgElement } = item;
        const drawX = x * scale;
        const drawY = y * scale;
        const drawW = w * scale;
        const drawH = h * scale;

        ctx.save();
        
        const activeCornerRadius = typeof config.cornerRadiusMm === "number" ? config.cornerRadiusMm : cornerRadiusMm;
        if (activeCornerRadius > 0) {
          const rPx = Math.min(activeCornerRadius * scale, drawW / 2, drawH / 2);
          drawRoundRectPath(ctx, drawX, drawY, drawW, drawH, rPx);
          ctx.clip();
        }

        if (imgElement) {
          ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
          ctx.rotate(((config.rotation ?? 0) * Math.PI) / 180);
          ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
          ctx.fillStyle = "#f3f4f6";
          ctx.fillRect(drawX, drawY, drawW, drawH);
          ctx.strokeStyle = "#d1d5db";
          ctx.lineWidth = 1 * (scale / 4);
          ctx.setLineDash([5 * scale, 5 * scale]);
          ctx.strokeRect(drawX, drawY, drawW, drawH);
        }
        ctx.restore();

        // Draw marching ants (cutting guides) overlapping the boundary of the image slot (exactly centered between images)
        if (marchingAnts) {
          ctx.save();
          ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
          ctx.rotate(((config.rotation ?? 0) * Math.PI) / 180);
          ctx.strokeStyle = "#4b5563"; // Deep neutral grey/black for cutting guidelines
          // High res scale for stroke width and dash lengths
          ctx.lineWidth = 1 * (scale / 4);
          ctx.setLineDash([4 * (scale / 4), 4 * (scale / 4)]);
          const offset = (currentMarginMm * scale) / 2;
          ctx.strokeRect(-drawW / 2 - offset, -drawH / 2 - offset, drawW + 2 * offset, drawH + 2 * offset);
          ctx.restore();
        }
      });

      const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement("a");
      link.download = `imposed_layout_${sheetSize}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const printOutput = () => {
    if (!livePreviewUrl) return;
    if (onLogPrint) {
      onLogPrint(`Auto-Imposer printed ${sheetSize} layout (${previewUrls.length} photos)`);
    }
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.write(`
        <html>
          <head>
            <title>Print Layout - ${sheetSize}</title>
            <style>
              @page {
                size: auto;
                margin: 0mm;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                background: white;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            <img src="${livePreviewUrl}" onload="window.print();" />
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-none relative flex flex-col h-full flex-1 min-h-0 overflow-hidden"
    >
      {/* Top Banner Control Panel - Action buttons */}
      <div className="flex items-center justify-end gap-3 mb-2 pt-1 pb-1 shrink-0">
        {/* Queue Button - Left to Print */}
        <button
          onClick={handleQueue}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="border border-input hover:bg-accent text-foreground px-5 py-2 rounded-full font-semibold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm h-[36px]"
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

        {/* Print Button - border styled with neutral-900 stroke, transparent filled background */}
        <button
          onClick={printOutput}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="border border-input hover:bg-accent text-foreground px-5 py-2 rounded-full font-semibold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm h-[36px]"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>

        {/* Download Button */}
        <button 
          onClick={downloadOutput}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-full font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md h-[36px]"
        >
          {isProcessing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {isProcessing ? "Processing Output..." : "Download"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-stretch justify-between w-full flex-1 min-h-0 overflow-hidden">
        {/* LEFT MAIN AREA: Preview canvas ONLY (no title, fits max visible screen height) */}
        <div className="flex-grow flex flex-col min-w-0 transition-all duration-300 h-full">
          <div className="bg-card rounded-[24px] border border-border shadow-[0_4px_24px_rgb(0,0,0,0.01)] p-4 flex flex-col h-full min-h-0 relative">
            {isGeneratingPreview && (
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-card/95 backdrop-blur-xs rounded-full border border-border shadow-xs px-2.5 py-1 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                Updating Layout...
              </div>
            )}

            <div className="flex-1 bg-muted/30 rounded-[20px] border border-border flex items-center justify-center relative overflow-hidden p-3 h-full min-h-0">
               {isProcessing ? (
                 <div className="flex flex-col items-center justify-center gap-4 animate-pulse">
                   <Layers className="w-8 h-8 text-neutral-300 animate-bounce" />
                   <p className="text-xs font-semibold text-neutral-400">Rendering high-res print plate...</p>
                 </div>
               ) : livePreviewUrl ? (
                 <div 
                   ref={dragContainerRef}
                   onMouseDown={handleDragZoomStart}
                   className={`relative w-full h-full flex items-center justify-center p-1 overflow-hidden select-none transition-all duration-300 ${isDragZooming ? "cursor-grabbing" : "cursor-zoom-in"}`}
                   title="Click & hold + drag down to zoom in, release to restore"
                 >
                    {/* Zoomable Container */}
                    <div 
                      ref={zoomTargetRef}
                      className={`flex items-center justify-center ${isDragZooming ? "transition-transform duration-75" : "transition-transform duration-300 ease-out"}`}
                      style={{ 
                        transform: `scale(${(isDragZooming ? dragZoomLevel : zoomLevel) / 100})`,
                        transformOrigin: isDragZooming ? dragZoomOrigin : "center center"
                      }}
                    >
                      <img 
                        src={livePreviewUrl} 
                        className="max-w-full max-h-full object-contain pointer-events-none rounded-[16px] shadow-[0_6px_36px_rgba(0,0,0,0.06)] border border-neutral-200/50 bg-white" 
                        alt="Imposed Layout Preview" 
                      />
                      
                      {/* Alignment Grid Overlay */}
                      {showGrid && (
                        <div className="absolute inset-0 pointer-events-none z-10 opacity-30 select-none grid grid-cols-3 grid-rows-3 border-transparent rounded-[16px]">
                          <div className="border-r border-b border-neutral-400 border-dashed" />
                          <div className="border-r border-b border-neutral-400 border-dashed" />
                          <div className="border-b border-neutral-400 border-dashed" />
                          <div className="border-r border-b border-neutral-400 border-dashed" />
                          <div className="border-r border-b border-neutral-400 border-dashed" />
                          <div className="border-b border-neutral-400 border-dashed" />
                          <div className="border-r border-neutral-400 border-dashed" />
                          <div className="border-r border-neutral-400 border-dashed" />
                          <div className="border-transparent" />
                        </div>
                      )}
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center gap-3 text-neutral-400 py-12">
                   <FileText className="w-8 h-8 opacity-30 animate-pulse" />
                   <p className="text-xs font-medium">Add photos in the control center to render live imposition</p>
                 </div>
               )}

               {/* Floating Translucent Toolbar */}
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border rounded-full px-5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => updateZoom(Math.max(25, zoomLevel - 25))}
                      className="p-1.5 hover:bg-accent text-foreground rounded-full transition-all active:scale-90"
                      title="Zoom Out"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-2 w-32">
                      <input 
                        type="range"
                        min="25"
                        max="500"
                        step="5"
                        value={zoomLevel}
                        onChange={(e) => updateZoom(parseInt(e.target.value) || 100)}
                        className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110 outline-none"
                      />
                    </div>

                    <button 
                      onClick={() => updateZoom(Math.min(500, zoomLevel + 25))}
                      className="p-1.5 hover:bg-accent text-foreground rounded-full transition-all active:scale-90"
                      title="Zoom In"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
               </div>

               {/* Zoom Toast Notification */}
               <AnimatePresence>
                 {(showZoomToast || isDragZooming) && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 text-white px-4 py-2.5 rounded-2xl text-[12px] font-bold font-mono shadow-2xl border border-white/10 flex items-center gap-2 select-none"
                   >
                     <span className="text-white text-xs">{isDragZooming ? Math.round(dragZoomLevel) : zoomLevel}%</span>
                     {isDragZooming && (
                       <span className="text-[9px] text-white/70 font-bold px-1.5 py-0.5 rounded-md bg-white/15 uppercase tracking-wider font-sans select-none animate-pulse">
                         Live Zoom
                       </span>
                     )}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT COLLAPSIBLE SIDEPANEL: Imports (at top) & Layout Settings */}
        <div className={`transition-all duration-300 cubic-bezier(0.25,1,0.5,1) h-full shrink-0 flex flex-col ${isRightSidebarOpen ? "w-full lg:w-[350px] opacity-100" : "w-0 overflow-hidden opacity-0 pointer-events-none"}`}>
          <div className="w-full lg:w-[350px] h-full bg-card rounded-[24px] border border-border shadow-[0_4px_24px_rgb(0,0,0,0.01)] p-5 flex flex-col min-h-0">
             
             {/* Header */}
             <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
               <div className="flex items-center gap-2">
                 <h3 className="font-semibold text-sm text-foreground">Control Center</h3>
               </div>
             </div>

             {/* Scrollable Contents (Custom Scrollbar) */}
             <div className="flex-1 overflow-y-auto pr-0.5 pt-4 space-y-5 custom-scrollbar min-h-0">
               
               {/* CLOUD PRESETS CONTAINER */}
               <div className="bg-muted/40 rounded-2xl border border-border p-3.5 space-y-3">
                 <div className="flex items-center gap-1.5 justify-between">
                   <div className="flex items-center gap-1.5">
                     <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                     <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Imposition Presets</span>
                   </div>
                   {!user && (
                     <span className="text-[9px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-full">
                       Cloud Sync
                     </span>
                   )}
                 </div>

                 {user ? (
                   <div className="space-y-3">
                     {/* Save Preset Form */}
                     <form onSubmit={handleSavePreset} className="flex gap-1.5">
                       <input 
                         type="text" 
                         placeholder="Preset name (e.g., A4 Grid)"
                         value={newPresetName}
                         onChange={(e) => setNewPresetName(e.target.value)}
                         className="flex-1 bg-card border border-border text-[11px] rounded-xl px-2.5 py-1.5 outline-none focus:border-primary text-foreground"
                         required
                       />
                       <button 
                         type="submit" 
                         title="Save current configuration to cloud"
                         className="bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 rounded-xl px-3 flex items-center justify-center transition-all cursor-pointer outline-none shrink-0"
                       >
                         <Save className="w-3.5 h-3.5" />
                       </button>
                     </form>

                     {/* Presets List */}
                     <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                       {presets.length === 0 ? (
                         <p className="text-[10px] text-muted-foreground text-center py-2">No presets saved yet.</p>
                       ) : (
                         presets.map((preset) => (
                           <div 
                             key={preset.id} 
                             className="flex items-center justify-between p-2 bg-card rounded-xl border border-border hover:border-primary/30 transition-all text-[11px]"
                           >
                             <button 
                               type="button"
                               onClick={() => handleApplyPreset(preset)}
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
                 ) : (
                   <div className="text-center py-2 space-y-2">
                     <p className="text-[10px] text-muted-foreground">Sign in to save layouts and synchronize presets across your devices.</p>
                     <button 
                       type="button"
                       onClick={loginWithGoogle}
                       className="w-full bg-card text-foreground hover:bg-accent border border-border text-[11px] font-semibold py-2 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer outline-none"
                     >
                       <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                         <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                         <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                         <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                         <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                       </svg>
                       <span>Sign in with Google</span>
                     </button>
                   </div>
                 )}
               </div>
               
               {/* MULTI UPLOAD ZONE */}
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 onDragOver={handleDragOver}
                 onDragLeave={handleDragLeave}
                 onDrop={handleDrop}
                 className={`document-drop-zone border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[110px] ${
                   isDraggingUpload 
                     ? "active-drag border-primary bg-primary/10" 
                     : "border-border hover:border-primary/50 bg-card hover:bg-accent/40"
                 }`}
               >
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   multiple
                   accept="image/*"
                   onChange={handleFileChange} 
                 />
                 <div className="pointer-events-none select-none flex flex-col items-center justify-center">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 border border-border shadow-inner transition-colors duration-100 ${
                     isDraggingUpload
                       ? "bg-primary text-primary-foreground"
                       : "bg-muted text-muted-foreground"
                   }`}>
                     <UploadCloud className="w-4 h-4" />
                   </div>
                   <h4 className="font-semibold text-foreground text-xs">
                     {isDraggingUpload ? "Drop photos here" : "Import grid photos"}
                   </h4>
                   <p className="text-[10px] text-muted-foreground mt-0.5">Drag & drop files or click to add.</p>
                 </div>
               </div>

               {/* PHOTO QUEUE TRAY */}
               {selectedFiles.length > 0 && (
                 <div className="bg-muted/30 rounded-2xl border border-border p-3 space-y-2">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-1.5">
                       <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                       <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Image Slots ({selectedFiles.length})</span>
                     </div>
                     <button 
                       onClick={clearAllPhotos}
                       className="text-[10px] font-semibold text-destructive hover:text-destructive/80 flex items-center gap-1 bg-destructive/10 hover:bg-destructive/20 px-2 py-0.5 rounded-full transition-colors"
                     >
                       <Trash2 className="w-2.5 h-2.5" />
                       Clear
                     </button>
                   </div>

                   <div className="grid grid-cols-4 gap-1.5 max-h-[100px] overflow-y-auto pr-0.5 custom-scrollbar">
                     {previewUrls.map((url, index) => {
                        const isActive = selectedImgIdx === index;
                        return (
                                                 <div 
                            key={index} 
                            onClick={() => handleSelectImgIdx(index)}
                            className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${
                              isActive 
                                ? "ring-2 ring-neutral-900 border-transparent scale-105 shadow-sm z-10" 
                                : "border border-neutral-200/75 bg-neutral-50 hover:bg-neutral-100"
                            }`}
                            title={`Select Photo Slot ${index + 1}`}
                          >
                         <img src={url} className="w-full h-full object-cover" alt={`Uploaded frame ${index}`} />
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             removePhoto(index);
                           }}
                           className="absolute top-0.5 right-0.5 bg-neutral-950/80 hover:bg-neutral-950 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           <X className="w-2.5 h-2.5" />
                         </button>
                         <div className="absolute bottom-0.5 left-0.5 bg-neutral-900/75 text-white rounded-md text-[8px] px-1 py-0.2 font-bold leading-none shadow-xs">
                           {index + 1}
                         </div>
                       </div>
                        );
                      })}
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="aspect-square border border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-400 hover:bg-neutral-50/55 transition-colors"
                     >
                       <Plus className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               )}

               {/* Separator line */}
               <div className="h-px bg-neutral-100 w-full" />

               {/* Imposition Type */}
               <div>
                 <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Imposition Type</label>
                 <div className="grid grid-cols-3 gap-1.5">
                   <button 
                     type="button"
                     onClick={() => handleLayoutTypeChange("passport-max")}
                     className={`py-1.5 px-1 text-[11px] font-semibold rounded-xl border transition-all ${layoutType === "passport-max" ? "bg-primary border-primary text-primary-foreground shadow-xs" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
                   >
                     Auto Fill
                   </button>
                   <button 
                     type="button"
                     onClick={() => handleLayoutTypeChange("custom-grid")}
                     className={`py-1.5 px-1 text-[11px] font-semibold rounded-xl border transition-all ${layoutType === "custom-grid" ? "bg-primary border-primary text-primary-foreground shadow-xs" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
                   >
                     Custom Grid
                   </button>
                   <button 
                     type="button"
                     onClick={() => handleLayoutTypeChange("original")}
                     className={`py-1.5 px-1 text-[11px] font-semibold rounded-xl border transition-all ${layoutType === "original" ? "bg-primary border-primary text-primary-foreground shadow-xs" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
                   >
                     Original
                   </button>
                 </div>
                 
                  {(layoutType === "custom-grid" || layoutType === "passport-max") && (
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100 flex flex-col items-center">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase leading-none mb-1">Rows (Max {maxRows})</span>
                        <input 
                          type="number"
                          min="1"
                          max={maxRows}
                          value={customRows}
                          onChange={(e) => setCustomRows(Math.min(maxRows, parseInt(e.target.value) || 1))}
                          className="w-full bg-transparent text-sm font-mono font-bold text-neutral-900 text-center outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-neutral-300 font-medium text-xs font-serif italic">×</span>
                      </div>
                      <div className="flex-1 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100 flex flex-col items-center">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase leading-none mb-1">Cols (Max {maxCols})</span>
                        <input 
                          type="number"
                          min="1"
                          max={maxCols}
                          value={customCols}
                          onChange={(e) => setCustomCols(Math.min(maxCols, parseInt(e.target.value) || 1))}
                          className="w-full bg-transparent text-sm font-mono font-bold text-neutral-900 text-center outline-none"
                        />
                      </div>
                    </div>
                  )}
                  {false && layoutType === "custom-grid" && (
                   <div className="flex items-center gap-3 mt-3">
                     <div className="flex-1">
                       <label className="block text-[10px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider text-center">Rows</label>
                       <input 
                         type="number" 
                         min="1" 
                         max="20" 
                         value={customRows} 
                         onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            if (val > customRows) {
                              const m = hasMargin ? marginMm : 0;
                              const p = 10;
                              let sheetH = 450;
                              if (sheetSize === "A3") sheetH = 420;
                              if (sheetSize === "A4") sheetH = 297;
                              if (sheetSize === "Letter") sheetH = 279;
                              const sc = (imageConfigs[0]?.scalePercent ?? 100) / 100;
                              let photoH = 45;
                              if (photoScaleType === "2x2") photoH = 50.8;
                              else if (photoScaleType === "custom") photoH = customScaleH;
                              const currentH = (customRows * (photoH * sc + m)) - m;
                              if (currentH + (photoH * sc + m) > (sheetH - 2*p)) return;
                            }
                            setCustomRows(val);
                          }}
                         className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-3 py-1.5 outline-none focus:border-neutral-400 text-center font-medium"
                       />
                     </div>
                     <div className="flex items-center justify-center pt-5">
                       <span className="text-neutral-400 font-medium text-sm select-none">×</span>
                     </div>
                     <div className="flex-1">
                       <label className="block text-[10px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider text-center">Cols</label>
                       <input 
                         type="number" 
                         min="1" 
                         max="20" 
                         value={customCols} 
                         onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            if (val > customCols) {
                              const m = hasMargin ? marginMm : 0;
                              const p = 10;
                              let sheetW = 320;
                              if (sheetSize === "A3") sheetW = 297;
                              if (sheetSize === "A4") sheetW = 210;
                              if (sheetSize === "Letter") sheetW = 216;
                              const sc = (imageConfigs[0]?.scalePercent ?? 100) / 100;
                              let photoW = 35;
                              if (photoScaleType === "2x2") photoW = 50.8;
                              else if (photoScaleType === "custom") photoW = customScaleW;
                              const currentW = (customCols * (photoW * sc + m)) - m;
                              if (currentW + (photoW * sc + m) > (sheetW - 2*p)) return;
                            }
                            setCustomCols(val);
                          }}
                         className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-3 py-1.5 outline-none focus:border-neutral-400 text-center font-medium"
                       />
                     </div>
                   </div>
                 )}


               </div>

               {/* Numbered Selection circles based on total dynamic length in a 4-column grid */}
               <div>
                 
                 <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Select Photo Slot</label>
                    <button 
                      type="button"
                      onClick={() => handleApplyToAllChange(!applyToAll)}
                      className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity"
                    >
                      <div className="w-4 h-4 rounded border border-neutral-300 group-hover:border-neutral-400 flex items-center justify-center bg-white transition-colors">
                        {applyToAll && <div className="w-2.5 h-2.5 bg-neutral-800 rounded-xs"></div>}
                      </div>
                      <span className="text-[11px] text-neutral-500 font-semibold group-hover:text-neutral-700 select-none">Add for All</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100">
                    {Array.from({ length: Math.max(1, previewUrls.length) }).map((_, idx) => {
                     const isActive = selectedImgIdx === idx;
                     const isOccupied = idx < selectedFiles.length;
                     return (
                       <button
                         key={idx}
                         type="button"
                         onClick={() => handleSelectImgIdx(idx)}
                         className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-xs relative transition-all duration-200 ${
                           isActive 
                             ? "bg-neutral-950 text-white scale-105 shadow-xs ring-2 ring-neutral-200" 
                             : "bg-white border border-neutral-200/60 text-neutral-700 hover:bg-neutral-50"
                         }`}
                         title={`Select Photo Slot ${idx + 1}`}
                       >
                         {idx + 1}
                         {isOccupied && (
                           <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                         )}
                       </button>
                     );
                   })}
                 </div>
               </div>

                {/* Photo Dimension Scale */}
                {true && (
                  <div className="space-y-4">
                    <div>
                      <label id="dimention-label" className="block text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">
                        dimention (Photo {selectedImgIdx + 1})
                      </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(["35x45", "2x2", "custom", "original"] as const).map(scale => (
                            <button 
                              key={scale}
                              id={`dimention-scale-${scale}`}
                              type="button"
                              onClick={() => {
                                updateScaleType(scale);
                              }}
                              className={`py-1.5 px-1 text-[11px] font-semibold rounded-xl border transition-all ${photoScaleType === scale ? "bg-primary border-primary text-primary-foreground shadow-xs" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
                            >
                              {scale === "35x45" ? "35x45 mm" : scale === "2x2" ? "2x2 in" : scale === "original" ? "Original" : "Custom"}
                            </button>
                          ))}
                        </div>
                        
                        {photoScaleType === "custom" && (
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider text-center">W (mm)</label>
                              <input 
                                type="number" 
                                value={customScaleW} 
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  updateCustomScaleW(val);
                                }}
                                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-3 py-1.5 outline-none focus:border-neutral-400 text-center font-medium"
                              />
                            </div>
                            <div className="flex items-center justify-center pt-5">
                              <span className="text-neutral-400 font-medium text-sm select-none">×</span>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider text-center">H (mm)</label>
                              <input 
                                type="number" 
                                value={customScaleH} 
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  updateCustomScaleH(val);
                                }}
                                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-3 py-1.5 outline-none focus:border-neutral-400 text-center font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                )}

                {/* Photo Slot Rotation Controls */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Photo Rotation (Slot {selectedImgIdx + 1})</label>
                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg">{slotRotation}°</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 bg-muted/30 p-2.5 rounded-2xl border border-border">
                    {([0, 90, 180, 270] as const).map(angle => (
                      <button 
                        key={angle}
                        type="button"
                        onClick={() => {
                          updateRotation(angle);
                        }}
                        className={`py-1.5 px-1.5 text-[11px] font-semibold rounded-lg border transition-all ${slotRotation === angle ? "bg-primary border-primary text-primary-foreground shadow-xs" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
                      >
                        {angle}°
                      </button>
                    ))}
                  </div>
                </div>
                {/* Photo Slot Copies Controls */}
                {layoutType === "original" ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Slot Copies (Slot {selectedImgIdx + 1})</label>
                        <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg">{slotCopies} {slotCopies === 1 ? "copy" : "copies"}</span>
                      </div>
                      <div className="space-y-4 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-neutral-400 font-medium font-mono">1</span>
                          <input 
                            type="range" 
                            min="1" 
                            max={48} 
                            step="1"
                            value={slotCopies}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              updateCopies(val);
                            }}
                            className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-900 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110 outline-none"
                          />
                          <span className="text-[10px] text-neutral-400 font-medium font-mono">48</span>
                        </div>

                      {/* Scaling interface for each copy of the slot */}
                      <div className="pt-3 border-t border-neutral-200/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Copy Scaling (Zoom)</span>
                          <button
                            type="button"
                            onClick={() => {
                              for (let c = 0; c < slotCopies; c++) {
                                updateIndividualCopyScale(c, 100);
                              }
                            }}
                            className="text-[10px] text-neutral-500 hover:text-neutral-900 font-bold cursor-pointer transition-colors"
                          >
                            Reset All
                          </button>
                        </div>
                        <div className="space-y-4 max-h-[180px] overflow-y-auto pr-1 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {Array.from({ length: slotCopies }).map((_, cpyIdx) => {
                            const currentVal = slotCopyScales[cpyIdx] !== undefined ? slotCopyScales[cpyIdx] : 100;
                            return (
                              <div key={cpyIdx} className="space-y-1.5">
                                <div className="flex justify-between items-center px-0.5">
                                  <span className="text-[11px] font-bold text-neutral-400 uppercase">Copy {cpyIdx + 1}</span>
                                  <span className="text-[11px] font-mono font-bold text-neutral-900">{currentVal}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[12px] text-neutral-400 font-medium font-mono">10</span>
                                  <input
                                    type="range"
                                    min="10"
                                    max="200"
                                    step="5"
                                    value={currentVal}
                                    onChange={(e) => {
                                      const newVal = parseInt(e.target.value) || 100;
                                      updateIndividualCopyScale(cpyIdx, newVal);
                                    }}
                                    className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-900 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110 outline-none"
                                  />
                                  <span className="text-[12px] text-neutral-400 font-medium font-mono">200</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-normal">
                          Default scale splits the sheet into even autofill grid areas.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">{layoutType === "custom-grid" ? "Global Zoom" : `Photo Zoom (Slot ${selectedImgIdx + 1})`}</label>
                      <span className="text-xs font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-lg">{slotScalePercent}%</span>
                    </div>
                    <div className="space-y-4 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-neutral-400 font-medium font-mono">10</span>
                        <input
                          type="range"
                          min="10"
                          max="200"
                          step="5"
                          value={slotScalePercent}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 100;
                            // Pre-calculate if this scale causes overlap or overflow
                            let sW = 320; let sH = 450;
                            if (sheetSize === "A3") { sW = 297; sH = 420; }
                            if (sheetSize === "A4") { sW = 210; sH = 297; }
                            if (sheetSize === "Letter") { sW = 216; sH = 279; }
                            const m = hasMargin ? marginMm : 0;
                            const p = 10;
                            
                            let pw = 35; let ph = 45;
                            if (photoScaleType === "2x2") { pw = 50.8; ph = 50.8; }
                            else if (photoScaleType === "custom") { pw = customScaleW; ph = customScaleH; }
                            else if (photoScaleType === "original") {
                              ph = 45;
                              pw = 45 * detectedAspect;
                            }
                            
                            const sc = val / 100;
                            const scaledW = pw * sc;
                            const scaledH = ph * sc;
                            
                            if (layoutType === "passport-max" || layoutType === "custom-grid") {
                              // Ensure at least one item fits
                              if (scaledW > (sW - 2*p) || scaledH > (sH - 2*p)) {
                                return; 
                              }
                            }
                            updateScalePercent(val);
                          }}
                          className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-900 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110 outline-none"
                        />
                        <span className="text-[12px] text-neutral-400 font-medium font-mono">200</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-normal">
                        Adjusting the zoom will automatically recalculate the grid for optimized layout.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Photo Corner Roundness Control */}
               <div>
                 <div className="flex justify-between items-center mb-2">
                   <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Photo Roundness</label>
                   <span className="text-xs font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-lg">{cornerRadiusMm} mm</span>
                 </div>
                 <div className="space-y-3 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100">
                   <div className="grid grid-cols-4 gap-2">
                     {([0, 3, 5, 10] as const).map(preset => (
                       <button
                         key={preset}
                         type="button"
                         onClick={() => updateCornerRadius(preset)}
                         className={`py-1.5 px-2 text-[10px] sm:text-xs font-semibold rounded-lg border transition-all ${cornerRadiusMm === preset ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
                       >
                         {preset === 0 ? "None" : preset === 3 ? "Soft" : preset === 5 ? "Smooth" : "Max"}
                       </button>
                     ))}
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-[10px] text-neutral-400 font-medium font-mono">0mm</span>
                     <input 
                       type="range" 
                       min="0" 
                       max="20" 
                       step="1"
                       value={cornerRadiusMm}
                       onChange={(e) => updateCornerRadius(parseInt(e.target.value) || 0)}
                       className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-900 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110 outline-none"
                     />
                     <span className="text-[10px] text-neutral-400 font-medium font-mono">20mm</span>
                   </div>
                 </div>
               </div>

               {/* Sheet Size */}
               <div>
                 <label className="block text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Sheet Size</label>
                 <select 
                   value={sheetSize}
                   onChange={(e) => setSheetSize(e.target.value)}
                   className="w-full bg-muted/50 border border-border text-foreground text-sm rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 transition-colors cursor-pointer appearance-none font-medium"
                 >
                   <option value="SRA3">SRA3 (320 x 450 mm)</option>
                   <option value="A3">A3 (297 x 420 mm)</option>
                   <option value="A4">A4 (210 x 297 mm)</option>
                   <option value="Letter">Letter (8.5 x 11 in)</option>
                 </select>
               </div>

               {/* Options spacing / cut lines */}
               <div>
                 <label className="block text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Options</label>
                 <div className="space-y-4">
                   <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setMarchingAnts(!marchingAnts)}>
                     <div className="w-5 h-5 rounded border border-neutral-300 group-hover:border-neutral-400 flex items-center justify-center bg-white transition-colors">
                       {marchingAnts && <div className="w-3 h-3 bg-neutral-800 rounded-sm"></div>}
                     </div>
                     <span className="text-sm text-neutral-700 font-medium select-none">marching ants cut lines</span>
                   </label>
                   
                   <div className="space-y-2">
                     <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setHasMargin(!hasMargin)}>
                       <div className="w-5 h-5 rounded border border-neutral-300 group-hover:border-neutral-400 flex items-center justify-center bg-white transition-colors">
                         {hasMargin && <div className="w-3 h-3 bg-neutral-800 rounded-sm"></div>}
                       </div>
                       <span className="text-sm text-neutral-700 font-medium select-none">Add cell spacing (gap)</span>
                     </label>

                     {hasMargin && (
                       <div className="pl-6 pt-1 space-y-2">
                         <div className="pl-2 pt-1 font-sans bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100 flex flex-col gap-1 text-[11px] text-neutral-500 font-medium">
                           <div className="flex justify-between">
                             <span>Gap spacing:</span>
                             <span className="font-semibold text-neutral-800">{marginMm} mm ({(marginMm / 10).toFixed(1)} cm)</span>
                           </div>
                         </div>
                         <input 
                           type="range" 
                           min="1" 
                           max="15" 
                           step="1"
                           value={marginMm}
                           onChange={(e) => {
                              const val = parseInt(e.target.value) || 5;
                              // Check for overflow in fixed grids
                              let sW = 320; let sH = 450;
                              if (sheetSize === "A3") { sW = 297; sH = 420; }
                              if (sheetSize === "A4") { sW = 210; sH = 297; }
                              if (sheetSize === "Letter") { sW = 216; sH = 279; }
                              const p = 10;
                              
                              if (layoutType === "custom-grid") {
                                const sc = (imageConfigs[selectedImgIdx]?.scalePercent ?? 100) / 100;
                                let pw = 35; let ph = 45;
                                if (photoScaleType === "2x2") { pw = 50.8; ph = 50.8; }
                                else if (photoScaleType === "custom") { pw = customScaleW; ph = customScaleH; }
                                else if (photoScaleType === "original") {
                                  ph = 45;
                                  pw = 45 * detectedAspect;
                                }
                                const gridW = (customCols * (pw * sc + val)) - val;
                                const gridH = (customRows * (ph * sc + val)) - val;
                                if (gridW > (sW - 2*p) || gridH > (sH - 2*p)) return;
                              }
                              setMarginMm(val);
                            }}
                           className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-900 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110 outline-none"
                         />
                       </div>
                     )}
                   </div>
                 </div>
               </div>

             </div>
           </div>
         </div>

      </div>
    </motion.div>
  );
}

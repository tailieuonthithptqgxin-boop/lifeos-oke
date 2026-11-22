import { useState, useEffect, useMemo, RefObject } from 'react';

export type MeetLayoutMode = 'auto' | 'tiled' | 'spotlight' | 'sidebar';

export interface MeetGridLayoutOptions {
  aspectRatio?: number; // Target ratio (width / height), default 16/9 ≈ 1.777
  gap?: number;         // Gap in pixels between tiles, default 8
  maxColumns?: number;  // Hard column ceiling
  minTileWidth?: number;// Minimum readable tile width in px
  minTileHeight?: number;// Minimum readable tile height in px
}

export interface MeetGridLayoutResult {
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  containerWidth: number;
  containerHeight: number;
  isCompact: boolean;   // True if tiles are small (font scaling / hide details)
  gridStyle: React.CSSProperties;
  recalculate: () => void;
}

/**
 * Google Meet Auto-Layout Engine Hook
 * 
 * Uses ResizeObserver to dynamically measure the available container
 * dimensions and calculates the optimal (columns, rows) grid that maximizes
 * participant tile area while maintaining close to 16:9 aspect ratio without
 * overflowing or clipping text.
 */
export function useMeetGridLayout(
  containerRef: RefObject<HTMLElement | null>,
  tileCount: number,
  mode: MeetLayoutMode = 'auto',
  options: MeetGridLayoutOptions = {}
): MeetGridLayoutResult {
  const {
    aspectRatio = 16 / 9,
    gap = 8,
    maxColumns = 7,
    minTileWidth = 120,
    minTileHeight = 90,
  } = options;

  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight - 80 : 720,
  });

  // Track container dimensions via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(0, Math.floor(rect.width));
      const h = Math.max(0, Math.floor(rect.height));
      if (w > 0 && h > 0) {
        setContainerSize((prev) => {
          if (Math.abs(prev.width - w) > 1 || Math.abs(prev.height - h) > 1) {
            return { width: w, height: h };
          }
          return prev;
        });
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setContainerSize({
              width: Math.floor(width),
              height: Math.floor(height),
            });
          }
        }
      });
      resizeObserver.observe(el);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [containerRef]);

  // Compute optimal grid layout
  const layout = useMemo(() => {
    const W = containerSize.width;
    const H = containerSize.height;

    // Edge case: Empty or unmounted container
    if (tileCount <= 0 || W <= 0 || H <= 0) {
      return {
        columns: 1,
        rows: 1,
        tileWidth: W,
        tileHeight: H,
        containerWidth: W,
        containerHeight: H,
        isCompact: false,
        gridStyle: {
          display: 'grid',
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr',
          gap: `${gap}px`,
          width: '100%',
          height: '100%',
        } as React.CSSProperties,
      };
    }

    // 1. Spotlight Mode: Single focal view
    if (mode === 'spotlight') {
      return {
        columns: 1,
        rows: 1,
        tileWidth: W,
        tileHeight: H,
        containerWidth: W,
        containerHeight: H,
        isCompact: false,
        gridStyle: {
          display: 'grid',
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr',
          width: '100%',
          height: '100%',
        } as React.CSSProperties,
      };
    }

    // 2. Sidebar Mode: Stacked vertical column (Sidebar handles its own 25% split)
    if (mode === 'sidebar') {
      const rows = Math.max(1, tileCount);
      return {
        columns: 1,
        rows,
        tileWidth: W,
        tileHeight: Math.max(minTileHeight, Math.floor((H - (rows - 1) * gap) / rows)),
        containerWidth: W,
        containerHeight: H,
        isCompact: true,
        gridStyle: {
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: `${gap}px`,
          width: '100%',
          height: '100%',
        } as React.CSSProperties,
      };
    }

    // 3. Auto / Tiled Mode: Iterate candidate column count c ∈ [1, min(tileCount, maxColumns)]
    // Find c that maximizes the area of each tile while fitting within available (W, H)
    let bestCols = 1;
    let bestRows = 1;
    let maxArea = 0;
    let bestTileW = 0;
    let bestTileH = 0;

    const maxCandidateCols = Math.min(tileCount, maxColumns, 8);

    for (let c = 1; c <= maxCandidateCols; c++) {
      const r = Math.ceil(tileCount / c);
      const totalGapW = (c - 1) * gap;
      const totalGapH = (r - 1) * gap;

      const availW = (W - totalGapW) / c;
      const availH = (H - totalGapH) / r;

      if (availW <= 0 || availH <= 0) continue;

      let tileW: number;
      let tileH: number;

      // Fit 16:9 box inside (availW, availH)
      if (availW / availH > aspectRatio) {
        // Height is the bounding constraint
        tileH = availH;
        tileW = tileH * aspectRatio;
      } else {
        // Width is the bounding constraint
        tileW = availW;
        tileH = tileW / aspectRatio;
      }

      const area = tileW * tileH;

      // We want to maximize total visible tile area.
      // In tie-breaker, prefer slightly more balanced row/col distribution
      if (area > maxArea) {
        maxArea = area;
        bestCols = c;
        bestRows = r;
        bestTileW = tileW;
        bestTileH = tileH;
      }
    }

    // If calculation yielded valid dimensions, use them
    const columns = Math.max(1, bestCols);
    const rows = Math.max(1, bestRows);
    const tileWidth = Math.max(minTileWidth, Math.round(bestTileW || W / columns));
    const tileHeight = Math.max(minTileHeight, Math.round(bestTileH || H / rows));
    const isCompact = tileHeight < 140 || columns >= 5 || tileCount >= 16;

    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      gap: `${gap}px`,
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    };

    return {
      columns,
      rows,
      tileWidth,
      tileHeight,
      containerWidth: W,
      containerHeight: H,
      isCompact,
      gridStyle,
    };
  }, [containerSize, tileCount, mode, aspectRatio, gap, maxColumns, minTileWidth, minTileHeight]);

  const recalculate = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    }
  };

  return {
    ...layout,
    recalculate,
  };
}

/**
 * Pure calculation helper for testing and headless usage
 */
export function calculateMeetGrid(
  W: number,
  H: number,
  tileCount: number,
  mode: MeetLayoutMode = 'auto',
  aspectRatio: number = 16 / 9,
  gap: number = 8,
  maxColumns: number = 7,
  minTileWidth: number = 120,
  minTileHeight: number = 90
): { columns: number; rows: number; tileWidth: number; tileHeight: number } {
  if (tileCount <= 0) return { columns: 1, rows: 1, tileWidth: W, tileHeight: H };
  if (mode === 'spotlight' || mode === 'sidebar') {
    return { columns: 1, rows: 1, tileWidth: W, tileHeight: H };
  }

  let bestCols = 1;
  let bestRows = 1;
  let maxArea = 0;
  let bestTileW = 0;
  let bestTileH = 0;

  const maxCandidateCols = Math.min(tileCount, maxColumns, 8);

  for (let c = 1; c <= maxCandidateCols; c++) {
    const r = Math.ceil(tileCount / c);
    const totalGapW = (c - 1) * gap;
    const totalGapH = (r - 1) * gap;

    const availW = (W - totalGapW) / c;
    const availH = (H - totalGapH) / r;

    if (availW <= 0 || availH <= 0) continue;

    let tileW: number;
    let tileH: number;

    if (availW / availH > aspectRatio) {
      tileH = availH;
      tileW = tileH * aspectRatio;
    } else {
      tileW = availW;
      tileH = tileW / aspectRatio;
    }

    const area = tileW * tileH;
    if (area > maxArea) {
      maxArea = area;
      bestCols = c;
      bestRows = r;
      bestTileW = tileW;
      bestTileH = tileH;
    }
  }

  return {
    columns: Math.max(1, bestCols),
    rows: Math.max(1, bestRows),
    tileWidth: Math.max(minTileWidth, Math.round(bestTileW || W / bestCols)),
    tileHeight: Math.max(minTileHeight, Math.round(bestTileH || H / bestRows)),
  };
}

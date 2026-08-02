import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Pencil, Move, Save, Trash2, RotateCcw, ZoomIn, ZoomOut,
  Square, Circle, Users, Check, X, Info
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Point { x: number; y: number; }

interface TableData {
  id: string;
  name: string;
  capacity: number;
  shape: 'round' | 'rectangular' | 'oval';
  category: string;
  position_x: number;
  position_y: number;
  seated?: number;
}

interface FloorPlanEditorProps {
  tables: TableData[];
  onUpdatePosition: (tableId: string, x: number, y: number) => void;
  onSaveAll: (positions: Record<string, { x: number; y: number }>) => void;
  roomPolygon: Point[];
  onSaveRoom: (polygon: Point[]) => void;
  readOnly?: boolean;
}

// ─── Category colours ──────────────────────────────────────────────────────
const catFill: Record<string, string> = {
  vip: '#fef3c7',
  family: '#ffe4e6',
  friends: '#dbeafe',
  colleagues: '#dcfce7',
  other: '#f8fafc',
};
const catStroke: Record<string, string> = {
  vip: '#f59e0b',
  family: '#f43f5e',
  friends: '#3b82f6',
  colleagues: '#22c55e',
  other: '#94a3b8',
};

// ─── TABLE SIZE ────────────────────────────────────────────────────────────
const TABLE_W = 72;
const TABLE_H = 52;

// ─── TableShape SVG ────────────────────────────────────────────────────────
function TableShape({ table, selected, guestCount }: {
  table: TableData; selected: boolean; guestCount: number;
}) {
  const fill = catFill[table.category] || catFill.other;
  const stroke = selected ? '#7c3aed' : (catStroke[table.category] || catStroke.other);
  const sw = selected ? 2.5 : 1.5;

  if (table.shape === 'round') {
    return (
      <>
        <circle cx={TABLE_W / 2} cy={TABLE_H / 2} r={Math.min(TABLE_W, TABLE_H) / 2 - 2}
          fill={fill} stroke={stroke} strokeWidth={sw} />
        <text x={TABLE_W / 2} y={TABLE_H / 2 - 5} textAnchor="middle" fontSize={10}
          fontWeight="600" fill="#1e293b" fontFamily="system-ui">{table.name}</text>
        <text x={TABLE_W / 2} y={TABLE_H / 2 + 8} textAnchor="middle" fontSize={9}
          fill="#64748b" fontFamily="system-ui">{guestCount}/{table.capacity}</text>
      </>
    );
  }
  if (table.shape === 'oval') {
    return (
      <>
        <ellipse cx={TABLE_W / 2} cy={TABLE_H / 2} rx={TABLE_W / 2 - 2} ry={TABLE_H / 2 - 2}
          fill={fill} stroke={stroke} strokeWidth={sw} />
        <text x={TABLE_W / 2} y={TABLE_H / 2 - 5} textAnchor="middle" fontSize={10}
          fontWeight="600" fill="#1e293b" fontFamily="system-ui">{table.name}</text>
        <text x={TABLE_W / 2} y={TABLE_H / 2 + 8} textAnchor="middle" fontSize={9}
          fill="#64748b" fontFamily="system-ui">{guestCount}/{table.capacity}</text>
      </>
    );
  }
  // rectangular
  return (
    <>
      <rect x={2} y={2} width={TABLE_W - 4} height={TABLE_H - 4} rx={6}
        fill={fill} stroke={stroke} strokeWidth={sw} />
      <text x={TABLE_W / 2} y={TABLE_H / 2 - 5} textAnchor="middle" fontSize={10}
        fontWeight="600" fill="#1e293b" fontFamily="system-ui">{table.name}</text>
      <text x={TABLE_W / 2} y={TABLE_H / 2 + 8} textAnchor="middle" fontSize={9}
        fill="#64748b" fontFamily="system-ui">{guestCount}/{table.capacity}</text>
    </>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function FloorPlanEditor({
  tables, onUpdatePosition, onSaveAll, roomPolygon, onSaveRoom, readOnly = false,
}: FloorPlanEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<'move' | 'draw'>('move');
  const [polygon, setPolygon] = useState<Point[]>(roomPolygon.length >= 3 ? roomPolygon : []);
  const [positions, setPositions] = useState<Record<string, Point>>(() => {
    const init: Record<string, Point> = {};
    tables.forEach(t => {
      init[t.id] = { x: t.position_x || 50, y: t.position_y || 50 };
    });
    return init;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [drawingDone, setDrawingDone] = useState(roomPolygon.length >= 3);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // Sync positions if tables change externally
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev };
      tables.forEach(t => {
        if (!next[t.id]) next[t.id] = { x: t.position_x || 50, y: t.position_y || 50 };
      });
      return next;
    });
  }, [tables]);

  // ── SVG coordinate helpers ──────────────────────────────────────────────
  const getSVGPoint = useCallback((e: React.MouseEvent): Point => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

  // ── DRAW mode – add polygon vertex ─────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (readOnly || mode !== 'draw' || drawingDone) return;
    const pt = getSVGPoint(e);
    // Close polygon if clicking near first point
    if (polygon.length >= 3) {
      const first = polygon[0];
      if (Math.abs(pt.x - first.x) < 14 && Math.abs(pt.y - first.y) < 14) {
        setDrawingDone(true);
        return;
      }
    }
    setPolygon(prev => [...prev, pt]);
  }, [readOnly, mode, drawingDone, polygon, getSVGPoint]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' && !drawingDone) {
      setHoverPoint(getSVGPoint(e));
    }
  }, [mode, drawingDone, getSVGPoint]);

  // ── MOVE mode – drag tables ────────────────────────────────────────────
  const handleTableMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (readOnly || mode !== 'move') return;
    e.stopPropagation();
    setSelected(id);
    setDragging(id);
    const pt = getSVGPoint(e);
    const pos = positions[id] || { x: 0, y: 0 };
    setDragOffset({ x: pt.x - pos.x, y: pt.y - pos.y });
  }, [readOnly, mode, positions, getSVGPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' && !drawingDone) {
      setHoverPoint(getSVGPoint(e));
      return;
    }
    if (!dragging) return;
    const pt = getSVGPoint(e);
    setPositions(prev => ({
      ...prev,
      [dragging]: {
        x: Math.max(0, pt.x - dragOffset.x),
        y: Math.max(0, pt.y - dragOffset.y),
      },
    }));
    setHasUnsaved(true);
  }, [dragging, dragOffset, getSVGPoint, mode, drawingDone]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ── Save positions ─────────────────────────────────────────────────────
  const handleSave = () => {
    onSaveAll(positions);
    setHasUnsaved(false);
  };

  // ── Save room polygon ──────────────────────────────────────────────────
  const handleSaveRoom = () => {
    if (polygon.length >= 3) {
      onSaveRoom(polygon);
    }
  };

  const handleResetDraw = () => {
    setPolygon([]);
    setDrawingDone(false);
  };

  // ── Distribute tables automatically ───────────────────────────────────
  const handleAutoLayout = () => {
    if (readOnly || tables.length === 0) return;
    const cols = Math.ceil(Math.sqrt(tables.length));
    const rows = Math.ceil(tables.length / cols);
    const padX = 80, padY = 70;
    const stepX = (600 - padX * 2) / Math.max(cols - 1, 1);
    const stepY = (400 - padY * 2) / Math.max(rows - 1, 1);
    const next: Record<string, Point> = {};
    tables.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      next[t.id] = { x: padX + col * stepX, y: padY + row * stepY };
    });
    setPositions(next);
    setHasUnsaved(true);
  };

  // ── Polygon SVG string ─────────────────────────────────────────────────
  const polyStr = polygon.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-card border border-border rounded-xl shadow-sm">
        {/* Mode buttons */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            disabled={readOnly}
            onClick={() => setMode('move')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              mode === 'move'
                ? 'bg-white shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Move className="w-4 h-4" /> Déplacer
          </button>
          <button
            disabled={readOnly}
            onClick={() => { setMode('draw'); setDrawingDone(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              mode === 'draw'
                ? 'bg-white shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Pencil className="w-4 h-4" /> Tracer la salle
          </button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-10 text-center text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Actions */}
        <Button variant="outline" size="sm" onClick={handleAutoLayout}
          disabled={readOnly}
          className="gap-1.5">
          <Square className="w-3.5 h-3.5" /> Disposition auto
        </Button>

        {mode === 'draw' && polygon.length >= 3 && !drawingDone && (
          <Button size="sm" onClick={() => setDrawingDone(true)} className="gap-1.5 bg-green-600 hover:bg-green-700">
            <Check className="w-3.5 h-3.5" /> Terminer la salle
          </Button>
        )}

        {mode === 'draw' && polygon.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleResetDraw} className="gap-1.5 text-destructive">
            <RotateCcw className="w-3.5 h-3.5" /> Refaire
          </Button>
        )}

        {mode === 'draw' && drawingDone && (
          <Button size="sm" onClick={handleSaveRoom} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> Sauver la salle
          </Button>
        )}

        <div className="flex-1" />

        {hasUnsaved && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 animate-pulse">
            Modifications non sauvegardées
          </Badge>
        )}

        <Button size="sm" onClick={handleSave} disabled={readOnly || !hasUnsaved} className="gap-1.5">
          <Save className="w-3.5 h-3.5" /> Sauvegarder positions
        </Button>
      </div>

      {/* ── Hint ── */}
      {mode === 'draw' && !drawingDone && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Info className="w-4 h-4 shrink-0" />
          {polygon.length === 0
            ? 'Cliquez pour placer le premier point de la salle.'
            : polygon.length < 3
            ? `Continuez à cliquer pour définir les contours (${polygon.length} points)`
            : 'Cliquez sur le premier point pour fermer la forme, ou cliquez "Terminer la salle".'}
        </div>
      )}

      {/* ── Canvas ── */}
      <div
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-slate-50"
        style={{ height: 480 }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${600 / zoom} ${450 / zoom}`}
          preserveAspectRatio="xMidYMid meet"
          className={cn(
            'w-full h-full select-none',
            mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'
          )}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Room polygon */}
          {polygon.length >= 3 && (
            <polygon
              points={polyStr}
              fill="rgba(251, 243, 234, 0.7)"
              stroke="#c4a46b"
              strokeWidth="2"
              strokeDasharray={drawingDone ? 'none' : '6,3'}
            />
          )}

          {/* Polygon being drawn – lines */}
          {mode === 'draw' && !drawingDone && polygon.length >= 1 && hoverPoint && (
            <line
              x1={polygon[polygon.length - 1].x}
              y1={polygon[polygon.length - 1].y}
              x2={hoverPoint.x}
              y2={hoverPoint.y}
              stroke="#7c3aed"
              strokeWidth="1.5"
              strokeDasharray="5,3"
              opacity={0.6}
            />
          )}
          {/* Existing edges */}
          {mode === 'draw' && !drawingDone && polygon.map((p, i) => {
            const next = polygon[i + 1];
            if (!next) return null;
            return <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke="#7c3aed" strokeWidth="1.5" />;
          })}

          {/* Polygon vertices */}
          {mode === 'draw' && !drawingDone && polygon.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 7 : 5}
              fill={i === 0 ? '#7c3aed' : '#a78bfa'}
              stroke="white" strokeWidth={1.5}
              style={{ cursor: 'pointer' }}
            />
          ))}

          {/* Room label */}
          {drawingDone && polygon.length >= 3 && (
            <text
              x={polygon.reduce((s, p) => s + p.x, 0) / polygon.length}
              y={polygon.reduce((s, p) => s + p.y, 0) / polygon.length}
              textAnchor="middle" fontSize={12} fill="#c4a46b" fontWeight="600"
              opacity={0.5} fontFamily="system-ui" pointerEvents="none"
            >
              Salle
            </text>
          )}

          {/* Tables */}
          {tables.map(table => {
            const pos = positions[table.id] || { x: 50, y: 50 };
            const isSel = selected === table.id;
            const guestCount = table.seated ?? 0;
            return (
              <g
                key={table.id}
                transform={`translate(${pos.x - TABLE_W / 2}, ${pos.y - TABLE_H / 2})`}
                onMouseDown={e => handleTableMouseDown(e, table.id)}
                onClick={e => { e.stopPropagation(); setSelected(table.id); }}
                style={{ cursor: mode === 'move' ? 'grab' : 'default' }}
              >
                {/* Halo when selected */}
                {isSel && (
                  <rect x={-4} y={-4} width={TABLE_W + 8} height={TABLE_H + 8}
                    rx={table.shape === 'rectangular' ? 10 : TABLE_W / 2 + 4}
                    fill="rgba(124, 58, 237, 0.12)"
                    stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="5,3"
                  />
                )}
                <svg width={TABLE_W} height={TABLE_H} overflow="visible">
                  <TableShape table={table} selected={isSel} guestCount={guestCount} />
                </svg>
              </g>
            );
          })}
        </svg>

        {/* Empty state hint */}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">
              Ajoutez des tables via la liste pour les voir apparaître ici
            </p>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        {Object.entries(catStroke).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: color, backgroundColor: catFill[cat] }} />
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          Format : <span className="font-mono">placés/capacité</span>
        </div>
      </div>
    </div>
  );
}

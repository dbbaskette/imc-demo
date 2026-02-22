import React from 'react';
import type { NodeProps } from 'reactflow';
import type { ZoneNotch } from '../types/diagram';

interface ZoneNodeData {
  label: string;
  width: number;
  height: number;
  borderColor: string;
  backgroundColor: string;
  labelColor: string;
  notch?: ZoneNotch;
}

const R = 16; // corner radius

function buildPath(w: number, h: number, notch?: ZoneNotch): string {
  if (!notch) {
    // Simple rounded rectangle
    return `
      M ${R} 0 L ${w - R} 0 A ${R} ${R} 0 0 1 ${w} ${R}
      L ${w} ${h - R} A ${R} ${R} 0 0 1 ${w - R} ${h}
      L ${R} ${h} A ${R} ${R} 0 0 1 0 ${h - R}
      L 0 ${R} A ${R} ${R} 0 0 1 ${R} 0 Z`;
  }

  // Notched shape (top-right cutout)
  const nx = w - notch.width;  // x of vertical notch wall
  const nh = notch.height;     // y of horizontal notch wall

  return `
    M ${R} 0
    L ${nx - R} 0
    A ${R} ${R} 0 0 1 ${nx} ${R}
    L ${nx} ${nh - R}
    A ${R} ${R} 0 0 0 ${nx + R} ${nh}
    L ${w - R} ${nh}
    A ${R} ${R} 0 0 1 ${w} ${nh + R}
    L ${w} ${h - R}
    A ${R} ${R} 0 0 1 ${w - R} ${h}
    L ${R} ${h}
    A ${R} ${R} 0 0 1 0 ${h - R}
    L 0 ${R}
    A ${R} ${R} 0 0 1 ${R} 0
    Z`;
}

const ZoneNode: React.FC<NodeProps<ZoneNodeData>> = ({ data }) => {
  const { width, height, borderColor, backgroundColor, labelColor, label, notch } = data;
  const d = buildPath(width, height, notch);

  return (
    <div style={{ width, height, position: 'relative', pointerEvents: 'none' }}>
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <path d={d} fill={backgroundColor} stroke={borderColor} strokeWidth={2.5} />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 16,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: labelColor,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          padding: '4px 14px',
          borderRadius: 8,
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export default ZoneNode;

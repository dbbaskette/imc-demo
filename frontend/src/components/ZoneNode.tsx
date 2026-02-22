import React from 'react';
import type { NodeProps } from 'reactflow';

interface ZoneNodeData {
  label: string;
  width: number;
  height: number;
  borderColor: string;
  backgroundColor: string;
  labelColor: string;
}

const ZoneNode: React.FC<NodeProps<ZoneNodeData>> = ({ data }) => {
  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        border: `2.5px solid ${data.borderColor}`,
        borderRadius: 16,
        backgroundColor: data.backgroundColor,
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 16,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: data.labelColor,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          padding: '4px 14px',
          borderRadius: 8,
          lineHeight: 1.2,
        }}
      >
        {data.label}
      </div>
    </div>
  );
};

export default ZoneNode;

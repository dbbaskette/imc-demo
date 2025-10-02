import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface TelemetryData {
  vehicleEvents: number;
  dataProcessor: number;
  hdfsSink: number;
  totalEvents: number;
}

interface Component {
  name: string;
  label: string;
  description: string;
  status: string;
  throughput: string;
}

interface EnhancedTelemetryProps {
  telemetryData: TelemetryData;
  components: Component[];
  onComponentClick: (componentName: string, url?: string) => void;
}

const EnhancedTelemetry: React.FC<EnhancedTelemetryProps> = ({
  telemetryData,
  components,
  onComponentClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [maxParticles, setMaxParticles] = useState(() => {
    const saved = localStorage.getItem('imc-particle-max-count');
    return saved ? parseInt(saved, 10) : 4;
  });

  useEffect(() => {
    // Listen for particle settings changes
    const handleSettingsChange = (event: CustomEvent) => {
      setMaxParticles(event.detail.maxParticles);
    };

    window.addEventListener('particle-settings-changed', handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener('particle-settings-changed', handleSettingsChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;

    // Create gradient definitions
    const defs = svg.append('defs');

    // Create gradient for connections
    const gradient = defs.append('linearGradient')
      .attr('id', 'flow-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop')
      .attr('offset', '0%')
      .style('stop-color', '#3b82f6')
      .style('stop-opacity', 0.6);

    gradient.append('stop')
      .attr('offset', '100%')
      .style('stop-color', '#10b981')
      .style('stop-opacity', 0.6);

    // Define component positions
    const positions = {
      vehicleEvents: { x: 100, y: height / 2 },
      dataProcessor: { x: width / 2, y: height / 2 },
      hdfsSink: { x: width - 100, y: height / 2 },
      rabbitMQ: { x: width / 2, y: height - 80 },
      dataLake: { x: width / 2, y: 80 }
    };

    // Draw connections
    const connections = [
      { from: positions.vehicleEvents, to: positions.dataProcessor },
      { from: positions.dataProcessor, to: positions.hdfsSink },
      { from: positions.vehicleEvents, to: positions.rabbitMQ },
      { from: positions.dataProcessor, to: positions.rabbitMQ },
      { from: positions.hdfsSink, to: positions.rabbitMQ },
      { from: positions.dataLake, to: positions.vehicleEvents },
      { from: positions.dataLake, to: positions.dataProcessor },
      { from: positions.hdfsSink, to: positions.dataLake }
    ];

    const connectionGroup = svg.append('g').attr('class', 'connections');

    connections.forEach(conn => {
      connectionGroup.append('line')
        .attr('x1', conn.from.x)
        .attr('y1', conn.from.y)
        .attr('x2', conn.to.x)
        .attr('y2', conn.to.y)
        .style('stroke', 'url(#flow-gradient)')
        .style('stroke-width', 2)
        .style('opacity', 0.3);
    });

    // Create particle animation
    const particleGroup = svg.append('g').attr('class', 'particles');

    connections.forEach((conn) => {
      for (let i = 0; i < maxParticles; i++) {
        const delay = (i * 1000) / maxParticles;

        const particle = particleGroup.append('circle')
          .attr('r', 3)
          .attr('fill', '#3b82f6')
          .attr('opacity', 0.8)
          .attr('cx', conn.from.x)
          .attr('cy', conn.from.y);

        const animate = () => {
          particle
            .transition()
            .delay(delay)
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('cx', conn.to.x)
            .attr('cy', conn.to.y)
            .attr('fill', '#10b981')
            .on('end', () => {
              particle
                .attr('cx', conn.from.x)
                .attr('cy', conn.from.y)
                .attr('fill', '#3b82f6');
              animate();
            });
        };

        animate();
      }
    });

    // Draw components
    const componentGroup = svg.append('g').attr('class', 'components');

    // Vehicle Events
    const vehicleGroup = componentGroup.append('g')
      .attr('transform', `translate(${positions.vehicleEvents.x}, ${positions.vehicleEvents.y})`)
      .style('cursor', 'pointer')
      .on('click', () => onComponentClick('vehicle-events'));

    vehicleGroup.append('rect')
      .attr('x', -60)
      .attr('y', -30)
      .attr('width', 120)
      .attr('height', 60)
      .attr('rx', 8)
      .attr('fill', '#1e293b')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2);

    vehicleGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -5)
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Vehicle Events');

    vehicleGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text(`${telemetryData.vehicleEvents} events/s`);

    // Data Processor
    const processorGroup = componentGroup.append('g')
      .attr('transform', `translate(${positions.dataProcessor.x}, ${positions.dataProcessor.y})`)
      .style('cursor', 'pointer')
      .on('click', () => onComponentClick('data-processor'));

    processorGroup.append('rect')
      .attr('x', -60)
      .attr('y', -30)
      .attr('width', 120)
      .attr('height', 60)
      .attr('rx', 8)
      .attr('fill', '#1e293b')
      .attr('stroke', '#8b5cf6')
      .attr('stroke-width', 2);

    processorGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -5)
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Data Processor');

    processorGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text(`${telemetryData.dataProcessor} events/s`);

    // HDFS Sink
    const hdfsGroup = componentGroup.append('g')
      .attr('transform', `translate(${positions.hdfsSink.x}, ${positions.hdfsSink.y})`)
      .style('cursor', 'pointer')
      .on('click', () => onComponentClick('hdfs-sink'));

    hdfsGroup.append('rect')
      .attr('x', -60)
      .attr('y', -30)
      .attr('width', 120)
      .attr('height', 60)
      .attr('rx', 8)
      .attr('fill', '#1e293b')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2);

    hdfsGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -5)
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('HDFS Sink');

    hdfsGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text(`${telemetryData.hdfsSink} events/s`);

    // RabbitMQ
    const rabbitGroup = componentGroup.append('g')
      .attr('transform', `translate(${positions.rabbitMQ.x}, ${positions.rabbitMQ.y})`)
      .style('cursor', 'pointer')
      .on('click', () => onComponentClick('rabbitmq'));

    rabbitGroup.append('rect')
      .attr('x', -70)
      .attr('y', -25)
      .attr('width', 140)
      .attr('height', 50)
      .attr('rx', 8)
      .attr('fill', '#1e293b')
      .attr('stroke', '#f97316')
      .attr('stroke-width', 2);

    rabbitGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 0)
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('RabbitMQ');

    rabbitGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 15)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text('Message Queue');

    // Data Lake
    const dataLakeGroup = componentGroup.append('g')
      .attr('transform', `translate(${positions.dataLake.x}, ${positions.dataLake.y})`)
      .style('cursor', 'pointer')
      .on('click', () => onComponentClick('data-lake'));

    dataLakeGroup.append('rect')
      .attr('x', -70)
      .attr('y', -25)
      .attr('width', 140)
      .attr('height', 50)
      .attr('rx', 8)
      .attr('fill', '#1e293b')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2);

    dataLakeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 0)
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Tanzu Data Lake');

    dataLakeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 15)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text('Storage');

  }, [telemetryData, components, onComponentClick, maxParticles]);

  return (
    <div className="p-8">
      <svg
        ref={svgRef}
        width="800"
        height="400"
        style={{ width: '100%', height: 'auto', maxWidth: '800px' }}
        viewBox="0 0 800 400"
      />
    </div>
  );
};

export default EnhancedTelemetry;
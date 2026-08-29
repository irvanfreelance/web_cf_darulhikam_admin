"use client";

import { useEffect } from 'react';
import useSWR from 'swr';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface DistributionMapProps {
  className?: string;
}

export default function DistributionMap({ className }: DistributionMapProps) {
  const { data: points } = useSWR('/api/web-distribution-points?active_only=true', fetcher);

  // Fix Leaflet container size issues on initial render
  useEffect(() => {
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
  }, []);

  return (
    <div className={cn("w-full h-full relative z-0", className)}>
      <MapContainer
        center={[-0.789275, 113.921327]}
        zoom={3}
        scrollWheelZoom={true}
        className="w-full h-full bg-[#f4f7f6]"
        minZoom={2}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={`https://api.maptiler.com/maps/topo-v4/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`}
        />

        {Array.isArray(points) && points.map((loc: any) => (
          <CircleMarker
            key={loc.id}
            center={[Number(loc.latitude), Number(loc.longitude)]}
            radius={loc.type === 'country' ? 8 : 6}
            pathOptions={{
              color: loc.type === 'country' ? '#4CAF50' : '#81C784', // Green tones
              fillColor: loc.type === 'country' ? '#4CAF50' : '#81C784',
              fillOpacity: 0.8,
              weight: 2
            }}
          >
            <Popup>
              <div className="font-bold text-slate-800 text-sm">{loc.name}</div>
              <div className="text-xs text-slate-500 capitalize">{loc.type === 'country' ? 'Negara' : loc.type === 'city' ? 'Kota' : 'Provinsi / Wilayah'}</div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

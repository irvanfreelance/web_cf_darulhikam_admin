"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { cn } from '@/lib/utils';

// Hardcoded locations matching the infographic "gambar 2"
const LOCATIONS = [
  // Indonesia Provinces (Central Point for simplicity)
  { name: 'Jawa Barat', pos: [-6.88917, 107.61056], type: 'province' },
  { name: 'DKI Jakarta', pos: [-6.21462, 106.84513], type: 'province' },
  { name: 'Banten', pos: [-6.40581, 106.06401], type: 'province' },
  { name: 'Jawa Tengah', pos: [-7.15097, 110.14025], type: 'province' },
  { name: 'Jawa Timur', pos: [-7.53606, 112.23840], type: 'province' },
  { name: 'Kalimantan', pos: [-1.48518, 113.28292], type: 'province' },
  { name: 'Sumatera', pos: [-0.58972, 101.34310], type: 'province' },
  { name: 'Bengkulu', pos: [-3.79284, 102.26076], type: 'province' },
  { name: 'Kepulauan Riau', pos: [3.94565, 108.14286], type: 'province' },
  { name: 'Sulawesi Barat', pos: [-2.84413, 119.23207], type: 'province' },
  { name: 'Sulawesi Selatan', pos: [-4.14491, 120.16055], type: 'province' },
  { name: 'Bali', pos: [-8.40951, 115.18891], type: 'province' },
  { name: 'Nusa Tenggara Timur', pos: [-8.65738, 121.07937], type: 'province' },
  { name: 'Maluku', pos: [-3.23846, 130.14527], type: 'province' },

  // Countries
  { name: 'Palestina', pos: [31.95216, 35.23315], type: 'country' },
  { name: 'Myanmar', pos: [21.91622, 95.95597], type: 'country' },
  { name: 'Jepang', pos: [36.20482, 138.25292], type: 'country' },
  { name: 'Uganda', pos: [1.37333, 32.29027], type: 'country' },
  { name: 'Yordania', pos: [31.24000, 36.51100], type: 'country' },
  { name: 'Mesir', pos: [26.82055, 30.80249], type: 'country' },
];

interface DistributionMapProps {
  className?: string;
}

export default function DistributionMap({ className }: DistributionMapProps) {
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {LOCATIONS.map((loc, idx) => (
          <CircleMarker 
            key={idx} 
            center={loc.pos as [number, number]} 
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
              <div className="text-xs text-slate-500 capitalize">{loc.type === 'country' ? 'Negara' : 'Provinsi / Wilayah'}</div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

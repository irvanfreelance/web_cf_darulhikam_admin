"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// leaflet-defaulticon-compatibility (imported above) already patches
// L.Icon.Default._getIconUrl to read the marker image from CSS — do NOT
// also `delete` it here, that removes the very fix the package installs
// and is what caused the "iconUrl not set" crash.

interface MapPointPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPointPicker({ lat, lng, onChange, className }: MapPointPickerProps) {
  const position: [number, number] = [lat, lng];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">Latitude</label>
          <Input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0, lng)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">Longitude</label>
          <Input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => onChange(lat, parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className={cn("w-full h-[350px] rounded-xl overflow-hidden border border-slate-200 relative z-0", className)}>
        <MapContainer
          center={position}
          zoom={4}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <ClickHandler onChange={onChange} />
          <Marker
            position={position}
            draggable
            eventHandlers={{
              dragend(e) {
                const marker = e.target;
                const pos = marker.getLatLng();
                onChange(pos.lat, pos.lng);
              },
            }}
          />
        </MapContainer>
      </div>
      <p className="text-xs text-slate-400">Klik di mana pun pada peta untuk menandai lokasi, atau geser marker untuk penyesuaian halus.</p>
    </div>
  );
}

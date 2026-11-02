"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { OSM_TILE_ATTRIBUTION, OSM_TILE_URL } from '@/lib/osm-tiles';

export type PetaPoint = {
  id: number;
  kode_beneficiary: string;
  nama_lengkap: string;
  latitude: string | number;
  longitude: string | number;
  status_verifikasi: string;
  kabupaten: string | null;
  nomor_pengajuan: string | null;
  request_status: string | null;
  judul: string | null;
};

const COLOR: Record<string, string> = {
  disbursed: '#059669',
  approved: '#0f766e',
  submitted: '#d97706',
  rejected: '#e11d48',
};

export default function PenyaluranMap({ points }: { points: PetaPoint[] }) {
  const first = points[0];
  const center: [number, number] = first ? [Number(first.latitude), Number(first.longitude)] : [-6.9175, 107.6191];
  return (
    <MapContainer center={center} zoom={first ? 8 : 5} scrollWheelZoom className="h-[520px] w-full">
      <TileLayer attribution={OSM_TILE_ATTRIBUTION} url={OSM_TILE_URL} maxZoom={19} />
      {points.map((point) => (
        <CircleMarker
          key={point.id}
          center={[Number(point.latitude), Number(point.longitude)]}
          radius={8}
          pathOptions={{ color: COLOR[point.request_status || ''] || '#64748b', fillOpacity: 0.85 }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{point.nama_lengkap}</div>
              <div>{point.kode_beneficiary} · {point.kabupaten || 'tanpa kabupaten'}</div>
              <div>{point.nomor_pengajuan ? `${point.nomor_pengajuan} (${point.request_status})` : 'Belum ada pengajuan'}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

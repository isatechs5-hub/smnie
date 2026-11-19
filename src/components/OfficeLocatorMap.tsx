import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface GeocodedOffice {
  id: string;
  label: string;
  address: string;
  shortAddress: string;
  phones: string[];
  email: string;
  position: { lat: number; lng: number } | null;
  formattedAddress: string;
}

const CameraController: React.FC<{ target: { lat: number; lng: number } | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (map && target) {
      map.panTo(target);
      map.setZoom(14);
    }
  }, [map, target]);
  return null;
};

export const OfficeLocatorMap: React.FC = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [offices, setOffices] = useState<GeocodedOffice[]>([]);
  const [selectedId, setSelectedId] = useState<string>('delhi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<{ offices: GeocodedOffice[]; quotaExceeded: boolean }>(
          '/api/maps/offices'
        );
        if (!active) return;
        if (data.quotaExceeded) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setOffices(data.offices || []);
      } catch (err) {
        console.error('Failed to load office locations:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedOffice = offices.find((o) => o.id === selectedId) || offices[0] || null;
  const locatedOffices = offices.filter((o) => o.position !== null);
  const initialCenter = selectedOffice?.position || locatedOffices[0]?.position || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Interactive Office Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Select NIEM office location">
          {offices.map((office) => (
            <button
              key={office.id}
              type="button"
              role="tab"
              aria-selected={selectedId === office.id}
              onClick={() => setSelectedId(office.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                selectedId === office.id
                  ? 'bg-[#0B2241] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-[#0B2241]'
              }`}
            >
              {office.label}
            </button>
          ))}
        </div>
        {selectedOffice && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              selectedOffice.address
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2241] hover:text-[#8F6A24] whitespace-nowrap shrink-0"
          >
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open in Google Maps</span>
          </a>
        )}
      </div>

      {/* Explicit-Height Map Container (CF2) */}
      <div
        data-testid="office-locator-map"
        className="relative h-[420px] w-full bg-slate-100"
      >
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-slate-500">
            Loading NIEM office locations...
          </div>
        ) : !apiKey ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
            <MapPin className="w-8 h-8 text-[#0B2241] mb-3" aria-hidden="true" />
            <p className="font-serif text-lg font-semibold text-[#0B2241] mb-1">
              {selectedOffice?.label || 'NIEM Head Office'}
            </p>
            <p className="text-sm text-slate-600 max-w-md mb-4">
              {selectedOffice?.shortAddress ||
                'H-96 Siddharth Building, No. 807 Nehru Place, New Delhi, 110019.'}
            </p>
            <p className="text-xs text-slate-500">
              Interactive map requires a configured Google Maps Platform API key.
            </p>
          </div>
        ) : (
          <APIProvider apiKey={apiKey} language="en" region="IN">
            <GoogleMap
              defaultCenter={initialCenter}
              defaultZoom={locatedOffices.length > 0 ? 13 : 5}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="cooperative"
              className="w-full h-full"
            >
              <CameraController target={selectedOffice?.position || null} />
              {locatedOffices.map((office) => (
                <AdvancedMarker
                  key={office.id}
                  position={office.position!}
                  title={office.label}
                  onClick={() => setSelectedId(office.id)}
                >
                  <Pin
                    background={selectedId === office.id ? '#0B2241' : '#8F6A24'}
                    borderColor="#FFFFFF"
                    glyphColor="#FFFFFF"
                  />
                </AdvancedMarker>
              ))}
              {selectedOffice?.position && (
                <InfoWindow
                  position={selectedOffice.position}
                  onCloseClick={() => setSelectedId('')}
                  headerContent={
                    <span className="font-serif font-semibold text-sm text-[#0B2241] pr-2">
                      {selectedOffice.label}
                    </span>
                  }
                >
                  <div className="pt-1 pb-2 pr-1 max-w-[260px] text-slate-800 space-y-1.5">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedOffice.shortAddress}
                    </p>
                    <p className="text-xs font-mono text-slate-700 leading-snug">
                      {selectedOffice.phones.join(' · ')}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </APIProvider>
        )}
      </div>
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import olcModule from 'open-location-code';

/* ── Teardown helper to avoid double-init in React Strict Mode ── */
const INDIA_CENTER = [20.5937, 78.9629];
const plusCodeApi = new olcModule.OpenLocationCode();

function makePin(color = '#00a877') {
  return L.divIcon({
    className: '',
    iconSize: [22, 34],
    iconAnchor: [11, 34],
    popupAnchor: [0, -36],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="34" viewBox="0 0 22 34">
      <path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 23 11 23S22 19.3 22 11C22 4.9 17.1 0 11 0z"
        fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="11" cy="11" r="4.5" fill="#fff" fill-opacity="0.92"/>
    </svg>`,
  });
}

function parsePin(locationPin) {
  if (!locationPin) return null;
  const parts = String(locationPin).split(',').map((v) => Number(v.trim()));
  if (
    parts.length === 2 &&
    !isNaN(parts[0]) &&
    !isNaN(parts[1]) &&
    Math.abs(parts[0]) <= 90 &&
    Math.abs(parts[1]) <= 180 &&
    (parts[0] !== 0 || parts[1] !== 0)
  ) {
    return parts;
  }
  return null;
}

function formatPin(lat, lng) {
  return `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
}

function extractCoordinatesFromText(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const direct = parsePin(raw);
  if (direct) return direct;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    const candidate = parsePin(`${match[1]},${match[2]}`);
    if (candidate) return candidate;
  }

  return null;
}

async function geocodeLocationQuery(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error('Could not verify this location right now.');
  }

  const results = await response.json();
  if (!Array.isArray(results) || !results.length) {
    return null;
  }

  const first = results[0];
  const coords = parsePin(`${first.lat},${first.lon}`);
  if (!coords) return null;

  return {
    coords,
    label: first.display_name || query,
    city: first.address?.city || first.address?.town || first.address?.county || '',
    state: first.address?.state || '',
  };
}

function extractPlusCodeParts(value) {
  if (!value) return null;
  const normalized = String(value).toUpperCase();
  const match = normalized.match(/\b([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3})\b/);
  if (!match) return null;

  const plusCode = match[1];
  const locality = String(value)
    .replace(match[1], ' ')
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*[,;-]\s*/, '')
    .trim();

  return { plusCode, locality };
}

function decodePlusCode(plusCode) {
  if (!plusCodeApi.isValid(plusCode) || !plusCodeApi.isFull(plusCode)) return null;
  const decoded = plusCodeApi.decode(plusCode);
  return [decoded.latitudeCenter, decoded.longitudeCenter];
}

async function resolveLocationInput(rawInput) {
  const direct = extractCoordinatesFromText(rawInput);
  if (direct) {
    return { coords: direct, label: 'Coordinates verified', city: '', state: '' };
  }

  const plusCodeInfo = extractPlusCodeParts(rawInput);
  if (plusCodeInfo) {
    if (plusCodeApi.isFull(plusCodeInfo.plusCode)) {
      const coords = decodePlusCode(plusCodeInfo.plusCode);
      if (coords) {
        return {
          coords,
          label: plusCodeInfo.locality ? `${plusCodeInfo.plusCode} ${plusCodeInfo.locality}` : plusCodeInfo.plusCode,
          city: '',
          state: '',
        };
      }
    }

    if (plusCodeApi.isShort(plusCodeInfo.plusCode) && plusCodeInfo.locality) {
      const reference = await geocodeLocationQuery(plusCodeInfo.locality);
      if (reference) {
        const recoveredCode = plusCodeApi.recoverNearest(
          plusCodeInfo.plusCode,
          reference.coords[0],
          reference.coords[1]
        );
        const coords = decodePlusCode(recoveredCode);
        if (coords) {
          return {
            coords,
            label: reference.label,
            city: reference.city,
            state: reference.state,
          };
        }
      }
    }
  }

  return geocodeLocationQuery(rawInput.trim());
}

/* ──────────────────────────────────────────────────────────────
   StationMap – read-only, shows all station pins.
   Auto-fits to all markers. Popup on click.
────────────────────────────────────────────────────────────── */
export function StationMap({ stations = [], height = '320px', onMarkerClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  /* Init map once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: INDIA_CENTER,
      zoom: 5,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  /* Sync markers whenever stations change */
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const valid = stations.filter((s) => parsePin(s.locationPin));

    valid.forEach((station) => {
      const ll = parsePin(station.locationPin);
      const color = station.status === 'Active' ? '#00a877' : '#94a3b8';
      const marker = L.marker(ll, { icon: makePin(color) })
        .bindPopup(
          `<div style="font-size:12px;line-height:1.6;min-width:140px">
            <strong style="font-size:13px">${station.name}</strong><br/>
            <span style="color:#888;font-family:monospace">${station.id}</span><br/>
            ${station.city ? `<span>${station.city}${station.state ? `, ${station.state}` : ''}</span><br/>` : ''}
            <span style="color:${station.status === 'Active' ? '#00a877' : '#999'};font-weight:600">${station.status}</span>
          </div>`,
          { maxWidth: 220 }
        )
        .addTo(mapRef.current);

      if (onMarkerClick) marker.on('click', () => onMarkerClick(station));
      markersRef.current.push(marker);
    });

    if (valid.length === 1) {
      mapRef.current.setView(parsePin(valid[0].locationPin), 15);
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(valid.map((s) => parsePin(s.locationPin)));
      mapRef.current.fitBounds(bounds, { padding: [52, 52] });
    }

    /* Allow DOM to settle before resize fix */
    setTimeout(() => mapRef.current?.invalidateSize(), 120);
  }, [stations]);

  return (
    <div className="station-map-wrap">
      <div className="station-map-canvas">
        <div ref={containerRef} style={{ height, width: '100%' }} />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   LocationPickerMap – interactive, click-to-place + draggable.
   Typing in the input does NOT move the map.
   Click "Verify on Map" to plot the typed coordinates.
   Clicking the map or dragging the marker updates instantly.
────────────────────────────────────────────────────────────── */
export function LocationPickerMap({ locationPin, onLocationChange, onLocationResolved, height = '260px' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  /* Keep the callback ref fresh so stale closures inside useEffect always
     call the latest onLocationChange without re-running the init effect */
  const callbackRef = useRef(onLocationChange);
  useEffect(() => { callbackRef.current = onLocationChange; }, [onLocationChange]);
    const resolvedCallbackRef = useRef(onLocationResolved);
    useEffect(() => { resolvedCallbackRef.current = onLocationResolved; }, [onLocationResolved]);

  /* Local draft state – typed text stays here until Verify is clicked */
  const [inputDraft, setInputDraft] = useState(locationPin || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyMeta, setVerifyMeta] = useState('');

  useEffect(() => {
    setInputDraft(locationPin || '');
  }, [locationPin]);

  const placeMarker = (map, ll) => {
    if (markerRef.current) {
      markerRef.current.setLatLng(ll);
    } else {
      markerRef.current = L.marker(ll, {
        icon: makePin('#00a877'),
        draggable: true,
      }).addTo(map);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        const pinStr = formatPin(pos.lat, pos.lng);
        /* setInputDraft setter is stable across renders – safe inside stale closure */
        setInputDraft(pinStr);
        setVerifyError('');
        setVerifyMeta('Pin adjusted on map');
        callbackRef.current(pinStr);
      });
    }
  };

  /* Init map once – Modal remounts children on reopen so this starts fresh */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initCoords = parsePin(locationPin);
    mapRef.current = L.map(containerRef.current, {
      center: initCoords || INDIA_CENTER,
      zoom: initCoords ? 15 : 5,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    if (initCoords) placeMarker(mapRef.current, initCoords);

    mapRef.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const pinStr = formatPin(lat, lng);
      placeMarker(mapRef.current, [lat, lng]);
      setInputDraft(pinStr);
      setVerifyError('');
      setVerifyMeta('Pin placed from map');
      callbackRef.current(pinStr);
    });

    setTimeout(() => mapRef.current?.invalidateSize(), 150);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Verify: plot the typed coordinates on the map */
  const commitVerifiedLocation = (ll, sourceLabel, meta = null) => {
    if (!mapRef.current) return;
    const pinStr = formatPin(ll[0], ll[1]);
    placeMarker(mapRef.current, ll);
    const zoom = mapRef.current.getZoom();
    mapRef.current.setView(ll, zoom < 12 ? 14 : zoom);
    setInputDraft(pinStr);
    setVerifyError('');
    setVerifyMeta(sourceLabel || 'Location verified');
    callbackRef.current(pinStr);
    if (resolvedCallbackRef.current) {
      resolvedCallbackRef.current({
        locationPin: pinStr,
        label: meta?.label || sourceLabel || '',
        city: meta?.city || '',
        state: meta?.state || '',
      });
    }
  };

  const handleVerify = async () => {
    if (!inputDraft.trim() || !mapRef.current || isVerifying) return;

    setIsVerifying(true);
    setVerifyError('');
    setVerifyMeta('Searching location...');

    try {
      const result = await resolveLocationInput(inputDraft.trim());
      if (!result) {
        setVerifyError('Location not found. Paste coordinates, a map link, or a more specific address.');
        setVerifyMeta('');
        return;
      }

      commitVerifiedLocation(result.coords, 'Location verified on map', result);
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : 'Could not verify this location.');
      setVerifyMeta('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePaste = (event) => {
    const input = event.currentTarget;
    window.requestAnimationFrame(() => {
      const ll = extractCoordinatesFromText(input.value || '');
      if (!ll || !mapRef.current) return;
      commitVerifiedLocation(ll, 'Coordinates verified from paste');
    });
  };

  return (
    <div className="station-map-wrap station-map-picker">
      <div className="station-map-canvas">
        <div ref={containerRef} style={{ height, width: '100%' }} />
      </div>
      <div className="station-map-controls">
        <input
          className="setting-input station-map-coord-input"
          value={inputDraft}
          onChange={(e) => {
            setInputDraft(e.target.value);
            setVerifyError('');
            setVerifyMeta('');
          }}
          onPaste={handlePaste}
          placeholder="Paste coordinates, map link, plus code, or address"
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
        <button
          className="btn-verify-pin"
          type="button"
          onClick={handleVerify}
          disabled={!inputDraft.trim() || isVerifying}
          title="Verify this location and plot it on the map"
        >
          <i className={`fa ${isVerifying ? 'fa-spinner fa-spin' : 'fa-location-dot'}`}></i> {isVerifying ? 'Verifying...' : 'Verify on Map'}
        </button>
      </div>
      {(verifyMeta || verifyError) && (
        <div className={`station-map-status${verifyError ? ' error' : ''}`}>
          <i className={`fa ${verifyError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          {verifyError || verifyMeta}
        </div>
      )}
      <div className="station-map-hint">
        <i className="fa fa-location-crosshairs" style={{ color: 'var(--brand)' }}></i>
        Click map to place pin · Drag to adjust · Or paste coordinates, a map link, plus code, or address and click Verify
      </div>
    </div>
  );
}

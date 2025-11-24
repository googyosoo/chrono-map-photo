import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates } from '../types';

// Use CDN URLs for Leaflet markers to avoid bundler image import issues
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapControllerProps {
  onLocationSelect: (coords: Coordinates) => void;
  selectedLocation: Coordinates | null;
}

// Component to handle map clicks and fly animation
const MapEventsHandler: React.FC<{ 
  onSelect: (c: Coordinates) => void 
}> = ({ onSelect }) => {
  const map = useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      // Note: Actual flying is handled by MapUpdater to react to state changes consistently
    },
  });
  return null;
};

// Component to programmatically move the map when selectedLocation changes
const MapUpdater: React.FC<{ center: Coordinates | null }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      // Smooth fly to the location with a specific zoom level for "arrival" effect
      map.flyTo([center.lat, center.lng], 13, {
        animate: true,
        duration: 2.0, // Seconds
        easeLinearity: 0.25
      });
    }
  }, [center, map]);

  // Handle resize events to ensure tiles load correctly if window changes
  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  return null;
};

export const MapController: React.FC<MapControllerProps> = ({ onLocationSelect, selectedLocation }) => {
  return (
    <div className="h-full w-full absolute inset-0 z-0">
      <MapContainer 
        center={[20, 0]} 
        zoom={3} 
        scrollWheelZoom={true} 
        className="h-full w-full"
        zoomControl={false}
        style={{ height: '100%', width: '100%' }} // Explicit style for safety
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapEventsHandler onSelect={onLocationSelect} />
        <MapUpdater center={selectedLocation} />
        
        {selectedLocation && <Marker position={selectedLocation} />}
      </MapContainer>
    </div>
  );
};
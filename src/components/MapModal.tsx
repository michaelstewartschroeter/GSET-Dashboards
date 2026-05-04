import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, latitude, longitude, title, description }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-dark-card border border-dark-border rounded-lg shadow-xl w-full max-w-4xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Map */}
        <div className="h-[500px] w-full">
          <MapContainer
            center={[latitude, longitude]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude, longitude]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{title}</div>
                  {description && <div className="text-gray-600 mt-1">{description}</div>}
                  <div className="text-gray-500 mt-1">
                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-border bg-dark-bg">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-cyan hover:bg-primary-cyan/80 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;

"use client";
import { Area } from "@/lib/crisis/types";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_ID  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

function OsmMap({ area }: { area: Area }) {
  const b = [area.lng - 0.08, area.lat - 0.06, area.lng + 0.08, area.lat + 0.06].join(",");
  return (
    <div className="w-full h-60 rounded-lg border border-neutral-800 overflow-hidden">
      <iframe
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${b}&layer=mapnik&marker=${area.lat},${area.lng}`}
        className="w-full h-full"
        title={`Map: ${area.label}`}
        loading="lazy"
      />
    </div>
  );
}

export function CrisisMap({ area }: { area: Area }) {
  if (!API_KEY) return <OsmMap area={area} />;
  return (
    <div className="w-full h-60 rounded-lg border border-neutral-800 overflow-hidden">
      <APIProvider apiKey={API_KEY}>
        <Map
          key={area.id}
          defaultCenter={{ lat: area.lat, lng: area.lng }}
          defaultZoom={13}
          mapId={MAP_ID}
          colorScheme="DARK"
          gestureHandling="greedy"
          style={{ width: "100%", height: "100%" }}
        >
          {MAP_ID && <AdvancedMarker position={{ lat: area.lat, lng: area.lng }} />}
        </Map>
      </APIProvider>
    </div>
  );
}

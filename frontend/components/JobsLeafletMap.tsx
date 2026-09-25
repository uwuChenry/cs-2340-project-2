"use client";

// Leaflet reads `window` as soon as it is imported, so this module must only ever
// load in the browser. Import it through next/dynamic with { ssr: false }.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Job } from "@/lib/types";

// Geographic centre of the contiguous US, shown until there are pins to fit.
const US_CENTER: [number, number] = [39.8, -98.6];

// A divIcon rather than Leaflet's default marker: the default one loads its image
// from a path the bundler rewrites, which leaves a broken image in Next.
function pinIcon(job: Job) {
  const label = job.salaryLow === null ? "—" : `$${job.salaryLow}k`;
  return L.divIcon({
    className: "",
    iconSize: [56, 24],
    iconAnchor: [28, 24],
    popupAnchor: [0, -24],
    html: `<span style="display:inline-block;background:#FFFFFF;color:#1A1917;border:1px solid #C6CCEC;border-radius:999px;padding:4px 9px;font:600 12px ui-monospace,monospace;box-shadow:0 2px 6px rgba(26,25,23,0.12);white-space:nowrap">${label}</span>`,
  });
}

// Zooms to fit every pin whenever the set of pinned jobs changes (new filters,
// "Show more roles"), but not on unrelated re-renders.
function FitToJobs({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
    // `key` stands in for `points`, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

// Leaflet measures its container once, on mount. Switching Split -> Map widens
// the container without telling Leaflet, so it only draws tiles for the old
// width. Re-measuring on every resize keeps the whole map filled in.
function ResizeWithContainer() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function JobsLeafletMap({
  jobs,
  onOpenJob,
}: {
  jobs: Job[];
  onOpenJob: (jobId: string) => void;
}) {
  // Remote roles, and postings the geocoder could not place, have no pin.
  const pinned = jobs.filter((j) => j.latitude !== null && j.longitude !== null);
  const points = pinned.map((j) => [j.latitude, j.longitude] as [number, number]);
  const unpinned = jobs.length - pinned.length;

  return (
    <div className="relative bg-surface border border-line rounded-xl overflow-hidden">
      <MapContainer center={US_CENTER} zoom={4} scrollWheelZoom style={{ height: 520 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((job) => (
          <Marker key={job.id} position={[job.latitude!, job.longitude!]} icon={pinIcon(job)}>
            <Popup>
              <div className="text-[13px] leading-[1.45]">
                <div className="font-semibold text-ink">{job.title}</div>
                <div className="text-muted">
                  {job.company} · {job.location}
                </div>
                <button
                  onClick={() => onOpenJob(job.id)}
                  className="mt-2 border-0 bg-transparent p-0 text-accent underline cursor-pointer"
                >
                  View listing
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitToJobs points={points} />
        <ResizeWithContainer />
      </MapContainer>

      {unpinned > 0 && (
        // Leaflet's panes sit at z-index 400+, so the overlay has to clear them.
        <div className="absolute left-3.5 bottom-3.5 z-[1000] bg-white/95 border border-line rounded-[9px] px-3 py-2 text-[11.5px] text-muted">
          {unpinned} remote or unpinned {unpinned === 1 ? "role" : "roles"}, not shown
        </div>
      )}
    </div>
  );
}

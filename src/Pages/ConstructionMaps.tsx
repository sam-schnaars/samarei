import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./ConstructionMaps.module.css";

/**
 * Live maps of where five major US cities are building, from each city's open
 * building-permit data. Each dot is a permitted site; size & color encode the
 * project's relative scale (dollar value, or housing units where no $ exists).
 * Tap a dot for details, switch cities up top.
 *
 * Each city is just a config: an open-data (Socrata) endpoint plus a row parser
 * and a query builder. Adding another city is a matter of adding an entry.
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAP_BOX_API_KEY as string | undefined;
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const ROW_LIMIT = 8000;

type WindowDays = 90 | 180 | 365 | 1095;

const WINDOWS: { label: string; value: WindowDays }[] = [
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 },
  { label: "3 years", value: 1095 },
];

type Permit = {
  id: string;
  lng: number;
  lat: number;
  address: string;
  description: string;
  type: string;
  status: string;
  neighborhood: string | null;
  cost: number | null;
  units: number | null;
  /** Normalized 0..1 scale used for dot size/color, city-relative. */
  weight: number;
};

type RawRow = Record<string, unknown>;

type CityConfig = {
  key: string;
  label: string;
  endpoint: string;
  center: { lng: number; lat: number; zoom: number };
  /** SoQL WHERE fragments that define an "active construction" permit. */
  activeWhere: string[];
  /** Field used to filter by recency. Omit for snapshot datasets. */
  dateField?: string;
  /** Whether the city publishes a dollar value (drives stat labels/legend). */
  hasCost: boolean;
  selectFields: string;
  order?: string;
  parse: (r: RawRow) => Permit | null;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Linear interpolation across (input, output) stops, clamped at the ends. */
function lerpStops(value: number, stops: [number, number][]): number {
  if (value <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i++) {
    const [x0, y0] = stops[i - 1];
    const [x1, y1] = stops[i];
    if (value <= x1) return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1];
}

const COST_STOPS: [number, number][] = [
  [0, 0.05],
  [250_000, 0.35],
  [2_000_000, 0.65],
  [20_000_000, 1],
];
const UNIT_STOPS: [number, number][] = [
  [0, 0.1],
  [5, 0.4],
  [30, 0.7],
  [200, 1],
];

const costWeight = (cost: number) => lerpStops(cost, COST_STOPS);
const unitWeight = (units: number) => lerpStops(units, UNIT_STOPS);

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const CITIES: CityConfig[] = [
  {
    key: "sf",
    label: "San Francisco",
    endpoint: "https://data.sfgov.org/resource/i98e-djp9.json",
    center: { lng: -122.4441, lat: 37.7596, zoom: 11.4 },
    activeWhere: ["location IS NOT NULL", "status in('issued','reinstated','approved')"],
    dateField: "issued_date",
    hasCost: true,
    selectFields:
      "permit_number,street_number,street_name,street_suffix,description," +
      "permit_type_definition,status,neighborhoods_analysis_boundaries," +
      "estimated_cost,revised_cost,proposed_units,location",
    order: "revised_cost DESC",
    parse: (r) => {
      const c = (r.location as { coordinates?: [number, number] })?.coordinates;
      if (!c) return null;
      const cost = num(r.revised_cost) || num(r.estimated_cost);
      const units = r.proposed_units != null ? num(r.proposed_units) : null;
      return {
        id: str(r.permit_number) || `${c[0]},${c[1]}`,
        lng: c[0],
        lat: c[1],
        address: [r.street_number, r.street_name, r.street_suffix].map(str).filter(Boolean).join(" ") || "Address not listed",
        description: str(r.description),
        type: str(r.permit_type_definition) || "permit",
        status: str(r.status) || "issued",
        neighborhood: str(r.neighborhoods_analysis_boundaries) || null,
        cost,
        units,
        weight: costWeight(cost),
      };
    },
  },
  {
    key: "nyc",
    label: "New York",
    endpoint: "https://data.cityofnewyork.us/resource/rbx6-tga4.json",
    center: { lng: -73.9712, lat: 40.72, zoom: 10.2 },
    activeWhere: ["latitude IS NOT NULL", "permit_status='Permit Issued'"],
    hasCost: true,
    selectFields:
      "house_no,street_name,job_description,work_type,estimated_job_costs," +
      "permit_status,nta,borough,latitude,longitude,job_filing_number",
    order: "estimated_job_costs DESC",
    parse: (r) => {
      const lat = num(r.latitude);
      const lng = num(r.longitude);
      if (!lat || !lng) return null;
      const cost = num(r.estimated_job_costs);
      return {
        id: str(r.job_filing_number) || `${lng},${lat}`,
        lng,
        lat,
        address: [r.house_no, titleCase(str(r.street_name))].map(str).filter(Boolean).join(" ") || "Address not listed",
        description: str(r.job_description),
        type: str(r.work_type) || "permit",
        status: "issued",
        neighborhood: str(r.nta) || titleCase(str(r.borough)) || null,
        cost,
        units: null,
        weight: costWeight(cost),
      };
    },
  },
  {
    key: "la",
    label: "Los Angeles",
    endpoint: "https://data.lacity.org/resource/pi9x-tg5x.json",
    center: { lng: -118.33, lat: 34.07, zoom: 9.4 },
    activeWhere: ["lat IS NOT NULL", "status_desc='Issued'"],
    dateField: "issue_date",
    hasCost: true,
    selectFields:
      "permit_nbr,primary_address,work_desc,permit_type,use_desc,valuation," +
      "status_desc,cpa,du_changed,lat,lon,issue_date",
    order: "valuation DESC",
    parse: (r) => {
      const lat = num(r.lat);
      const lng = num(r.lon);
      if (!lat || !lng) return null;
      const cost = num(r.valuation);
      const units = r.du_changed != null ? num(r.du_changed) : null;
      return {
        id: str(r.permit_nbr) || `${lng},${lat}`,
        lng,
        lat,
        address: titleCase(str(r.primary_address)) || "Address not listed",
        description: str(r.work_desc) || str(r.use_desc),
        type: str(r.permit_type) || "permit",
        status: "issued",
        neighborhood: str(r.cpa) || null,
        cost,
        units,
        weight: costWeight(cost),
      };
    },
  },
  {
    key: "chicago",
    label: "Chicago",
    endpoint: "https://data.cityofchicago.org/resource/ydr8-5enu.json",
    center: { lng: -87.6298, lat: 41.84, zoom: 10 },
    activeWhere: ["latitude IS NOT NULL", "permit_type NOT IN('PERMIT - SIGNS')"],
    dateField: "issue_date",
    hasCost: true,
    selectFields:
      "permit_,street_number,street_direction,street_name,work_description," +
      "permit_type,reported_cost,latitude,longitude,issue_date",
    order: "reported_cost DESC",
    parse: (r) => {
      const lat = num(r.latitude);
      const lng = num(r.longitude);
      if (!lat || !lng) return null;
      const cost = num(r.reported_cost);
      return {
        id: str(r.permit_) || `${lng},${lat}`,
        lng,
        lat,
        address:
          [r.street_number, r.street_direction, titleCase(str(r.street_name))].map(str).filter(Boolean).join(" ") ||
          "Address not listed",
        description: str(r.work_description),
        type: titleCase(str(r.permit_type).replace("PERMIT - ", "")) || "permit",
        status: "issued",
        neighborhood: null,
        cost,
        units: null,
        weight: costWeight(cost),
      };
    },
  },
  {
    key: "seattle",
    label: "Seattle",
    endpoint: "https://data.seattle.gov/resource/76t5-zqzr.json",
    center: { lng: -122.3321, lat: 47.62, zoom: 10.6 },
    activeWhere: ["latitude IS NOT NULL", "statuscurrent='Issued'"],
    hasCost: false,
    selectFields:
      "permitnum,originaladdress1,description,permitclassmapped,permittypedesc," +
      "housingunits,statuscurrent,latitude,longitude",
    order: "housingunits DESC",
    parse: (r) => {
      const lat = num(r.latitude);
      const lng = num(r.longitude);
      if (!lat || !lng) return null;
      const units = r.housingunits != null ? num(r.housingunits) : null;
      return {
        id: str(r.permitnum) || `${lng},${lat}`,
        lng,
        lat,
        address: titleCase(str(r.originaladdress1)) || "Address not listed",
        description: str(r.description),
        type: str(r.permittypedesc) || str(r.permitclassmapped) || "permit",
        status: "issued",
        neighborhood: null,
        cost: null,
        units,
        weight: unitWeight(units ?? 0),
      };
    },
  },
];

function isoCutoff(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 19);
}

function buildUrl(city: CityConfig, windowDays: WindowDays): string {
  const where = [...city.activeWhere];
  if (city.dateField) where.push(`${city.dateField} > '${isoCutoff(windowDays)}'`);
  const params = new URLSearchParams({
    $select: city.selectFields,
    $where: where.join(" AND "),
    $limit: String(ROW_LIMIT),
  });
  if (city.order) params.set("$order", city.order);
  return `${city.endpoint}?${params.toString()}`;
}

function useCityData(city: CityConfig, windowDays: WindowDays) {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(buildUrl(city, windowDays))
      .then((res) => {
        if (!res.ok) throw new Error(`${city.label} data returned ${res.status}`);
        return res.json() as Promise<RawRow[]>;
      })
      .then((rows) => {
        if (cancelled) return;
        setPermits(rows.map(city.parse).filter((p): p is Permit => p !== null));
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load permit data");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city, windowDays]);

  return { permits, loading, error };
}

const circleLayer: LayerProps = {
  id: "construction-points",
  type: "circle",
  source: "permits",
  paint: {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      10,
      ["interpolate", ["linear"], ["get", "w"], 0, 1.6, 1, 5],
      14,
      ["interpolate", ["linear"], ["get", "w"], 0, 3.2, 1, 11],
      17,
      ["interpolate", ["linear"], ["get", "w"], 0, 6, 1, 24],
    ],
    "circle-color": [
      "interpolate",
      ["linear"],
      ["get", "w"],
      0,
      "#3aa0a0",
      0.35,
      "#78c85a",
      0.65,
      "#ffb020",
      1,
      "#ff5c30",
    ],
    "circle-stroke-color": "rgba(255,255,255,0.85)",
    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 15, 0.9],
    "circle-opacity": 0.88,
  },
};

function formatCost(cost: number): string {
  if (cost >= 1_000_000) return `$${(cost / 1_000_000).toFixed(1)}M`;
  if (cost >= 1_000) return `$${Math.round(cost / 1_000)}K`;
  return `$${Math.round(cost)}`;
}

function formatTotalValue(total: number): string {
  if (total >= 1_000_000_000) return `$${(total / 1_000_000_000).toFixed(1)}B`;
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(0)}M`;
  return `$${Math.round(total / 1_000)}K`;
}

export default function ConstructionMaps() {
  const mapRef = useRef<MapRef>(null);
  const [cityKey, setCityKey] = useState("sf");
  const [windowDays, setWindowDays] = useState<WindowDays>(180);
  const [satellite, setSatellite] = useState(false);
  const [selected, setSelected] = useState<Permit | null>(null);
  const [cursor, setCursor] = useState<string>("grab");

  const city = useMemo(() => CITIES.find((c) => c.key === cityKey) ?? CITIES[0], [cityKey]);
  const { permits, loading, error } = useCityData(city, windowDays);

  // Recenter when the city changes; clear any open popup.
  useEffect(() => {
    setSelected(null);
    const map = mapRef.current?.getMap();
    if (map) {
      // The map mounts inside a card that animates open, so its first paint can
      // land at a stale size — resize before moving so tiles always draw.
      map.resize();
      map.flyTo({
        center: [city.center.lng, city.center.lat],
        zoom: city.center.zoom,
        duration: 900,
      });
    }
  }, [city]);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: permits.map((p) => ({
        type: "Feature" as const,
        id: p.id,
        properties: { id: p.id, w: p.weight },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    }),
    [permits]
  );

  const byId = useMemo(() => {
    const m = new Map<string, Permit>();
    for (const p of permits) m.set(p.id, p);
    return m;
  }, [permits]);

  const stats = useMemo(() => {
    const totalValue = permits.reduce((sum, p) => sum + (p.cost ?? 0), 0);
    const units = permits.reduce((sum, p) => sum + (p.units ?? 0), 0);
    const byHood = new Map<string, number>();
    for (const p of permits) {
      if (p.neighborhood) byHood.set(p.neighborhood, (byHood.get(p.neighborhood) ?? 0) + 1);
    }
    const topHoods = [...byHood.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { totalValue, units, topHoods };
  }, [permits]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={styles.root}>
        <div className={styles.mapMissing}>
          <div>
            <strong>Missing Mapbox token.</strong>
            <p>
              Set <code>VITE_MAP_BOX_API_KEY</code> in <code>.env</code> to render the map.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleClick = (e: MapMouseEvent) => {
    const feature = e.features?.[0] as { properties?: { id?: string } } | undefined;
    const id = feature?.properties?.id;
    setSelected(id && byId.has(id) ? byId.get(id)! : null);
  };

  return (
    <div className={styles.root}>
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={city.center}
        mapStyle={satellite ? SATELLITE_STYLE : DARK_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        interactiveLayerIds={["construction-points"]}
        cursor={cursor}
        onLoad={(e) => {
          const map = e.target;
          map.resize();
          // The card animates open, so the first frame can paint blank. A tiny
          // camera nudge after layout settles forces tiles to load.
          setTimeout(() => {
            map.resize();
            map.easeTo({
              center: [city.center.lng, city.center.lat],
              zoom: city.center.zoom + 0.01,
              duration: 350,
            });
          }, 120);
        }}
        onClick={handleClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("grab")}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="permits" type="geojson" data={geojson}>
          <Layer {...circleLayer} />
        </Source>

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={14}
            closeButton={false}
            closeOnClick={false}
            onClose={() => setSelected(null)}
            className={styles.popup}
            maxWidth="300px"
          >
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardCost}>
                  {selected.cost != null
                    ? formatCost(selected.cost)
                    : selected.units
                    ? `${selected.units} units`
                    : "Permit"}
                </span>
                <span className={styles.cardStatus}>{selected.status}</span>
              </div>
              <h3>{selected.address}</h3>
              <p className={styles.cardType}>{selected.type}</p>
              {selected.description && <p className={styles.cardDesc}>{selected.description}</p>}
              <div className={styles.cardMeta}>
                {selected.neighborhood && <span>📍 {selected.neighborhood}</span>}
                {selected.units ? <span>🏠 {selected.units} units</span> : null}
              </div>
            </div>
          </Popup>
        )}
      </MapGL>

      <div className={`${styles.panel} ${styles.cities}`}>
        {CITIES.map((c) => (
          <button
            key={c.key}
            className={`${styles.cityBtn} ${c.key === cityKey ? styles.cityBtnActive : ""}`}
            onClick={() => setCityKey(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={`${styles.panel} ${styles.basemap}`}>
        <button
          className={`${styles.basemapBtn} ${!satellite ? styles.basemapBtnActive : ""}`}
          onClick={() => setSatellite(false)}
        >
          Map
        </button>
        <button
          className={`${styles.basemapBtn} ${satellite ? styles.basemapBtnActive : ""}`}
          onClick={() => setSatellite(true)}
        >
          Satellite
        </button>
      </div>

      <aside className={`${styles.panel} ${styles.stats}`}>
        {city.dateField ? (
          <div className={styles.windows}>
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                className={`${styles.windowBtn} ${windowDays === w.value ? styles.windowBtnActive : ""}`}
                onClick={() => setWindowDays(w.value)}
              >
                {w.label}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.windowNote}>current issued permits</div>
        )}

        {loading ? (
          <div className={styles.statsLoading}>Loading permits…</div>
        ) : error ? (
          <div className={styles.statsError}>⚠ {error}</div>
        ) : (
          <>
            <div className={styles.statGrid}>
              <div className={styles.stat}>
                <span className={styles.statNum}>{permits.length.toLocaleString()}</span>
                <span className={styles.statLabel}>active sites</span>
              </div>
              {city.hasCost && (
                <div className={styles.stat}>
                  <span className={styles.statNum}>{formatTotalValue(stats.totalValue)}</span>
                  <span className={styles.statLabel}>declared value</span>
                </div>
              )}
              {stats.units > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statNum}>{stats.units.toLocaleString()}</span>
                  <span className={styles.statLabel}>{city.hasCost ? "proposed units" : "housing units"}</span>
                </div>
              )}
            </div>

            {stats.topHoods.length > 0 && (
              <div className={styles.hoods}>
                <span className={styles.hoodsTitle}>Hottest neighborhoods</span>
                {stats.topHoods.map(([name, count]) => {
                  const max = stats.topHoods[0][1];
                  return (
                    <div key={name} className={styles.hoodRow}>
                      <span className={styles.hoodName}>{name}</span>
                      <span className={styles.hoodBar}>
                        <span className={styles.hoodBarFill} style={{ width: `${(count / max) * 100}%` }} />
                      </span>
                      <span className={styles.hoodCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </aside>

      <div className={`${styles.panel} ${styles.legend}`}>
        <span className={styles.legendTitle}>{city.hasCost ? "Project value" : "Housing units"}</span>
        <div className={styles.legendScale} />
        <div className={styles.legendLabels}>
          <span>small</span>
          <span>{city.hasCost ? "$2M+" : "30+"}</span>
          <span>major</span>
        </div>
        <p className={styles.legendNote}>
          Each dot is a permitted construction site, sized and colored by{" "}
          {city.hasCost ? "project value" : "housing units"}. Tap any dot for details.
        </p>
      </div>
    </div>
  );
}

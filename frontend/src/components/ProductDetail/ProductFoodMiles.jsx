import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  LuArrowRightLeft,
  LuMapPinned,
  LuRoute,
  LuSearch,
  LuTriangleAlert,
} from "react-icons/lu";
import apiClient from "../../utils/apiClient";
import styles from "./ProductFoodMiles.module.css";
import "leaflet/dist/leaflet.css";

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);

  return null;
}

export default function ProductFoodMiles({ product }) {
  const [postcodeInput, setPostcodeInput] = useState("");
  const [activePostcode, setActivePostcode] = useState("");
  const [foodMilesData, setFoodMilesData] = useState(null);
  const [comparisonData, setComparisonData] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [loadingCompare, setLoadingCompare] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFoodMiles() {
      try {
        setLoadingRoute(true);
        setError("");

        const params = activePostcode ? { postcode: activePostcode } : {};
        const { data } = await apiClient.get(`/food-miles/products/${product.id}/`, {
          params,
        });

        setFoodMilesData(data);
        setPostcodeInput(data.customer_postcode);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load food miles.");
        setFoodMilesData(null);
      } finally {
        setLoadingRoute(false);
      }
    }

    if (product?.id) {
      loadFoodMiles();
    }
  }, [product, activePostcode]);

  useEffect(() => {
    async function loadComparison() {
      try {
        setLoadingCompare(true);

        const params = activePostcode ? { postcode: activePostcode } : {};
        const { data } = await apiClient.get(
          `/food-miles/products/${product.id}/compare/`,
          { params }
        );

        setComparisonData(data.results ?? []);
      } catch {
        setComparisonData([]);
      } finally {
        setLoadingCompare(false);
      }
    }

    if (product?.id) {
      loadComparison();
    }
  }, [product, activePostcode]);

  function handleSubmit(e) {
    e.preventDefault();
    const cleaned = postcodeInput.trim().toUpperCase();
    if (!cleaned) return;
    setActivePostcode(cleaned);
  }

  const mapPoints = useMemo(() => {
    if (!foodMilesData?.producer_location || !foodMilesData?.customer_location) return [];
    return [
      [foodMilesData.producer_location.lat, foodMilesData.producer_location.lon],
      [foodMilesData.customer_location.lat, foodMilesData.customer_location.lon],
    ];
  }, [foodMilesData]);

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>Sustainability</p>
          <h2>Food miles</h2>
          <p className={styles.subtitle}>
            See the route from producer to delivery postcode, then compare similar products by travel distance.
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.warningCard}>
          <LuTriangleAlert size={18} />
          <div>
            <strong>Food miles unavailable</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.mapCard}>
          <div className={styles.mapHeader}>
            {foodMilesData && (
              <div className={styles.mapMeta}>
                <span className={styles.metaChip}>
                  <LuMapPinned size={14} />
                  Producer: {foodMilesData.producer_postcode}
                </span>
                <span className={styles.metaChip}>
                  <LuMapPinned size={14} />
                  Customer: {foodMilesData.customer_postcode}
                </span>
              </div>
            )}
          </div>

          <div className={styles.mapWrap}>
            {loadingRoute ? (
              <div className={styles.mapFallback}>Calculating route…</div>
            ) : foodMilesData?.polyline?.length ? (
              <MapContainer
                className={styles.map}
                center={[
                  foodMilesData.producer_location.lat,
                  foodMilesData.producer_location.lon,
                ]}
                zoom={11}
                scrollWheelZoom={false}
              >
                {GEOAPIFY_KEY ? (
                <TileLayer
                    url={`https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`}
                    attribution='&copy; <a href="https://www.geoapify.com/">Geoapify</a>'
                />
                ) : (
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                )}

                <Marker
                  position={[
                    foodMilesData.producer_location.lat,
                    foodMilesData.producer_location.lon,
                  ]}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    Producer
                  </Tooltip>
                </Marker>

                <Marker
                  position={[
                    foodMilesData.customer_location.lat,
                    foodMilesData.customer_location.lon,
                  ]}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    Delivery postcode
                  </Tooltip>
                </Marker>

                <Polyline positions={foodMilesData.polyline} pathOptions={{ weight: 5 }} />
                <FitBounds points={mapPoints} />
              </MapContainer>
            ) : (
              <div className={styles.mapFallback}>Map unavailable.</div>
            )}
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.metricCard}>
            <div className={styles.metricTop}>
              <span className={styles.metricLabel}>Route distance</span>
              <LuRoute size={18} />
            </div>

            <div className={styles.metricValue}>
              {foodMilesData ? `${foodMilesData.distance_miles.toFixed(1)} miles` : "—"}
            </div>

            <p className={styles.metricSubtext}>
              {foodMilesData?.within_local_radius
                ? `Within BRFN’s ${foodMilesData.local_radius_miles}-mile local radius`
                : foodMilesData
                ? `Outside BRFN’s ${foodMilesData.local_radius_miles}-mile local radius`
                : "Distance unavailable"}
            </p>
          </div>

          <div className={styles.methodCard}>
            <h3>How this is calculated</h3>
            <p>{foodMilesData?.methodology || "Distance unavailable."}</p>

            {foodMilesData && (
              <div className={styles.postcodeList}>
                <div className={styles.postcodeRow}>
                  <span>Producer</span>
                  <strong>{foodMilesData.producer_postcode}</strong>
                </div>
                <div className={styles.postcodeRow}>
                  <span>Your postcode</span>
                  <strong>{foodMilesData.customer_postcode}</strong>
                </div>
                <div className={styles.postcodeRow}>
                  <span>Source</span>
                  <strong>{foodMilesData.postcode_source}</strong>
                </div>
              </div>
            )}
          </div>

          <form className={styles.postcodeForm} onSubmit={handleSubmit}>
            <label htmlFor="postcode" className={styles.postcodeLabel}>
              Change delivery postcode
            </label>

            <div className={styles.postcodeInputRow}>
              <input
                id="postcode"
                type="text"
                value={postcodeInput}
                onChange={(e) => setPostcodeInput(e.target.value.toUpperCase())}
                placeholder="Enter postcode"
                className={styles.postcodeInput}
              />
              <button type="submit" className={styles.postcodeBtn}>
                <LuSearch size={16} />
                Update
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={styles.compareSection}>
        <div className={styles.compareHeader}>
          <div>
            <p className={styles.eyebrow}>Comparison</p>
            <h3>Compare food miles</h3>
          </div>
          <div className={styles.compareMeta}>
            <LuArrowRightLeft size={16} />
            Similar products in the same category
          </div>
        </div>

        {loadingCompare ? (
          <div className={styles.compareLoading}>Comparing routes…</div>
        ) : comparisonData.length > 0 ? (
          <div className={styles.compareGrid}>
            {comparisonData.map((item, index) => (
              <article
                key={item.id}
                className={`${styles.compareCard} ${
                  item.is_current_product ? styles.compareCardCurrent : ""
                }`}
              >
                <div className={styles.compareImageWrap}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className={styles.compareImage} />
                  ) : (
                    <div className={styles.compareImageFallback}>No image</div>
                  )}
                </div>

                <div className={styles.compareBody}>
                  <div className={styles.compareTop}>
                    <h4>{item.name}</h4>
                    {index === 0 && <span className={styles.closestBadge}>Closest</span>}
                    {item.is_current_product && (
                      <span className={styles.currentBadge}>This product</span>
                    )}
                  </div>

                  <div className={styles.compareMiles}>
                    {item.distance_miles.toFixed(1)} miles
                  </div>

                  <p className={styles.compareStatus}>
                    {item.within_local_radius
                      ? `Within ${foodMilesData?.local_radius_miles ?? 20}-mile local radius`
                      : `Outside ${foodMilesData?.local_radius_miles ?? 20}-mile local radius`}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.compareEmpty}>
            No comparable products could be calculated yet.
          </div>
        )}
      </div>
    </section>
  );
}
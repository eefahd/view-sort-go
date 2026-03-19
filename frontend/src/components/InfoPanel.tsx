import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { GetImageMetadata } from "../../wailsjs/go/main/App";
import { models } from "../../wailsjs/go/models";

type Meta = models.ImageMetadata;

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function Row({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{String(value)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="info-section">
      <div className="info-section-title">{title}</div>
      {children}
    </div>
  );
}

export function InfoPanel({ width }: { width?: number }) {
  const { state, dispatch } = useAppContext();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state.infoPanelOpen || !state.currentImage) {
      setMeta(null);
      return;
    }
    setLoading(true);
    GetImageMetadata()
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, [state.currentImage?.filename, state.infoPanelOpen]);

  if (!state.infoPanelOpen) {
    return (
      <div
        className="panel-collapsed panel-collapsed-left"
        onClick={() => dispatch({ type: "TOGGLE_INFO_PANEL" })}
        title="Show image info"
        style={{ cursor: "pointer" }}
      >
        <span className="panel-toggle-btn">›</span>
        <span className="panel-collapsed-label">Info</span>
      </div>
    );
  }

  return (
    <div className="info-panel" style={width ? { width, minWidth: width } : undefined}>
      <div className="panel-header" onClick={() => dispatch({ type: "TOGGLE_INFO_PANEL" })} title="Collapse">
        <h3>Image Info</h3>
        <span className="panel-toggle-btn">‹</span>
      </div>

      {loading && <p className="muted info-loading">Loading…</p>}

      {!loading && !meta && (
        <p className="muted">No image selected.</p>
      )}

      {meta && (
        <div className="info-content">
          <Section title="File">
            <Row label="Name" value={meta.filename} />
            <Row label="Format" value={meta.format?.toUpperCase()} />
            <Row label="Size" value={formatBytes(meta.fileSize)} />
            <Row label="Modified" value={formatDate(meta.modifiedAt)} />
          </Section>

          {(meta.width > 0 || meta.height > 0) && (
            <Section title="Dimensions">
              <Row label="Width" value={meta.width ? `${meta.width}px` : undefined} />
              <Row label="Height" value={meta.height ? `${meta.height}px` : undefined} />
              {meta.width && meta.height && (
                <Row label="Megapixels" value={`${(meta.width * meta.height / 1_000_000).toFixed(1)} MP`} />
              )}
            </Section>
          )}

          {(meta.cameraMake || meta.cameraModel || meta.lensModel || meta.dateTaken) && (
            <Section title="Camera">
              <Row label="Make" value={meta.cameraMake} />
              <Row label="Model" value={meta.cameraModel} />
              <Row label="Lens" value={meta.lensModel} />
              <Row label="Date Taken" value={formatDate(meta.dateTaken)} />
            </Section>
          )}

          {(meta.aperture || meta.shutterSpeed || meta.iso || meta.focalLength || meta.flash) && (
            <Section title="Exposure">
              <Row label="Focal Length" value={meta.focalLength} />
              <Row label="Aperture" value={meta.aperture} />
              <Row label="Shutter" value={meta.shutterSpeed} />
              <Row label="ISO" value={meta.iso} />
              <Row label="Flash" value={meta.flash} />
            </Section>
          )}

          {meta.hasGPS && (
            <Section title="Location">
              <Row label="Latitude" value={meta.gpsLat} />
              <Row label="Longitude" value={meta.gpsLon} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

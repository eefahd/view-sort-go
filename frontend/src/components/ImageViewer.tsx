import { useState, useRef, useCallback, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { GetExtraImagePath } from "../../wailsjs/go/main/App";

export function ImageViewer() {
  const { state } = useAppContext();
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [extraImagePath, setExtraImagePath] = useState<string>("");
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom/pan when image changes, and fetch extra image path
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setExtraImagePath("");
    if (state.currentImage) {
      GetExtraImagePath().then((p) => setExtraImagePath(p || "")).catch(() => {});
    }
  }, [state.currentImage?.filename]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale((s) => Math.min(Math.max(s * delta, 0.1), 20));
      }
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button (button === 1) or left with space
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        translateStart.current = { ...translate };
      }
    },
    [translate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setTranslate({
        x: translateStart.current.x + (e.clientX - panStart.current.x),
        y: translateStart.current.y + (e.clientY - panStart.current.y),
      });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const zoomIn = () => setScale((s) => Math.min(s * 1.2, 20));
  const zoomOut = () => setScale((s) => Math.max(s / 1.2, 0.1));
  const fitView = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  if (!state.currentImage) {
    return (
      <div className="image-viewer empty">
        <p>
          {state.workingDir
            ? "No images found in this folder"
            : "Select a folder to get started"}
        </p>
      </div>
    );
  }

  const imageUrl = `/images/${encodeURIComponent(state.currentImage.filename)}`;
  const extraImageUrl = extraImagePath
    ? `/extra-image?path=${encodeURIComponent(extraImagePath)}`
    : "";

  const imgStyle = {
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
    cursor: isPanning ? "grabbing" : "default",
  };

  return (
    <div
      className={`image-viewer${extraImageUrl ? " image-viewer--split" : ""}`}
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="image-pane">
        <img
          src={imageUrl}
          alt={state.currentImage.filename}
          draggable={false}
          style={imgStyle}
        />
        {!extraImageUrl && (
          <div className="zoom-controls">
            <button onClick={zoomOut} title="Zoom out">-</button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} title="Zoom in">+</button>
            <button onClick={fitView} title="Fit to view">Fit</button>
          </div>
        )}
      </div>

      {extraImageUrl && (
        <div className="image-pane image-pane--extra">
          <img
            src={extraImageUrl}
            alt="extra"
            draggable={false}
            style={imgStyle}
          />
          <div className="image-pane-label">Extra</div>
        </div>
      )}

      {extraImageUrl && (
        <div className="zoom-controls">
          <button onClick={zoomOut} title="Zoom out">-</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} title="Zoom in">+</button>
          <button onClick={fitView} title="Fit to view">Fit</button>
        </div>
      )}
    </div>
  );
}

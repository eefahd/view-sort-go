import { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { GetNearbyImages, GoToImage } from "../../wailsjs/go/main/App";
import { models } from "../../wailsjs/go/models";

export function ThumbnailStrip() {
  const { state, dispatch } = useAppContext();
  const [thumbnails, setThumbnails] = useState<models.ImageInfo[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.currentImage) {
      setThumbnails([]);
      return;
    }
    GetNearbyImages(10).then((imgs) => {
      if (imgs) setThumbnails(imgs);
    });
  }, [state.currentImage?.index, state.currentImage?.total, state.workingDir]);

  useEffect(() => {
    if (!stripRef.current || !state.currentImage) return;
    const active = stripRef.current.querySelector(".thumbnail-item.active");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [thumbnails, state.currentImage?.index]);

  const handleClick = async (index: number) => {
    const img = await GoToImage(index);
    if (img) {
      dispatch({ type: "SET_CURRENT_IMAGE", image: img });
    }
  };

  if (!state.currentImage) return null;

  return (
    <div className="thumbnail-strip" ref={stripRef}>
      {thumbnails.map((thumb) => (
        <div
          key={thumb.index}
          className={`thumbnail-item${thumb.index === state.currentImage!.index ? " active" : ""}`}
          onClick={() => handleClick(thumb.index)}
        >
          <img src={`/images/${encodeURIComponent(thumb.filename)}`} alt={thumb.filename} />
          <span className="thumbnail-index">{thumb.index + 1}</span>
        </div>
      ))}
    </div>
  );
}

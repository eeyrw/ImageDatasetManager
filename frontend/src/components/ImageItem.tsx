// src/components/ImageItem.tsx
export default function ImageItem({ src }: { src: string }) {
  return (
    <div className="image-item">
      <img src={src} loading="lazy" />
    </div>
  );
}
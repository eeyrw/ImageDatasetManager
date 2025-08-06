export default function ImageItem({ src, onClick }: { src: string; onClick?: () => void }) {
  return (
    <div className="image-item" onClick={onClick}>
      <img src={src} loading="lazy" />
    </div>
  );
}

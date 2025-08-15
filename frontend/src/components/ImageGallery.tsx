import React from 'react';
import Masonry from 'react-masonry-css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/dist/photoswipe.css';
import ImageItem from './ImageItem';

export type ImageInfo = {
  id: string;
  url: string;
  raw_size_image_url: string;
  title: string;
  size: { w: number; h: number };
  poses:[];
};

type Props = {
  images: ImageInfo[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onClickImage: (image: ImageInfo) => void;
  selectable?: boolean;
  highlightEnabled?: boolean;
};

export default function ImageGallery({
  images,
  selectedIds,
  onSelectedIdsChange,
  onClickImage,
  selectable = false,
  highlightEnabled = true,
}: Props) {
  const toggleSelect = (id: string, checked: boolean) => {
    if (!selectable) return;
    if (checked) {
      onSelectedIdsChange([...selectedIds, id]);
    } else {
      onSelectedIdsChange(selectedIds.filter(x => x !== id));
    }
  };

  const breakpointColumnsObj = {
    default: 6,
    1600: 5,
    1200: 4,
    992: 3,
    768: 2,
    576: 1,
  };

  return (
    <Gallery withCaption>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {images.map(img => {
          const isSelected = selectedIds.includes(img.id);
          return (
            <Item
              key={img.id}
              original={img.raw_size_image_url}
              thumbnail={img.url}
              width={img.size.w}
              height={img.size.h}
              caption={img.title}
            >
              {({ ref, open }) => (
                <ImageItem
                  ref={ref}
                  src={img.url}
                  checked={isSelected}
                  highlighted={!selectable || !highlightEnabled || selectedIds.length === 0 || isSelected}
                  onCheckedChange={checked => toggleSelect(img.id, checked)}
                  onClick={() => {
                    onClickImage(img);
                    open();
                  }}
                  selectable={selectable}
                />
              )}
            </Item>
          );
        })}
      </Masonry>
    </Gallery>
  );
}

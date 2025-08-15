import React, { useState } from "react";
import { Modal } from "antd";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import WholeBodyOverlay, { Props as OverlayProps } from "./WholeBodyOverlay";

export type ImageInfo = {
    id: string;
    url: string;
    raw_size_image_url: string;
    title: string;
    size: { w: number; h: number };
    poses: any[];
};

type Props = {
    image: ImageInfo;
    thumbnailWidth?: number;
    showBBox?: boolean;
    showFaceEdges?: boolean;
    pointRadius?: number;
};

export default function ZoomablePoseOverlay({ image, thumbnailWidth = 300, ...rest }: Props) {
    const [modalVisible, setModalVisible] = useState(false);
    const [scale, setScale] = useState(1);

    const aspectRatio = image.size.h / image.size.w;

    // 图片显示 props
    const overlayProps: OverlayProps = {
        poses: image.poses,
        imgSrc: image.raw_size_image_url, // Modal 内用大图
        imgWidth: image.size.w,
        imgHeight: image.size.h,
        ...rest,
    };

    return (
        <>
            {/* 缩略图 */}
            <div
                style={{
                    width: thumbnailWidth,
                    height: thumbnailWidth * aspectRatio,
                    cursor: "zoom-in",
                    overflow: "hidden",
                    position: "relative",
                }}
                onClick={() => setModalVisible(true)}
            >
                <WholeBodyOverlay
                    {...overlayProps}
                    imgSrc={image.url} // 缩略图
                />
            </div>

            {/* 弹出 Modal */}
            <Modal
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width="90%"
                bodyStyle={{
                    padding: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#000",
                }}
                centered
            >
                <div
                    style={{
                        width: "100%",
                        height: "80vh",
                        overflow: "hidden",
                    }}
                >
                    <TransformWrapper
                        initialScale={1}
                        minScale={0.5}
                        maxScale={10}
                        wheel={{ step: 0.1 }}
                        doubleClick={{ disabled: true }}
                        centerOnInit
                        limitToBounds={false}                   // 允许拖出边界
                        onZoom={(ref) => setScale(ref.state.scale)}
                    >
                        <TransformComponent>
                            <WholeBodyOverlay
                                {...overlayProps}
                                pointRadius={(rest.pointRadius ?? 2.2) * scale} // 点随缩放
                            />
                        </TransformComponent>
                    </TransformWrapper>
                </div>
            </Modal>
        </>
    );
}

import React, { useState, useEffect } from "react";
import { Button, Modal, List, Spin } from "antd";
import Navbar from "./Navbar"; // 请确认路径正确，导入你给的分页组件
import ImageGallery, { ImageInfo } from './ImageGallery';

type Favourite = { id: string; name: string; coverUrl: string };

type Props = {
    selectedImageIds: string[];
    onSuccess?: () => void;
};

export default function AddToFavouriteButton({ selectedImageIds, onSuccess }: Props) {
    const [visible, setVisible] = useState(false);

    // 打开模态框时，初始化收藏夹相关状态
    const [favourites, setFavourites] = useState<Favourite[]>([]);
    const [selectedFavId, setSelectedFavId] = useState<string | null>(null);

    // 分页
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(12);
    const [totalItems, setTotalItems] = useState(0);

    const [images, setImages] = useState<ImageInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            // 打开时请求收藏夹列表
            mockFetchFavourites().then((data) => {
                setFavourites(data);
                if (data.length > 0) {
                    setSelectedFavId(data[0].id);
                    setPage(0);
                }
            });
        }
    }, [visible]);

    useEffect(() => {
        if (selectedFavId !== null) {
            loadImages(selectedFavId, page, pageSize);
        }
    }, [selectedFavId, page, pageSize]);

    const loadImages = async (favId: string, p: number, ps: number) => {
        setLoading(true);
        const res = await mockFetchFavouriteImages(favId, p, ps);
        setImages(res.list);
        setTotalItems(res.total);
        setLoading(false);
    };

    const handleConfirm = () => {
        if (!selectedFavId) return;
        // 这里应该调用后端接口把 selectedImageIds 加入选中的收藏夹
        // 目前模拟延迟和成功提示
        setTimeout(() => {
            Modal.success({
                title: "成功",
                content: `已将 ${selectedImageIds.length} 张图片添加到收藏夹`,
            });
            setVisible(false);
            onSuccess?.();
        }, 500);
    };

    return (
        <>
            <Button
                size="small"
                type="primary"
                disabled={selectedImageIds.length === 0}
                onClick={() => setVisible(true)}
            >
                添加到收藏夹
            </Button>

            <Modal
                title="添加到收藏夹"
                open={visible}
                onCancel={() => setVisible(false)}
                width={900}
                footer={[
                    <Button key="cancel" onClick={() => setVisible(false)}>
                        取消
                    </Button>,
                    <Button
                        key="ok"
                        type="primary"
                        disabled={!selectedFavId}
                        onClick={handleConfirm}
                    >
                        确定
                    </Button>,
                ]}
            >
                <div style={{ display: "flex", height: "70vh", gap: 16 }}>
                    {/* 左侧收藏夹列表 */}
                    <div
                        style={{
                            width: 180,
                            borderRight: "1px solid #eee",
                            paddingRight: 8,
                            overflowY: "auto",
                        }}
                    >
                        {favourites.map((fav) => (
                            <div
                                key={fav.id}
                                onClick={() => {
                                    setSelectedFavId(fav.id);
                                    setPage(0);
                                }}
                                style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    background: selectedFavId === fav.id ? "#e6f7ff" : undefined,
                                }}
                            >
                                {fav.name}
                            </div>
                        ))}
                    </div>

                    {/* 右侧图片及分页 */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <Navbar
                            page={page}
                            setPage={setPage}
                            pageSize={pageSize}
                            setPageSize={(ps) => {
                                setPageSize(ps);
                                setPage(0);
                            }}
                            totalPages={Math.ceil(totalItems / pageSize)}
                            totalItems={totalItems}
                        />
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                paddingRight: 8,
                            }}
                        >
                            {loading ? (
                                <div
                                    style={{
                                        padding: 40,
                                        textAlign: "center",
                                        color: "#999",
                                    }}
                                >
                                    <Spin />
                                </div>
                            ) : (
                                <ImageGallery
                                    images={images}
                                    selectedIds={[]} // 这里没有多选，你可以扩展
                                    onSelectedIdsChange={() => { }}
                                    onClickImage={(img) => {
                                        // 你可以加点别的逻辑或者留空
                                        console.log('点击图片', img.id);
                                    }}
                                    selectable={false} // 这里暂不允许选中
                                    highlightEnabled={false}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// ---------- mock api -----------

async function mockFetchFavourites(): Promise<Favourite[]> {
    return new Array(6).fill(null).map((_, i) => ({
        id: `fav-${i}`,
        name: `收藏夹 ${i + 1}`,
        coverUrl: `https://picsum.photos/seed/fav${i}/100/100`,
    }));
}

async function mockFetchFavouriteImages(
    favId: string,
    page: number,
    pageSize: number
): Promise<{ list: ImageInfo[]; total: number }> {
    const total = 57; // 模拟总数
    await new Promise((r) => setTimeout(r, 300));

    const list: ImageInfo[] = [];
    const start = page * pageSize;
    const end = Math.min(start + pageSize, total);

    for (let i = start; i < end; i++) {
        const id = `${favId}-img-${i}`;
        list.push({
            id,
            url: `https://picsum.photos/seed/${id}/300/200`,
            raw_size_image_url: `https://picsum.photos/seed/${id}/1200/800`,
            title: `图片 ${i + 1}`,
            size: { w: 300, h: 200 },
        });
    }
    return { list, total };
}

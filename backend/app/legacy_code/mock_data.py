from typing import List, Dict

dataset_tree_mock = [
    {
        "id": "a1f2-1111-aaaa-bbbb-0001",
        "name": "自然场景",
        "children": [
            {
                "id": "a1f2-1111-aaaa-bbbb-0002",
                "name": "222山脉",
                "children": [
                    {"id": "a1f2-1111-aaaa-bbbb-0003", "name": "阿尔卑斯山"},
                    {"id": "a1f2-1111-aaaa-bbbb-0004", "name": "喜马拉雅山"},
                ],
            },
            {
                "id": "a1f2-1111-aaaa-bbbb-0005",
                "name": "海洋",
                "children": [
                    {"id": "a1f2-1111-aaaa-bbbb-0006", "name": "珊瑚礁"},
                    {"id": "a1f2-1111-aaaa-bbbb-0007", "name": "深海"},
                ],
            },
        ],
    },
    {
        "id": "a1f2-1111-aaaa-bbbb-0008",
        "name": "城市风光",
        "children": [
            {
                "id": "a1f2-1111-aaaa-bbbb-0009",
                "name": "夜景",
                "children": [
                    {"id": "a1f2-1111-aaaa-bbbb-0010", "name": "东京"},
                    {"id": "a1f2-1111-aaaa-bbbb-0011", "name": "纽约"},
                ],
            },
            {"id": "a1f2-1111-aaaa-bbbb-0012", "name": "建筑物"},
        ],
    },
]

favourites = [
    {"id": "fav-0001-uuid", "name": "最爱的猫猫"},
    {"id": "fav-0002-uuid", "name": "23色彩构图优秀"},
    {"id": "fav-0003-uuid", "name": "审美分高于0.9"},
    {"id": "fav-0004-uuid", "name": "需要标注的人脸数据"},
    {"id": "fav-0005-uuid", "name": "准备训练LoRA"},
]

# 为每个 UUID 生成 mock 图像
def generate_images_for_ids(ids: List[str], page: int, size: int) -> Dict:
    all_images = []
    for id in ids:
        for i in range(25):  # 每个 ID 生成 25 张图像
            all_images.append({
                "id": f"{id}_{i}",
                "url": f"https://picsum.photos/seed/{id}-{i}/400/300",
                "title": f"图像 {i} (来源 {id})"
            })
    start = page * size
    end = start + size
    return {
        "total": len(all_images),
        "images": all_images[start:end]
    }

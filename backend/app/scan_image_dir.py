import os
import uuid

# 支持的图片后缀
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}

def generate_uuid():
    return str(uuid.uuid4())

def get_image_files(path):
    """返回当前目录下的所有图片文件名（不含路径）"""
    images = []
    for file in os.listdir(path):
        full_path = os.path.join(path, file)
        if os.path.isfile(full_path):
            ext = os.path.splitext(file)[1].lower()
            if ext in IMAGE_EXTS:
                images.append(file)
    return images

def scan_directory(path, uuid_map):
    """构造目录树并收集uuid信息"""
    children = []
    for entry in sorted(os.listdir(path)):
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            child_node = scan_directory(full_path, uuid_map)
            if child_node:
                children.append(child_node)

    images = get_image_files(path)

    # 如果当前目录有图 或 有含图的子目录，就保留它
    if images or children:
        node_id = generate_uuid()
        uuid_map[node_id] = {
            "path": os.path.abspath(path),
            "images": images
        }

        node = {
            "id": node_id,
            "name": os.path.basename(path),
        }
        if children:
            node["children"] = children
        return node
    else:
        return None
    

# uuid_map = {}
# root_path = "/your/image/folder/path"
# tree = scan_directory(root_path, uuid_map)

# if tree:
#     import json
#     print("📂 树结构：")
#     print(json.dumps(tree, indent=2, ensure_ascii=False))
    
#     print("\n🔍 UUID 映射：")
#     print(json.dumps(uuid_map, indent=2, ensure_ascii=False))
# else:
#     print("没有包含图片的目录")

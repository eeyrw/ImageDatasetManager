import uuid


def build_forest_from_abs_paths(dir_records):
    """
    dir_records: List[Tuple[UUID, str]]  # (id, abs_path)，路径保证是“绝对路径”(以 / 开头)

    返回：
        List[树]，每棵树是 dict，格式同 build_dir_tree_with_ids
    """

    # 先分组：按第一层目录名作为不同的树
    top_level_map = {}  # key = 顶层目录名, value = list of (id, relative_path)

    for dir_id, abs_path in dir_records:
        # 去掉开头的 "/"，再按 "/" 拆分
        parts = [p for p in abs_path.strip("/").split("/") if p]

        if not parts:
            continue  # 如果 abs_path == "/" 就跳过

        top = parts[0]  # 第一层目录名
        rel_parts = parts[1:]  # 去掉顶层，作为子路径

        rel_path = "/".join(rel_parts) if rel_parts else ""
        if top not in top_level_map:
            top_level_map[top] = []
        top_level_map[top].append((dir_id, rel_path))

    forest = []

    for top_name, rel_records in top_level_map.items():
        # 用顶层目录名构造一个稳定的 UUID
        root_node_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "/" + top_name))

        # 构建子树
        tree = build_dir_tree_with_ids(rel_records)

        forest.append({
            "id": root_node_id,
            "name": top_name,
            "children": tree
        })

    return forest


def build_dir_tree_with_ids(dir_records):
    """
    dir_records: List[Tuple[UUID, str]]
        [(dir_id, relative_path), ...]
    relative_path 可以是 "" 表示直接挂在父节点下

    返回: 嵌套树 [{id, name, children}]
    """
    tree = {}

    for dir_id, path in dir_records:
        if not path:
            # 直接是父节点的叶子
            continue

        parts = [p for p in path.split("/") if p]
        path_so_far = ""
        node = tree

        for i, part in enumerate(parts):
            path_so_far = f"{path_so_far}/{part}" if path_so_far else part

            node_id = str(dir_id) if i == len(parts) - 1 else str(uuid.uuid5(uuid.NAMESPACE_URL, path_so_far))

            if part not in node:
                node[part] = {
                    "id": node_id,
                    "name": part,
                    "children": {}
                }
            node = node[part]["children"]

    return convert_children_dict_to_list(tree)


def convert_children_dict_to_list(children_dict):
    """递归把 children 从 dict 转 list"""
    return [
        {
            "id": v["id"],
            "name": v["name"],
            "children": convert_children_dict_to_list(v["children"])
        }
        for v in children_dict.values()
    ]

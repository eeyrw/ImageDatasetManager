import os
import uuid

def build_forest_with_root_filter(dir_records, root_paths):
    """
    dir_records: List[Tuple[UUID, str]]  # 数据库中 (id, 绝对路径)
    root_paths: List[str]                # 支持多个根目录，绝对路径

    返回：
        List[树]，每棵树是 dict，格式同 build_dir_tree_with_ids
    """

    # 先对root_paths做规范化，方便比较
    norm_roots = [os.path.normpath(rp) for rp in root_paths]

    # 按根目录分组，key = root_path，value = list of (id, relative_path)
    groups = {rp: [] for rp in norm_roots}
    others = []  # 不属于任何根的，单独成树

    for dir_id, abs_path in dir_records:
        abs_norm = os.path.normpath(abs_path)
        matched_root = None

        for root in norm_roots:
            try:
                rel_path = os.path.relpath(abs_norm, root)
                # rel_path 如果以 '..' 开头，说明不属于该root
                if not rel_path.startswith("..") and not os.path.isabs(rel_path):
                    matched_root = root
                    groups[root].append((dir_id, rel_path))
                    break
            except ValueError:
                # windows 下可能异常，忽略
                continue

        if matched_root is None:
            # 不属于任何root的放others
            others.append((dir_id, abs_norm))

    # 对每个组构造树
    forest = []
    for root, rel_records in groups.items():
        # 构造树的时候，加一个根节点，id可以用root路径生成UUID
        root_node_id = str(uuid.uuid5(uuid.NAMESPACE_URL, root))
        tree = build_dir_tree_with_ids(rel_records)

        # 顶层加个根节点
        forest.append({
            "id": root_node_id,
            "name": os.path.basename(root),
            "children": tree
        })

    # 对others也单独做成一棵树，每个路径直接是叶节点
    if others:
        # 构造一棵虚拟根节点，名字 "Others" 或者类似
        others_root_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "others_root"))
        others_tree = build_dir_tree_with_ids(others)  # others里面是绝对路径，这里不变相对路径

        forest.append({
            "id": others_root_id,
            "name": "Others",
            "children": others_tree
        })

    return forest


def build_dir_tree_with_ids(dir_records):
    """
    dir_records: List[Tuple[UUID, str]]  -> [(dir_id, dir_path), ...]
    dir_path 是相对路径或绝对路径均可

    返回: 嵌套树 [{id, name, children}]
    """
    import os
    import uuid

    tree = {}

    for dir_id, path in dir_records:
        parts = [p for p in path.strip(os.sep).split(os.sep) if p]
        path_so_far = ""
        node = tree

        for i, part in enumerate(parts):
            path_so_far = os.path.join(path_so_far, part)

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

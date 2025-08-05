# 后端初始化说明

本目录用于存放Python后端服务代码，采用FastAPI框架。

目录结构建议：

```
backend/
├── app/
│   ├── main.py           # FastAPI入口
│   ├── api/              # 路由与接口
│   ├── models/           # 数据模型
│   ├── services/         # 业务逻辑
│   ├── database.py       # 数据库连接
│   └── config.py         # 配置文件
├── requirements.txt      # 依赖包列表
└── README.md             # 后端说明文档
```

下一步将自动生成 FastAPI 最小启动代码和依赖文件。

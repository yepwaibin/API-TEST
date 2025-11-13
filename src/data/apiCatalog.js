export const apiCatalog = [
  {
    label: "公共",
    key: "common",
    apis: [
      {
        name: "ping",
        description: "全局状态检查",
        params: [{ name: "timestamp", value: () => new Date().toISOString() }],
      },
    ],
  },
  {
    label: "WORD",
    key: "word",
    apis: [
      {
        name: "addText",
        description: "向文档追加文本",
        params: [
          { name: "userId", value: "123" },
          { name: "content", value: "Hello, PostMessage!" },
        ],
      },
      {
        name: "getWord",
        description: "获取文档内容",
        params: [{ name: "userId", value: "123" }],
      },
      {
        name: "deleteWord",
        description: "删除文档内容",
        params: [
          { name: "userId", value: "123" },
          { name: "range", value: "0-10" },
        ],
      },
      {
        name: "updateStyle",
        description: "更新文档样式",
        params: [
          { name: "userId", value: "123" },
          { name: "style", value: "bold" },
        ],
      },
    ],
  },
  {
    label: "PDF",
    key: "pdf",
    apis: [
      {
        name: "exportPdf",
        description: "导出为 PDF",
        params: [
          { name: "userId", value: "123" },
          { name: "watermark", value: "CONFIDENTIAL" },
        ],
      },
    ],
  },
  {
    label: "EXCEL",
    key: "excel",
    apis: [
      {
        name: "addSheet",
        description: "新增工作表",
        params: [
          { name: "userId", value: "123" },
          { name: "name", value: "Sheet1" },
        ],
      },
    ],
  },
  {
    label: "PPT",
    key: "ppt",
    apis: [
      {
        name: "createSlide",
        description: "创建幻灯片",
        params: [
          { name: "userId", value: "123" },
          { name: "theme", value: "dark" },
        ],
      },
    ],
  },
];


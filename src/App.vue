<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { apiCatalog } from "./data/apiCatalog";

const catalog = apiCatalog;

const iframeUrl = ref("/mock-frame.html");
const iframeRef = ref(null);
const selectedCategoryKey = ref(catalog[0]?.key ?? null);
const selectedApiName = ref(catalog[0]?.apis?.[0]?.name ?? null);
const requestName = ref(selectedApiName.value ?? "");
const paramRows = ref([]);
const paramsMode = ref("table");
const paramsJson = ref("{}");
const paramsError = ref("");
const notes = ref("");
const responseState = reactive({
  isWaiting: false,
  body: "",
  meta: null,
});

const requestId = ref(null);
const timingState = reactive({
  startAt: 0,
});
const expandedKeys = ref(
  selectedCategoryKey.value ? [selectedCategoryKey.value] : []
);

const selectedCategory = computed(
  () => catalog.find((group) => group.key === selectedCategoryKey.value) ?? null
);

const selectedApi = computed(() => {
  const apiList = selectedCategory.value?.apis ?? [];
  return apiList.find((api) => api.name === selectedApiName.value) ?? null;
});

const formattedResponse = computed(() => {
  if (!responseState.body) {
    return responseState.isWaiting ? "等待 iframe 响应..." : "尚未发送请求";
  }

  try {
    return JSON.stringify(JSON.parse(responseState.body), null, 2);
  } catch (error) {
    return responseState.body;
  }
});

const rowsToPlainObject = () => {
  const params = {};
  paramRows.value.forEach(({ name, value }) => {
    if (name) {
      params[name] = typeof value === "function" ? value() : value;
    }
  });

  return params;
};

const syncParamsJsonFromRows = () => {
  const plain = rowsToPlainObject();
  paramsJson.value = JSON.stringify(plain, null, 2);
  paramsError.value = "";
};

const syncRowsFromJson = (jsonString) => {
  if (!jsonString.trim()) {
    paramRows.value = [
      {
        name: "",
        value: "",
      },
    ];
    paramsError.value = "";
    return {};
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("JSON 必须是对象格式");
    }

    const rows = Object.entries(parsed).map(([name, value]) => ({
      name,
      value: typeof value === "object" ? JSON.stringify(value) : value ?? "",
    }));

    if (!rows.length) {
      rows.push({
        name: "",
        value: "",
      });
    }

    paramRows.value = rows;
    paramsError.value = "";
    return parsed;
  } catch (error) {
    paramsError.value = `JSON 解析失败：${error.message}`;
    return null;
  }
};

const initializeParams = () => {
  const defaults = selectedApi.value?.params ?? [];
  paramRows.value = defaults.map(({ name, value }) => ({
    name,
    value: typeof value === "function" ? value() : value,
  }));

  if (!paramRows.value.length) {
    paramRows.value.push({
      name: "",
      value: "",
    });
  }

  if (paramsMode.value === "json") {
    syncParamsJsonFromRows();
  }
};

const resetResponse = () => {
  responseState.body = "";
  responseState.meta = null;
  responseState.isWaiting = false;
};

const isGroupExpanded = (key) => expandedKeys.value.includes(key);

const toggleGroup = (key) => {
  const list = [...expandedKeys.value];
  const index = list.indexOf(key);
  if (index > -1) {
    if (list.length > 1) {
      list.splice(index, 1);
      expandedKeys.value = list;
    }
  } else {
    list.push(key);
    expandedKeys.value = list;
  }
};

const ensureGroupExpanded = (key) => {
  if (!key) return;
  if (!isGroupExpanded(key)) {
    expandedKeys.value = [...expandedKeys.value, key];
  }
};

const handleSelectApi = (categoryKey, apiName) => {
  if (selectedCategoryKey.value !== categoryKey) {
    selectedCategoryKey.value = categoryKey;
  }
  selectedApiName.value = apiName;
  requestName.value = apiName;
  notes.value = "";
  paramsError.value = "";
  ensureGroupExpanded(categoryKey);
  initializeParams();
  resetResponse();
};

const addParamRow = () => {
  paramRows.value.push({
    name: "",
    value: "",
  });
};

const removeParamRow = (index) => {
  if (paramRows.value.length === 1) return;
  paramRows.value.splice(index, 1);
};

const setParamsMode = (mode) => {
  if (paramsMode.value === mode) return;
  if (mode === "json") {
    syncParamsJsonFromRows();
    paramsMode.value = mode;
  } else {
    const parsed = syncRowsFromJson(paramsJson.value);
    if (parsed !== null) {
      paramsMode.value = mode;
    }
  }
};

const resolveParamsForRequest = () => {
  if (paramsMode.value === "json") {
    const parsed = syncRowsFromJson(paramsJson.value);
    if (parsed === null) {
      responseState.body = "参数 JSON 解析失败，请检查输入。";
      responseState.isWaiting = false;
      return null;
    }
    paramsError.value = "";
    return parsed;
  }
  paramsError.value = "";
  return rowsToPlainObject();
};

const handleSend = () => {
  const frameWindow = iframeRef.value?.contentWindow;
  if (!frameWindow) {
    responseState.body = "iframe 未加载，请稍后重试。";
    responseState.isWaiting = false;
    return;
  }

  const params = resolveParamsForRequest();
  if (params === null) {
    return;
  }

  requestId.value = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  responseState.isWaiting = true;
  responseState.body = "";

  timingState.startAt = performance.now();
  responseState.meta = {
    startedAt: new Date().toISOString(),
    durationMs: null,
  };

  const payload = {
    type: "api-test/request",
    id: requestId.value,
    api: requestName.value || selectedApi.value?.name,
    category: selectedCategory.value?.key,
    notes: notes.value,
    params,
  };

  frameWindow.postMessage(payload, "*");
};

const handleMessage = (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type !== "api-test/response") return;
  if (!requestId.value || data.id !== requestId.value) return;

  responseState.isWaiting = false;
  responseState.meta = {
    startedAt: responseState.meta?.startedAt ?? null,
    origin: event.origin,
    receivedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - timingState.startAt),
  };

  responseState.body =
    typeof data.payload === "string"
      ? data.payload
      : JSON.stringify(data.payload, null, 2);
};

onMounted(() => {
  initializeParams();
  window.addEventListener("message", handleMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});

watch(
  () => selectedApiName.value,
  () => {
    requestName.value = selectedApi.value?.name ?? "";
  }
);

watch(
  () => selectedCategoryKey.value,
  (key) => ensureGroupExpanded(key)
);
</script>

<template>
  <div class="workspace">
    <aside class="sidebar">
      <div class="sidebar-header">API 列表</div>
      <div class="sidebar-search">
        <input type="text" placeholder="搜索 API..." disabled />
      </div>
      <div class="sidebar-groups">
        <section v-for="group in catalog" :key="group.key" class="group">
          <header
            class="group-title"
            @click="toggleGroup(group.key)"
            :class="{ collapsed: !isGroupExpanded(group.key) }"
          >
            {{ group.label }}
            <span
              class="group-toggle"
              :class="{ expanded: isGroupExpanded(group.key) }"
            >
              ▾
            </span>
          </header>
          <ul v-show="isGroupExpanded(group.key)" class="api-list">
            <li
              v-for="api in group.apis"
              :key="api.name"
              class="api-item"
              :class="{
                active:
                  selectedCategoryKey === group.key &&
                  selectedApiName === api.name,
              }"
              @click="handleSelectApi(group.key, api.name)"
            >
              <span class="api-name">{{ api.name }}</span>
              <span class="api-desc">{{ api.description }}</span>
            </li>
          </ul>
        </section>
      </div>
    </aside>

    <main class="main-panel">
      <header class="request-bar">
        <input
          v-model="requestName"
          class="request-name"
          type="text"
          placeholder="API 名称"
        />
        <button class="send-btn" @click="handleSend">Send</button>
      </header>

      <section class="params-section">
        <header class="section-header params-header">
          <h3>参数</h3>
          <div class="params-mode-toggle">
            <button
              class="mode-btn"
              :class="{ active: paramsMode === 'table' }"
              @click="setParamsMode('table')"
            >
              表格
            </button>
            <button
              class="mode-btn"
              :class="{ active: paramsMode === 'json' }"
              @click="setParamsMode('json')"
            >
              JSON
            </button>
          </div>
          <button
            class="section-action"
            @click="addParamRow"
            :disabled="paramsMode === 'json'"
          >
            + 添加参数
          </button>
        </header>

        <template v-if="paramsMode === 'table'">
          <table class="params-table">
            <thead>
              <tr>
                <th>参数名</th>
                <th>参数值</th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in paramRows" :key="`param-${index}`">
                <td>
                  <input v-model="row.name" type="text" placeholder="参数名" />
                </td>
                <td>
                  <input v-model="row.value" type="text" placeholder="参数值" />
                </td>
                <td class="col-actions">
                  <button
                    class="icon-btn"
                    @click="removeParamRow(index)"
                    :disabled="paramRows.length === 1"
                    title="删除参数"
                  >
                    ×
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <div v-else class="params-json">
          <textarea
            v-model="paramsJson"
            class="params-json-editor"
            spellcheck="false"
            placeholder='{"key": "value"}'
          />
          <p v-if="paramsError" class="params-error">
            {{ paramsError }}
          </p>
        </div>
      </section>

      <section class="notes-section">
        <header class="section-header">
          <h3>备注</h3>
        </header>
        <textarea v-model="notes" placeholder="可选：为此次请求添加备注..." />
      </section>

      <section class="response-section">
        <header class="section-header">
          <h3>响应结果</h3>
          <span v-if="responseState.meta" class="response-meta">
            <template v-if="responseState.meta.receivedAt">
              {{ responseState.meta.receivedAt }}
              <template v-if="responseState.meta.durationMs !== null">
                · {{ responseState.meta.durationMs }} ms
              </template>
            </template>
            <template v-else-if="responseState.meta.startedAt">
              已发送：{{ responseState.meta.startedAt }}
            </template>
          </span>
        </header>
        <pre class="response-viewer">{{ formattedResponse }}</pre>
      </section>
    </main>

    <section class="preview-panel">
      <header class="preview-header">业务功能预览</header>
      <iframe
        ref="iframeRef"
        class="preview-iframe"
        :src="iframeUrl"
        title="API 测试预览"
      />
    </section>
  </div>
</template>

<style scoped>
.workspace {
  display: grid;
  grid-template-columns: 280px 1fr 420px;
  grid-template-rows: 100vh;
  color: #1f2328;
  background: #f5f7fb;
  overflow: hidden;
}

.sidebar {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e2e6f0;
  min-width: 0;
  box-shadow: 4px 0 12px rgba(15, 23, 42, 0.04);
}

.sidebar-header {
  padding: 20px 24px 12px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: #1f2328;
}

.sidebar-search {
  padding: 0 16px 12px;
}

.sidebar-search input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d0d7e3;
  background: #f9fbff;
  color: #6e7787;
}

.sidebar-groups {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 16px;
}

.group {
  margin-top: 8px;
  border-radius: 8px;
  overflow: hidden;
}

.group-title {
  padding: 10px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8c96a9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.group-title.collapsed {
  color: #b1b8c8;
}

.group-title:hover {
  color: #5c6ac4;
}

.group-toggle {
  font-size: 14px;
  transition: transform 0.2s ease;
}

.group-toggle.expanded {
  transform: rotate(180deg);
}

.api-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.api-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid transparent;
}

.api-item:hover {
  background: rgba(99, 108, 255, 0.08);
  border-color: rgba(99, 108, 255, 0.2);
}

.api-item.active {
  background: rgba(99, 108, 255, 0.12);
  border-color: rgba(99, 108, 255, 0.38);
  box-shadow: 0 6px 16px rgba(99, 108, 255, 0.15);
}

.api-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}

.api-desc {
  font-size: 12px;
  color: #6e7787;
}

.main-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #e2e6f0;
  min-width: 0;
  background: #f5f7fb;
}

.request-bar {
  padding: 18px 24px;
  display: flex;
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid #e2e6f0;
  background: #ffffff;
}

.request-name {
  flex: 1;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #c8d0e0;
  background: #ffffff;
  color: #1f2328;
  font-size: 16px;
}

.send-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #5c7cfa 0%, #5671ff 100%);
  border: none;
  border-radius: 10px;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.send-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(86, 113, 255, 0.25);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e4e8f2;
  background: #f9fbff;
}

.section-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b6474;
}

.params-header {
  gap: 16px;
}

.params-mode-toggle {
  display: inline-flex;
  border-radius: 10px;
  overflow: hidden;
  background: #e8ecf7;
  border: 1px solid #d5dcf2;
}

.mode-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border: none;
  background: transparent;
  color: #5b6474;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.mode-btn.active {
  background: #ffffff;
  color: #3a4fd0;
  box-shadow: inset 0 0 0 1px rgba(58, 79, 208, 0.16);
}

.params-json {
  padding: 16px 18px 20px;
}

.params-json-editor {
  width: 100%;
  min-height: 220px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid #ccd4e8;
  background: #f8faff;
  color: #1f2328;
  resize: vertical;
  font-family: "JetBrains Mono", Menlo, Monaco, "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
}

.params-json-editor:focus {
  outline: 2px solid rgba(92, 124, 250, 0.25);
  outline-offset: 2px;
}

.params-error {
  margin: 12px 4px 0;
  font-size: 12px;
  color: #d64545;
  background: rgba(214, 69, 69, 0.12);
  border: 1px solid rgba(214, 69, 69, 0.16);
  border-radius: 8px;
  padding: 8px 12px;
}

.section-action {
  border: none;
  background: transparent;
  color: #5c7cfa;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.section-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.params-section,
.notes-section,
.response-section {
  background: #ffffff;
  margin: 16px 24px;
  border-radius: 16px;
  border: 1px solid #e2e6f0;
  overflow: hidden;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}

.params-table {
  width: 100%;
  border-collapse: collapse;
}

.params-table thead {
  background: #f0f4ff;
}

.params-table th {
  text-align: left;
  padding: 12px 18px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8494;
  border-bottom: 1px solid #e2e6f0;
}

.params-table td {
  padding: 12px 18px;
  border-bottom: 1px solid #edf1f8;
}

.params-table tbody tr:last-child td {
  border-bottom: none;
}

.params-table input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #cfd6e4;
  background: #ffffff;
  color: #1f2328;
}

.params-table input:focus {
  outline: 2px solid rgba(92, 124, 250, 0.35);
  outline-offset: 1px;
}

.col-actions {
  width: 60px;
  text-align: right;
}

.icon-btn {
  border: none;
  background: rgba(92, 124, 250, 0.12);
  color: #3a4fd0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon-btn:not(:disabled):hover {
  background: rgba(92, 124, 250, 0.28);
}

.notes-section textarea {
  width: 100%;
  min-height: 120px;
  padding: 16px 20px;
  border: none;
  background: transparent;
  color: #1f2328;
  resize: vertical;
  font-family: "JetBrains Mono", Menlo, Monaco, "Courier New", monospace;
}

.notes-section textarea:focus {
  outline: none;
}

.response-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.response-meta {
  font-size: 12px;
  color: #7a8494;
}

.response-viewer {
  flex: 1;
  margin: 0;
  padding: 20px;
  font-size: 13px;
  line-height: 1.6;
  color: #1f2328;
  background: #f8faff;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "JetBrains Mono", Menlo, Monaco, "Courier New", monospace;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  min-width: 0;
  box-shadow: -6px 0 20px rgba(15, 23, 42, 0.06);
}

.preview-header {
  padding: 18px 24px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #e2e6f0;
  color: #5b6474;
  background: #f9fbff;
}

.preview-iframe {
  flex: 1;
  border: none;
  background: #f8faff;
}

@media (max-width: 1440px) {
  .workspace {
    grid-template-columns: 240px 1fr 360px;
  }
}

@media (max-width: 1200px) {
  .workspace {
    grid-template-columns: 220px 1fr;
    grid-template-rows: auto 320px;
  }

  .preview-panel {
    grid-column: span 2;
    height: 320px;
  }
}

@media (max-width: 940px) {
  .workspace {
    grid-template-columns: 1fr;
    grid-template-rows: 260px auto 260px;
  }

  .sidebar {
    flex-direction: row;
    overflow-x: auto;
  }

  .sidebar-groups {
    display: flex;
    gap: 16px;
  }

  .group {
    min-width: 220px;
  }

  .preview-panel {
    grid-column: span 1;
  }
}
</style>

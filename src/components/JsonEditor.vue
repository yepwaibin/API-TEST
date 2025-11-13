<template>
  <div ref="container" class="json-editor-container"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import JSONEditor from "jsoneditor";
import "jsoneditor/dist/jsoneditor.css";

const props = defineProps({
  modelValue: {
    type: [Object, Array],
    default: () => ({}),
  },
  mode: {
    type: String,
    default: "code",
  },
});

const emit = defineEmits(["update:modelValue", "change", "error"]);

const container = ref(null);
let editorInstance = null;
let lastSerializedValue = "";

const serialize = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return "";
  }
};

const initializeEditor = () => {
  if (!container.value) return;

  const options = {
    mode: props.mode,
    modes: ["code", "tree", "view"],
    mainMenuBar: true,
    statusBar: true,
    navigationBar: true,
    onChange() {
      if (!editorInstance) return;
      try {
        const currentValue = editorInstance.get();
        lastSerializedValue = serialize(currentValue);
        emit("update:modelValue", currentValue);
        emit("change", currentValue);
        emit("error", null);
      } catch (error) {
        emit("error", error);
      }
    },
    onError(error) {
      emit("error", error);
    },
    onValidationError(errors) {
      if (errors && errors.length) {
        emit("error", new Error(errors[0].message));
      } else {
        emit("error", null);
      }
    },
  };

  editorInstance = new JSONEditor(
    container.value,
    options,
    props.modelValue ?? {}
  );
  lastSerializedValue = serialize(props.modelValue ?? {});
};

const destroyEditor = () => {
  if (editorInstance) {
    editorInstance.destroy();
    editorInstance = null;
  }
};

onMounted(() => {
  initializeEditor();
});

onBeforeUnmount(() => {
  destroyEditor();
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editorInstance) return;
    const incoming = value ?? {};
    const serialized = serialize(incoming);
    if (serialized === lastSerializedValue) {
      return;
    }
    try {
      editorInstance.update(incoming);
      lastSerializedValue = serialized;
    } catch (error) {
      emit("error", error);
    }
  },
  { deep: true }
);

watch(
  () => props.mode,
  (mode) => {
    if (!editorInstance || !mode) return;
    try {
      editorInstance.setMode(mode);
    } catch (error) {
      emit("error", error);
    }
  }
);
</script>

<style scoped>
.json-editor-container {
  min-height: 260px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #ccd4e8;
  background: #ffffff;
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
}
</style>


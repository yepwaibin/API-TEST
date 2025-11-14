<template>
  <div ref="container" class="json-editor-container"></div>
</template>

<script>
import JSONEditor from "jsoneditor";
import "jsoneditor/dist/jsoneditor.css";

export default {
  name: "JsonEditor",
  props: {
    modelValue: {
      type: [Object, Array],
      default: () => ({}),
    },
    mode: {
      type: String,
      default: "code",
    },
  },
  emits: ["update:modelValue", "change", "error"],
  data() {
    return {
      editorInstance: null,
      lastSerializedValue: "",
    };
  },
  watch: {
    modelValue: {
      handler(value) {
        if (!this.editorInstance) return;
        const incoming = value ?? {};
        const serialized = this.serialize(incoming);
        if (serialized === this.lastSerializedValue) {
          return;
        }
        try {
          this.editorInstance.update(incoming);
          this.lastSerializedValue = serialized;
        } catch (error) {
          this.$emit("error", error);
        }
      },
      deep: true,
    },
    mode(mode) {
      if (!this.editorInstance || !mode) return;
      try {
        this.editorInstance.setMode(mode);
      } catch (error) {
        this.$emit("error", error);
      }
    },
  },
  mounted() {
    this.initializeEditor();
  },
  beforeUnmount() {
    this.destroyEditor();
  },
  methods: {
    serialize(value) {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return "";
      }
    },
    initializeEditor() {
      if (!this.$refs.container) return;

      const options = {
        mode: this.mode,
        modes: ["code", "tree", "view"],
        mainMenuBar: true,
        statusBar: true,
        navigationBar: true,
        onChange: () => {
          if (!this.editorInstance) return;
          try {
            const currentValue = this.editorInstance.get();
            this.lastSerializedValue = this.serialize(currentValue);
            this.$emit("update:modelValue", currentValue);
            this.$emit("change", currentValue);
            this.$emit("error", null);
          } catch (error) {
            this.$emit("error", error);
          }
        },
        onError: (error) => {
          this.$emit("error", error);
        },
        onValidationError: (errors) => {
          if (errors && errors.length) {
            this.$emit("error", new Error(errors[0].message));
          } else {
            this.$emit("error", null);
          }
        },
      };

      this.editorInstance = new JSONEditor(
        this.$refs.container,
        options,
        this.modelValue ?? {}
      );
      this.lastSerializedValue = this.serialize(this.modelValue ?? {});
    },
    destroyEditor() {
      if (this.editorInstance) {
        this.editorInstance.destroy();
        this.editorInstance = null;
      }
    },
  },
};
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

<template>
  <div
    class="floating-menu"
    :class="{ expanded: isExpanded }"
    :style="menuStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="menu-button">
      <div class="menu-label">{{ label }}</div>
    </div>

    <transition name="floating-options">
      <div v-if="isExpanded" class="options-panel">
        <button
          v-for="option in options"
          :key="option.id ?? option.label"
          class="option-item"
          type="button"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </button>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: "FloatingMenu",
  props: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    options: {
      type: Array,
      default: () => [],
    },
    label: {
      type: String,
      default: "快捷操作",
    },
  },
  data() {
    return {
      isExpanded: false,
      collapseTimeout: null,
    };
  },
  computed: {
    menuStyle() {
      return {
        position: "absolute",
        left: `${this.x}px`,
        top: `${this.y}px`,
        minHeight: "36px",
        zIndex: 30,
      };
    },
  },
  methods: {
    handleMouseEnter() {
      clearTimeout(this.collapseTimeout);
      this.isExpanded = true;
    },
    handleMouseLeave() {
      this.collapseTimeout = setTimeout(() => {
        this.isExpanded = false;
      }, 120);
    },
    selectOption(option) {
      this.$emit("select", option);
    },
  },
};
</script>

<style scoped>
.floating-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  border-radius: 20px;
  background: #f0fcfb;
  box-shadow: 0 8px 24px rgba(14, 102, 102, 0.25);
  border: 1px solid rgba(13, 115, 119, 0.25);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  gap: 4px;
  width: fit-content;
  padding: 0;
}

.menu-button {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #0d7377;
  background: transparent;
  text-align: left;
}

.menu-label {
  white-space: nowrap;
  text-align: left;
}

.floating-options-enter-active,
.floating-options-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.floating-options-enter-from,
.floating-options-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.options-panel {
  display: flex;
  flex-direction: column;
  margin: 0;
  background: #f0fcfb;
  padding: 0;
  gap: 4px;
  align-items: stretch;
  width: 100%;
}

.option-item {
  border: none;
  background: #f0fcfb;
  color: #0d7377;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  white-space: nowrap;
  width: 100%;
}

.option-item:hover {
  background: #0d7377;
  color: #ffffff;
}
</style>


<template>
  <div class="monitor-shell">
    <v-card class="monitor-card" variant="tonal">
      <v-card-title class="monitor-card__title">
        <div class="monitor-card__heading">
          <span class="monitor-card__badge" :class="{ 'monitor-card__badge--live': monitorActive }" />
          <div class="monitor-card__label">
          <v-icon class="me-2" size="20">mdi-monitor</v-icon>
            {{ t('serialMonitor.title') }}
          </div>
          <v-chip
            class="monitor-card__status"
            :color="monitorActive ? 'success' : 'grey-darken-1'"
            size="small"
            density="comfortable"
            label
          >
            <v-icon size="16" start>mdi-circle-medium</v-icon>
            {{ monitorActive ? t('serialMonitor.status.live') : t('serialMonitor.status.stopped') }}
          </v-chip>
        </div>
        <div class="monitor-card__actions">
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-play-circle"
            :disabled="monitorActive || !canStart || monitorStarting"
            :loading="monitorStarting"
            @click="emit('start-monitor')"
          >
            {{ t('serialMonitor.actions.start') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            size="small"
            prepend-icon="mdi-stop-circle"
            :disabled="!monitorActive"
            @click="emit('stop-monitor')"
          >
            {{ t('serialMonitor.actions.stop') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            size="small"
            :prepend-icon="paused ? 'mdi-play-circle' : 'mdi-pause-circle'"
            :disabled="!monitorActive"
            @click="togglePause"
          >
            {{ paused ? t('serialMonitor.actions.resume') : t('serialMonitor.actions.pause') }}
          </v-btn>
          <v-btn
            color="secondary"
            variant="text"
            size="small"
            prepend-icon="mdi-eraser"
            :disabled="!hasMonitorOutput"
            @click="emit('clear-monitor')"
          >
            {{ t('serialMonitor.actions.clear') }}
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            size="small"
            prepend-icon="mdi-power-cycle"
            :disabled="!canCommand"
            @click="emit('reset-board')"
          >
            {{ t('serialMonitor.actions.reset') }}
          </v-btn>
          <v-text-field
            v-model="filterText"
            density="compact"
            variant="outlined"
            class="monitor-filter"
            hide-details
            :placeholder="t('serialMonitor.filterPlaceholder')"
            clearable
            prepend-inner-icon="mdi-filter"
            @keydown.stop
          />
        </div>
      </v-card-title>
      <v-card-subtitle class="monitor-card__subtitle text-medium-emphasis">
        {{ t('serialMonitor.subtitle') }}
      </v-card-subtitle>
      <v-alert
        type="info"
        variant="tonal"
        class="monitor-card__info"
        icon="mdi-information-outline"
      >
        {{ t('serialMonitor.info') }}
      </v-alert>
      <v-divider />
      <v-card-text ref="terminalEl" class="monitor-terminal">
        <pre class="monitor-terminal__output">
{{ displayText }}
        </pre>
        <div
          v-if="!hasMonitorOutput"
          class="monitor-terminal__empty"
        >
          {{ t('serialMonitor.emptyState') }}
        </div>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="monitorError"
      type="warning"
      variant="tonal"
      class="monitor-alert"
      icon="mdi-alert-circle-outline"
    >
      {{ monitorError }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import type { SerialMonitorTabEmits, SerialMonitorTabProps } from '../types/serial-monitor';

const props = withDefaults(defineProps<SerialMonitorTabProps>(), {
  monitorText: '',
  monitorActive: false,
  monitorError: null,
  canStart: false,
  canCommand: false,
  monitorStarting: false,
});

  const emit = defineEmits<SerialMonitorTabEmits>();
  const { t } = useI18n();

const terminalEl = ref<unknown>(null);
const filterText = ref('');
const paused = ref(false);
const pausedSnapshot = ref('');

function resolveTerminalElement(target: unknown): HTMLElement | null {
  if (target instanceof HTMLElement) {
    return target;
  }
  if (!target || typeof target !== 'object') {
    return null;
  }
  const el = (target as { $el?: unknown }).$el;
  return el instanceof HTMLElement ? el : null;
}

function scrollToBottom(): void {
  const el = resolveTerminalElement(terminalEl.value);
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

function togglePause(): void {
  if (!paused.value) {
    pausedSnapshot.value = props.monitorText ?? '';
    paused.value = true;
    return;
  }
  pausedSnapshot.value = '';
  paused.value = false;
}

const sourceText = computed(() => (paused.value ? pausedSnapshot.value : props.monitorText));
const displayText = computed(() => {
  const filterValue = (filterText.value ?? '').trim();
  if (!filterValue) return sourceText.value;
  const needle = filterValue.toLowerCase();
  return sourceText.value
    .split(/\r?\n/)
    .filter(line => line.toLowerCase().includes(needle))
    .join('\n');
});
const hasMonitorOutput = computed(() => Boolean(displayText.value && displayText.value.length));

watch(
  () => props.monitorText,
  async () => {
    if (paused.value) {
      if (!props.monitorText) {
        pausedSnapshot.value = '';
      }
      return;
    }
    await nextTick();
    scrollToBottom();
  },
);

watch(
  () => props.monitorActive,
  async active => {
    if (!active) {
      paused.value = false;
      pausedSnapshot.value = '';
      return;
    }
    if (paused.value) return;
    await nextTick();
    scrollToBottom();
  },
);

onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
.monitor-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.monitor-card {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--v-theme-primary) 18%, transparent);
  background: color-mix(in srgb, var(--v-theme-surface) 92%, transparent);
  overflow: hidden;
}

.monitor-card__title {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: space-between;
}

.monitor-card__heading {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.monitor-card__badge {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--v-theme-on-surface) 45%, transparent);
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.12);
}

.monitor-card__badge--live {
  background: color-mix(in srgb, var(--v-theme-success) 85%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--v-theme-success) 35%, transparent);
}

.monitor-card__label {
  display: inline-flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
}

.monitor-card__status {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.monitor-card__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.monitor-filter {
  min-width: 220px;
  max-width: 300px;
}

.monitor-card__subtitle {
  font-size: 0.75rem;
  padding: 0 24px 4px;
}

.monitor-card__info {
  margin: 0 24px 12px;
  font-size: 0.8rem;
  line-height: 1.4;
}

.monitor-terminal {
  background: rgba(15, 23, 42, 0.85);
  border-radius: 12px;
  padding: 14px;
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.monitor-terminal::-webkit-scrollbar {
  width: 8px;
}

.monitor-terminal::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

.monitor-terminal__output {
  margin: 0;
  font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.48;
  white-space: pre-wrap;
  color: rgba(226, 232, 240, 0.9);
  min-height: 260px;
  max-height: 100%;
  pointer-events: none;
}

.monitor-alert {
  margin-top: 4px;
}

.monitor-terminal__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.9rem;
  color: rgba(226, 232, 240, 0.55);
  pointer-events: none;
  padding: 20px;
}

@media (max-width: 959px) {
  .monitor-card__title {
    flex-direction: column;
    align-items: flex-start;
  }

  .monitor-card__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

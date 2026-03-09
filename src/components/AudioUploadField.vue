<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <label v-if="label" class="text-xs font-extrabold text-[color:var(--color-ink-soft)]">
        {{ label }}
      </label>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-[var(--color-border)] bg-[var(--glass-strong)] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--color-ink-soft)] transition hover:text-[color:var(--color-ink)]"
          @click.stop="showUrlInput = !showUrlInput"
        >
          <i class="pi pi-link mr-1 text-[10px]" />{{ showUrlInput ? 'Hide URL' : 'Paste URL' }}
        </button>
        <button
          type="button"
          class="rounded-full border border-[var(--color-border)] bg-[var(--glass-strong)] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--color-ink-soft)] transition hover:text-[color:var(--color-ink)]"
          @click.stop="startRecording"
          :disabled="recording"
        >
          <i class="pi pi-microphone mr-1 text-[10px]" />{{ recording ? 'Recording...' : 'Record' }}
        </button>
        <button
          v-if="modelValue"
          type="button"
          class="rounded-full border border-[var(--color-border)] bg-[var(--glass-strong)] px-2.5 py-0.5 text-[11px] font-semibold text-red-500/80 transition hover:text-red-600"
          @click.stop="clearAudio"
          :disabled="uploading"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Collapsible URL input -->
    <div v-if="showUrlInput" class="flex gap-2">
      <InputText
        :modelValue="modelValue"
        @update:modelValue="$emit('update:modelValue', $event)"
        class="w-full !text-xs"
        placeholder="https://..."
      />
    </div>

    <!-- Audio preview OR drop zone -->
    <div v-if="modelValue" class="relative w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--glass)] shadow-sm">
      <div class="flex items-center gap-3 p-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--glass-strong)]">
          <i class="pi pi-volume-up text-lg text-[color:var(--color-ink)]"></i>
        </div>
        <div class="flex-1">
          <div class="text-xs font-semibold text-[color:var(--color-ink)]">Voice Sample</div>
          <audio :src="resolvedSrc" controls class="mt-1 w-full max-w-xs"></audio>
        </div>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="audio/*"
        class="hidden"
        @change="onFileChange"
      />
    </div>

    <div
      v-else
      class="group relative w-full overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-[var(--glass)] transition"
      :class="dropZoneState"
      @click="browse"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="audio/*"
        class="hidden"
        @change="onFileChange"
      />

      <div
        v-if="uploading"
        class="absolute inset-0 z-10 grid place-items-center bg-[var(--glass-strong)] text-xs font-semibold text-[color:var(--color-ink)]"
      >
        Uploading…
      </div>

      <div
        class="pointer-events-none flex flex-col items-center justify-center gap-2 px-4 py-5 text-center"
      >
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--glass-strong)] text-[color:var(--color-ink-soft)] shadow-sm"
        >
          <i class="pi pi-volume-up text-sm"></i>
        </div>
        <div class="text-xs font-semibold text-[color:var(--color-ink)]">
          {{ uploadHeadline }}
        </div>
        <div class="text-[11px] font-medium leading-relaxed text-[color:var(--color-ink-soft)]">
          {{ helperCopy }}
        </div>
      </div>
    </div>

    <div class="text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
      <slot name="helper">
        {{ defaultHelper }}
      </slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import InputText from "primevue/inputtext";
import { uploadFile } from "../lib/upload";

export default defineComponent({
  components: { InputText },
  props: {
    modelValue: { type: String, default: "" },
    label: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const fileInput = ref<HTMLInputElement>();
    const showUrlInput = ref(false);
    const uploading = ref(false);
    const recording = ref(false);
    const mediaRecorder = ref<MediaRecorder | null>(null);
    const recordedChunks = ref<Blob[]>([]);

    const resolvedSrc = computed(() => {
      if (!props.modelValue) return "";
      if (props.modelValue.startsWith("http")) return props.modelValue;
      return props.modelValue; // Assume it's a relative path
    });

    const uploadHeadline = computed(() => {
      if (recording.value) return "Recording...";
      return "Upload or record audio";
    });

    const helperCopy = computed(() => {
      if (recording.value) return "Click stop when finished";
      return "Drag & drop an audio file or click to browse";
    });

    const defaultHelper = computed(() => {
      return "Supported formats: MP3, WAV, M4A. Max size: 10MB";
    });

    const dropZoneState = computed(() => {
      return {
        "border-blue-400 bg-blue-50/10": false, // No drag states for now
      };
    });

    const browse = () => {
      fileInput.value?.click();
    };

    const onDragEnter = () => {
      // Could add visual feedback
    };

    const onDragOver = () => {
      // Could add visual feedback
    };

    const onDragLeave = () => {
      // Could add visual feedback
    };

    const onDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    const onFileChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    const handleFile = async (file: File) => {
      if (!file.type.startsWith("audio/")) {
        alert("Please select an audio file");
        return;
      }

      uploading.value = true;
      try {
        const uploadPath = await uploadFile(file, "audio");
        emit("update:modelValue", uploadPath);
      } catch (error) {
        console.error("Upload failed:", error);
        alert("Upload failed. Please try again.");
      } finally {
        uploading.value = false;
      }
    };

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.value = new MediaRecorder(stream);
        recordedChunks.value = [];

        mediaRecorder.value.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.value.push(event.data);
          }
        };

        mediaRecorder.value.onstop = async () => {
          const blob = new Blob(recordedChunks.value, { type: "audio/webm" });
          const file = new File([blob], "recording.webm", { type: "audio/webm" });
          await handleFile(file);
          recording.value = false;

          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.value.start();
        recording.value = true;
      } catch (error) {
        console.error("Recording failed:", error);
        alert("Recording failed. Please check microphone permissions.");
      }
    };

    const stopRecording = () => {
      if (mediaRecorder.value && recording.value) {
        mediaRecorder.value.stop();
      }
    };

    const clearAudio = () => {
      emit("update:modelValue", "");
    };

    // Expose stopRecording for potential use
    return {
      fileInput,
      showUrlInput,
      uploading,
      recording,
      resolvedSrc,
      uploadHeadline,
      helperCopy,
      defaultHelper,
      dropZoneState,
      browse,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
      onFileChange,
      startRecording,
      stopRecording,
      clearAudio,
    };
  },
});
</script>
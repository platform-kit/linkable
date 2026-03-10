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
          <i class="pi pi-link mr-1 text-[10px]"></i>{{ showUrlInput ? 'Hide URL' : 'Paste URL' }}
        </button>
        <button
          type="button"
          class="rounded-full border border-[var(--color-border)] bg-[var(--glass-strong)] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--color-ink-soft)] transition hover:text-[color:var(--color-ink)]"
          @click.stop="toggleRecording"
          :disabled="uploading"
        >
          <i class="pi pi-microphone mr-1 text-[10px]"></i>{{ recording ? 'Stop' : 'Record' }}
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
    <div
      v-if="modelValue"
      class="relative w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--glass)] shadow-sm"
    >
      <div class="flex items-center gap-3 p-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--glass-strong)]">
          <i class="pi pi-volume-up text-lg text-[color:var(--color-ink)]"></i>
        </div>
        <div class="flex-1">
          <div class="text-xs font-semibold text-[color:var(--color-ink)]">Voice Sample</div>
          <audio :src="resolvedSrc" controls class="mt-1 w-full max-w-xs">
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
      <input ref="fileInput" type="file" accept="audio/*" class="hidden" @change="onFileChange" />
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
      <input ref="fileInput" type="file" accept="audio/*" class="hidden" @change="onFileChange" />

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
import { uploadFile } from "@/lib/upload";
import { Input, Output, Conversion, ALL_FORMATS, BlobSource, BufferTarget, Mp3OutputFormat } from "mediabunny";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";

// Register MP3 encoder
registerMp3Encoder();

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
    const recordingStartTime = ref<number>(0);
    const recordingDuration = ref<number>(0);

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
      if (recording.value) return `Recording... ${recordingDuration.value}s (aim for 10-30 seconds)`;
      return "Drag & drop an audio file or click to browse";
    });

    const defaultHelper = computed(() => {
      return "Supported formats: MP3, WAV, M4A. For voice cloning, use 10-30 seconds of clear speech. Max size: 10MB";
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
        // Determine file extension based on MIME type
        let extension = "mp3"; // default
        if (file.type === "audio/wav" || file.type === "audio/wave") {
          extension = "wav";
        } else if (file.type === "audio/webm") {
          extension = "webm";
        } else if (file.type === "audio/mpeg" || file.type === "audio/mp3") {
          extension = "mp3";
        } else if (file.type === "audio/m4a" || file.type === "audio/mp4") {
          extension = "m4a";
        }

        // Create new file with "voice" prefix
        const renamedFile = new File([file], `voice.${extension}`, { type: file.type });
        const uploadPath = await uploadFile(renamedFile, "audio");
        emit("update:modelValue", uploadPath);
      } catch (error) {
        console.error("Upload failed:", error);
        const detail = error instanceof Error ? error.message : "Unknown error";
        alert(`Upload failed: ${detail}`);
      } finally {
        uploading.value = false;
      }
    };

    let durationInterval: ReturnType<typeof setInterval> | null = null;

    const cleanupDurationInterval = () => {
      if (durationInterval !== null) {
        clearInterval(durationInterval);
        durationInterval = null;
      }
    };

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.value = new MediaRecorder(stream);
        recordedChunks.value = [];
        recordingStartTime.value = Date.now();
        recordingDuration.value = 0;

        mediaRecorder.value.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.value.push(event.data);
          }
        };

        mediaRecorder.value.onstop = async () => {
          cleanupDurationInterval();
          const finalDuration = Math.floor((Date.now() - recordingStartTime.value) / 1000);
          
          if (recordedChunks.value.length === 0) {
            alert("No audio data recorded. Please check microphone permissions.");
            recording.value = false;
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          if (finalDuration < 5) {
            // Removed alert for short recordings
          }
          const webmBlob = new Blob(recordedChunks.value, { type: "audio/webm" });
          console.log("Recorded blob:", webmBlob.size, "bytes, type:", webmBlob.type);

          // Convert webm to mp3 in browser
          try {
            console.log("Starting MP3 conversion...");
            const mp3Blob = await convertWebmToMp3(webmBlob);
            console.log("MP3 conversion successful:", mp3Blob.size, "bytes, type:", mp3Blob.type);
            const file = new File([mp3Blob], "voice.mp3", { type: "audio/mpeg" });
            await handleFile(file);
          } catch (err) {
            console.error("MP3 conversion failed:", err);
            // Fallback: try uploading the webm file directly
            console.log("Attempting fallback upload of webm file...");
            try {
              const fallbackFile = new File([webmBlob], "voice.webm", { type: "audio/webm" });
              await handleFile(fallbackFile);
              alert("Audio uploaded as WebM. MP3 conversion failed, but file was saved.");
            } catch (fallbackErr) {
              console.error("Fallback upload also failed:", fallbackErr);
              alert("Audio conversion and upload failed. Please try again.");
            }
          }

          recording.value = false;
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };

        try {
          mediaRecorder.value.start();
        } catch (startErr) {
          // Clean up stream if start() fails
          stream.getTracks().forEach(track => track.stop());
          throw startErr;
        }

        recording.value = true;

        // Start duration timer only after successful start
        durationInterval = setInterval(() => {
          if (recording.value) {
            recordingDuration.value = Math.floor((Date.now() - recordingStartTime.value) / 1000);
          } else {
            cleanupDurationInterval();
          }
        }, 1000);
      } catch (error) {
        console.error("Recording failed:", error);
        alert("Recording failed. Please check microphone permissions.");
      }
    };

    const stopRecording = () => {
      cleanupDurationInterval();
      if (mediaRecorder.value && recording.value) {
        mediaRecorder.value.stop();
        recordingDuration.value = 0;
      }
    };

    const toggleRecording = () => {
      if (recording.value) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    const clearAudio = () => {
      emit("update:modelValue", "");
    };

    const convertWebmToMp3 = async (webmBlob: Blob): Promise<Blob> => {
      console.log("Starting mediabunny WebM to MP3 conversion...");

      try {
        // Create input from WebM blob
        const input = new Input({
          source: new BlobSource(webmBlob),
          formats: ALL_FORMATS,
        });

        // Create output for MP3
        const output = new Output({
          format: new Mp3OutputFormat({
            bitrate: 128, // 128kbps MP3
          }),
          target: new BufferTarget(),
        });

        console.log("Initializing conversion...");
        // Initialize and execute conversion
        const conversion = await Conversion.init({ input, output });
        await conversion.execute();

        console.log("Conversion completed successfully");

        // Get the converted MP3 data
        const mp3Buffer = output.target.buffer;
        console.log("MP3 output size:", mp3Buffer.length);

        return new Blob([mp3Buffer], { type: 'audio/mpeg' });
      } catch (error) {
        console.error("mediabunny conversion error:", error);
        throw error;
      }
    };

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
      handleFile,
      startRecording,
      stopRecording,
      toggleRecording,
      clearAudio,
      convertWebmToMp3,
    };
  },
});
</script>

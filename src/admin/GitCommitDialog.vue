<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Git Commit"
    :style="{ width: 'min(600px, 96vw)' }"
    :contentStyle="{ overflow: 'auto' }"
  >
    <div class="space-y-4">
      <div class="grid gap-2">
        <label class="text-xs font-bold text-[color:var(--color-ink-soft)]">Commit Message</label>
        <Textarea
          v-model="commitMessage"
          placeholder="Enter commit message..."
          :rows="4"
          auto-resize
        />
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <Button rounded severity="secondary" @click="visible = false">Cancel</Button>
        <Button
          rounded
          class="!border-0 !bg-[color:var(--color-brand)] !px-4 !py-2.5 shadow-[0_14px_38px_rgba(37,99,235,0.22)]"
          :loading="committing"
          @click="handleCommit"
        >
          <i class="pi pi-check" />
          <span class="ml-2">Commit</span>
        </Button>
      </div>
    </template>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Textarea from "primevue/textarea";
import { useToast } from "primevue/usetoast";

export default defineComponent({
  name: "GitCommitDialog",
  components: {
    Dialog,
    Button,
    Textarea,
  },
  props: {
    open: { type: Boolean, required: true },
  },
  emits: ["update:open", "commit"],
  setup(props, { emit }) {
    const toast = useToast();

    const visible = ref(props.open);
    watch(
      () => props.open,
      (value) => (visible.value = value),
    );
    watch(visible, (value) => emit("update:open", value));

    const commitMessage = ref("");
    const committing = ref(false);

    const handleCommit = async () => {
      if (!commitMessage.value.trim()) {
        toast.add({
          severity: "warn",
          summary: "Empty message",
          detail: "Please enter a commit message.",
          life: 2400,
        });
        return;
      }

      committing.value = true;
      try {
        // emit the message to parent; parent handles the actual commit logic
        emit("commit", commitMessage.value);
        commitMessage.value = "";
        visible.value = false;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to commit changes.";
        toast.add({
          severity: "error",
          summary: "Commit failed",
          detail: message,
          life: 2400,
        });
      } finally {
        committing.value = false;
      }
    };

    return {
      visible,
      commitMessage,
      committing,
      handleCommit,
    };
  },
});
</script>

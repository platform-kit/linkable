<template>
  <AudioUploadField
    :modelValue="context._value || ''"
    @update:modelValue="context.node.input($event)"
    :label="''"
    :description="context.attrs?.description"
  />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AudioUploadField from "../AudioUploadField.vue";

export default defineComponent({
  components: { AudioUploadField },
  props: {
    context: { type: Object, required: true },
  },
});
</script>
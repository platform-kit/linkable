<template>
  <div class="flex flex-col items-center gap-4 py-6 px-4">
    <div class="text-center">
      <h3 class="text-lg font-bold text-[color:var(--color-ink)]">Stay in the loop</h3>
      <p class="mt-1 text-sm text-[color:var(--color-ink-soft)]">
        Subscribe to get updates straight to your inbox.
      </p>
    </div>

    <form
      v-if="!submitted"
      class="flex w-full max-w-sm gap-2 rounded-xl"
      @submit.prevent="subscribe"
    >
      <InputText
        v-model="email"
        type="email"
        style="border-radius:25px !important;"
        placeholder="you@example.com"
        class="flex-1"
        required
        :disabled="loading"
      />
      <Button type="submit" rounded class="!rounded-full shrink-0" :loading="loading">
        <i class="pi pi-send" />
        <span class="ml-2">Subscribe</span>
      </Button>
    </form>

    <div
      v-else
      class="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-700"
    >
      <i class="pi pi-check-circle" />
      Check your email to confirm your subscription!
    </div>

    <div v-if="error" class="text-xs font-semibold text-red-500">{{ error }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { supabase } from '../lib/supabase';

export default defineComponent({
  name: 'NewsletterSignup',
  components: { Button, InputText },
  setup() {
    const email = ref('');
    const loading = ref(false);
    const submitted = ref(false);
    const error = ref('');

    const subscribe = async () => {
      error.value = '';

      if (!supabase) {
        error.value = 'Newsletter is not configured.';
        return;
      }

      loading.value = true;
      try {
        const { data, error: fnError } = await supabase.functions.invoke('newsletter-signup', {
          body: { email: email.value.trim().toLowerCase() },
        });

        if (fnError) {
          error.value = 'Something went wrong. Please try again.';
        } else if (data?.alreadyConfirmed) {
          submitted.value = true;
        } else {
          submitted.value = true;
        }
      } catch {
        error.value = 'Something went wrong. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    return { email, loading, submitted, error, subscribe };
  },
});
</script>

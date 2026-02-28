<template>
  <div class="min-h-dvh">
    <header class="mx-auto w-full max-w-[740px] px-4 pt-6 sm:pt-10">
      <div class="glass rounded-[var(--radius-xl)] p-4 sm:p-6">
        <div class="flex items-start gap-4">
          <div
            class="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/60 bg-white/45 shadow-sm backdrop-blur-md"
          >
            <img
              v-if="avatarSrc"
              :src="avatarSrc"
              alt="Avatar"
              class="h-full w-full object-cover"
              @error="onAvatarError"
            />
            <div
              v-else
              class="grid h-full w-full place-items-center bg-white/55 text-sm font-semibold text-[color:var(--color-ink-soft)]"
            >
              {{ initials }}
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h1 class="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {{ model.profile.displayName || "Your Name" }}
                </h1>
                <p
                  v-if="model.profile.tagline"
                  class="mt-1 line-clamp-2 text-sm text-[color:var(--color-ink-soft)]"
                >
                  {{ model.profile.tagline }}
                </p>
                <p v-else class="mt-1 text-sm text-[color:var(--color-ink-soft)]">
                  Add a short tagline in the CMS.
                </p>
              </div>

              <div class="flex items-center gap-2">
                <Button
                  v-if="canUseCms"
                  severity="secondary"
                  rounded
                  class="!px-3 !py-2 !text-sm"
                  @click="previewMode = !previewMode"
                >
                  <i class="pi" :class="previewMode ? 'pi-pencil' : 'pi-eye'" />
                  <span class="ml-2 hidden sm:inline">{{
                    previewMode ? "Enter Edit Mode" : "Return to Preview"
                  }}</span>
                </Button>
                <Button
                  v-if="canUseCms"
                  rounded
                  class="!border-0 !bg-[color:var(--color-brand)] !px-4 !py-2.5 !text-sm shadow-[0_14px_38px_rgba(37,99,235,0.22)] hover:shadow-[0_18px_52px_rgba(37,99,235,0.26)]"
                  @click="cmsOpen = true"
                >
                  <i class="pi pi-sliders-h" />
                  <span class="ml-2 hidden sm:inline">CMS</span>
                </Button>
                <Button
                  severity="secondary"
                  rounded
                  class="!px-3 !py-2 !text-sm"
                  @click="githubDialogOpen = true"
                >
                  <i class="pi pi-github" />
                  <span class="ml-2 hidden sm:inline">GitHub</span>
                </Button>
              </div>
            </div>
            <!-- rest of the file stays unchanged -->
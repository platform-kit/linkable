<template>
  <section class="glass overflow-hidden rounded-[var(--radius-xl)] p-3 sm:p-6">
    <!-- Bio -->
    <div v-if="resume.bio" class="mb-4 sm:mb-5">
      <h2
        class="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-soft)] sm:mb-2 sm:text-xs"
      >
        About
      </h2>
      <p
        class="text-[13px] leading-relaxed text-[color:var(--color-ink)] sm:text-sm"
        style="white-space: pre-line"
      >
        {{ resume.bio }}
      </p>
    </div>

    <!-- Employment -->
    <div v-if="resume.employment.length" class="mb-4 sm:mb-5">
      <h2
        class="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-soft)] sm:mb-3 sm:text-xs"
      >
        Experience
      </h2>
      <div class="grid gap-2 sm:gap-3">
        <div
          v-for="job in resume.employment"
          :key="job.id"
          class="card-item rounded-xl p-3 shadow-sm sm:rounded-2xl sm:p-4"
        >
          <div class="flex items-start justify-between gap-2 sm:gap-3">
            <div class="min-w-0 flex-1">
              <div
                class="text-[13px] font-semibold text-[color:var(--color-ink)] sm:text-sm"
              >
                {{ job.role }}
              </div>
              <div
                class="text-[11px] font-semibold text-[color:var(--color-ink-soft)] sm:text-xs"
              >
                {{ job.company }}
              </div>
            </div>
            <div
              v-if="job.startYear || job.endYear"
              class="shrink-0 text-[11px] font-semibold text-[color:var(--color-ink-soft)] sm:text-xs"
            >
              {{ job.startYear }}–{{ job.endYear }}
            </div>
          </div>
          <p
            v-if="job.description"
            class="mt-1.5 text-[11px] leading-relaxed text-[color:var(--color-ink-soft)] sm:mt-2 sm:text-xs"
            style="white-space: pre-line"
          >
            {{ job.description }}
          </p>
        </div>
      </div>
    </div>

    <!-- Education -->
    <div v-if="resume.education.length" class="mb-4 sm:mb-5">
      <h2
        class="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-soft)] sm:mb-3 sm:text-xs"
      >
        Education
      </h2>
      <div class="grid gap-2 sm:gap-3">
        <div
          v-for="edu in resume.education"
          :key="edu.id"
          class="card-item rounded-xl p-3 shadow-sm sm:rounded-2xl sm:p-4"
        >
          <div class="flex items-start justify-between gap-2 sm:gap-3">
            <div class="min-w-0 flex-1">
              <div
                class="text-[13px] font-semibold text-[color:var(--color-ink)] sm:text-sm"
              >
                {{ edu.institution }}
              </div>
              <div
                class="text-[11px] font-semibold text-[color:var(--color-ink-soft)] sm:text-xs"
              >
                {{ [edu.degree, edu.field].filter(Boolean).join(" · ") }}
              </div>
            </div>
            <div
              v-if="edu.startYear || edu.endYear"
              class="shrink-0 text-[11px] font-semibold text-[color:var(--color-ink-soft)] sm:text-xs"
            >
              {{ edu.startYear }}–{{ edu.endYear }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Skills -->
    <div v-if="resume.skills.length" class="mb-4 sm:mb-5">
      <h2
        class="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-soft)] sm:mb-3 sm:text-xs"
      >
        Skills
      </h2>
      <div class="flex flex-wrap gap-1.5 sm:gap-2">
        <span
          v-for="(skill, i) in resume.skills"
          :key="i"
          class="card-item inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm sm:px-3 sm:py-1.5 sm:text-xs"
        >
          {{ skill }}
        </span>
      </div>
    </div>

    <!-- Achievements -->
    <div v-if="resume.achievements.length">
      <h2
        class="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-soft)] sm:mb-3 sm:text-xs"
      >
        Achievements
      </h2>
      <div class="grid gap-2 sm:gap-3">
        <div
          v-for="ach in resume.achievements"
          :key="ach.id"
          class="card-item rounded-xl p-3 shadow-sm sm:rounded-2xl sm:p-4"
        >
          <div class="flex items-start justify-between gap-2 sm:gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <i class="pi pi-star-fill text-[11px] text-amber-500" />
                <div
                  class="text-[13px] font-semibold text-[color:var(--color-ink)] sm:text-sm"
                >
                  {{ ach.title }}
                </div>
              </div>
              <div
                v-if="ach.issuer"
                class="text-[11px] font-semibold text-[color:var(--color-ink-soft)] sm:text-xs"
              >
                {{ ach.issuer }}
              </div>
            </div>
            <div
              v-if="ach.year"
              class="shrink-0 text-[11px] font-semibold text-[color:var(--color-ink-soft)] sm:text-xs"
            >
              {{ ach.year }}
            </div>
          </div>
          <p
            v-if="ach.description"
            class="mt-1.5 text-[11px] leading-relaxed text-[color:var(--color-ink-soft)] sm:mt-2 sm:text-xs"
            style="white-space: pre-line"
          >
            {{ ach.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { BioResume } from "@/lib/model";
export type { ResumeSectionProps } from "@/lib/component-contracts";

export default defineComponent({
  name: "ResumeSection",
  props: {
    resume: { type: Object as PropType<BioResume>, required: true },
  },
});
</script>

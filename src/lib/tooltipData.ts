import type { TooltipItem } from "@/components/SelectTooltip";

export const documentTypeTooltip: TooltipItem[] = [
  { value: "SOURCE_MATERIAL", label: "Source Material", color: "bg-gray-100 text-gray-500",    description: "Reference documents, research, and client input." },
  { value: "DRAFT",           label: "Draft",           color: "bg-blue-50 text-blue-600",      description: "Intermediate concept versions in progress." },
  { value: "FINAL",           label: "Final",           color: "bg-green-50 text-green-600",    description: "The finished, deliverable concept." },
  { value: "SUPPORTING",      label: "Supporting",      color: "bg-yellow-50 text-yellow-600",  description: "Appendices, data exports, and supplementary files." },
];

export const languageTooltip: TooltipItem[] = [
  { value: "DE", label: "German",  description: "Concept documents and agent outputs are produced in German." },
  { value: "EN", label: "English", description: "Concept documents and agent outputs are produced in English." },
];

export const projectStatusTooltip: TooltipItem[] = [
  { value: "DRAFT",       label: "DRAFT",       color: "bg-gray-100 text-gray-500",    description: "Initial state, work in progress." },
  { value: "IN_PROGRESS", label: "IN PROGRESS", color: "bg-blue-50 text-blue-600",     description: "Actively being worked on." },
  { value: "REVIEW",      label: "REVIEW",      color: "bg-yellow-50 text-yellow-600", description: "Ready for internal or client review." },
  { value: "DONE",        label: "DONE",        color: "bg-green-50 text-green-600",   description: "Finalised and delivered." },
];

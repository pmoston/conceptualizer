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

export const platformTooltip: TooltipItem[] = [
  {
    value: "MICROSOFT_FABRIC",
    label: "Microsoft Fabric",
    color: "bg-blue-50 text-blue-700",
    description:
      "Microsoft's unified SaaS analytics platform (GA Nov 2023). Integrates OneLake, Data Factory, Synapse, Power BI, Real-Time Intelligence, and Data Activator into one subscription. Dataciders' primary modern-data-platform offering. Best fit for organisations already in Microsoft 365/Azure that want low operational complexity and a single governance layer.",
  },
  {
    value: "MICROSOFT_AZURE",
    label: "Microsoft Azure",
    color: "bg-sky-50 text-sky-700",
    description:
      "The broader Azure data & AI stack beyond Fabric: Azure Data Factory, Azure Data Lake Storage, Azure SQL Database, Azure Synapse Analytics (standalone), Azure Machine Learning, Azure OpenAI Service. Right choice when the concept spans infrastructure (networking, security, DevOps) alongside data, or when the customer runs an IaaS/PaaS-heavy architecture not yet ready for Fabric.",
  },
  {
    value: "DATABRICKS",
    label: "Databricks",
    color: "bg-orange-50 text-orange-700",
    description:
      "The leading independent lakehouse platform. Founded by the creators of Apache Spark. Core strengths: Delta Lake open-format storage, MLflow experiment tracking, Unity Catalog for unified governance, and Spark-native large-scale ML/AI workloads. Chosen by enterprises that prioritise open standards, multi-cloud portability (Azure/AWS/GCP), or have existing Spark investments. Separate from Azure because Databricks customers often have an explicit preference for vendor independence.",
  },
  {
    value: "DENODO",
    label: "Denodo",
    color: "bg-purple-50 text-purple-700",
    description:
      "Market-leading data virtualisation platform (Gartner Magic Quadrant). Enables federated querying across disparate sources — ERP, CRM, cloud DWH, REST APIs — without physical data movement. Critical for regulated industries (banking, insurance, pharma) with strict data-residency rules, complex legacy-ERP integrations, or where ETL-heavy replication is impractical. Concepts in this category typically involve logical data warehouse or data fabric architecture.",
  },
  {
    value: "OTHER",
    label: "Other",
    color: "bg-gray-100 text-gray-500",
    description:
      "Platform not listed above (e.g. Snowflake, Google BigQuery, AWS Redshift, SAP BW/4HANA). Specify the platform in the project description.",
  },
];

export const projectStatusTooltip: TooltipItem[] = [
  { value: "DRAFT",       label: "DRAFT",       color: "bg-gray-100 text-gray-500",    description: "Initial state, work in progress." },
  { value: "IN_PROGRESS", label: "IN PROGRESS", color: "bg-blue-50 text-blue-600",     description: "Actively being worked on." },
  { value: "REVIEW",      label: "REVIEW",      color: "bg-yellow-50 text-yellow-600", description: "Ready for internal or client review." },
  { value: "DONE",        label: "DONE",        color: "bg-green-50 text-green-600",   description: "Finalised and delivered." },
];

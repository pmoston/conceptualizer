export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1c1e3b] mb-1">Help</h1>
      <p className="text-gray-500 text-sm mb-6">How to use the Conceptualizer portal.</p>

      {/* Table of Contents */}
      <nav className="bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contents</p>
        <ol className="space-y-1 text-sm">
          <TocItem href="#overview" label="Overview" />
          <TocItem href="#customers" label="Customers" />
          <TocItem href="#projects" label="Projects" />
          <TocItem href="#documents" label="Documents" />
          <TocItem href="#agents" label="AI Agents" />
          <TocItem href="#agents" label="↳ Workflow, dialogue, audit log" />
        </ol>
      </nav>

      <div className="space-y-8">

        <Section id="overview" title="Overview">
          <p>
            Conceptualizer is a portal for creating and managing consulting concepts at Dataciders.
            The typical workflow is:
          </p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Import or add a customer</li>
            <li>Create a project for that customer</li>
            <li>Upload source materials (PDFs, DOCX, XLSX, images, text files)</li>
            <li>Run AI agents to draft, review, and refine the concept</li>
            <li>Export or deliver the finished document</li>
          </ol>
        </Section>

        <Section id="customers" title="Customers">
          <SubSection title="Adding customers manually">
            <p>
              Click <Strong>Add Customer</Strong> on the Customers page to create a company by entering
              its name, domain, and industry. Contacts and deals can then be added from the customer detail page.
            </p>
          </SubSection>
          <SubSection title="Importing from a HubSpot CSV export">
            <p>
              Click <Strong>Import CSV</Strong> to import companies, contacts, or deals from a HubSpot CSV export.
              Export data from HubSpot via <em>CRM → [Object] → Actions → Export</em>, then upload the file here.
              Import in this order:
            </p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Companies — creates or updates customer records by HubSpot Record ID</li>
              <li>Contacts — matched to companies via the Associated Company ID column</li>
              <li>Deals — matched to companies via the Associated Company ID column</li>
            </ol>
            <p className="mt-2">
              Re-importing a file that was already imported will update existing records rather than create duplicates.
            </p>
          </SubSection>
          <SubSection title="Customer detail">
            <p>
              Click a company name to view its detail page. From here you can add or remove contacts and deals,
              and see all linked projects. Use the <Strong>Delete</Strong> button to permanently remove a customer
              along with all its contacts, deals, and projects.
            </p>
          </SubSection>
        </Section>

        <Section id="projects" title="Projects">
          <SubSection title="Creating a project">
            <p>
              Click <Strong>New Project</Strong> on the Projects page. You must select a customer.
              Optionally link the project to one of that customer&apos;s HubSpot deals, which provides
              useful context for the agents.
            </p>
            <p className="mt-2">
              Projects have a <Strong>language</Strong> setting (German or English). All concept
              documents and agent outputs will be produced in that language.
            </p>
          </SubSection>
          <SubSection title="Project status">
            <p>
              Use the status dropdown on the project detail page to track progress:
            </p>
            <ul className="mt-1 space-y-1">
              <StatusBadge label="DRAFT" color="bg-gray-100 text-gray-500" description="Initial state, work in progress" />
              <StatusBadge label="IN PROGRESS" color="bg-blue-50 text-blue-600" description="Actively being worked on" />
              <StatusBadge label="REVIEW" color="bg-yellow-50 text-yellow-600" description="Ready for internal or client review" />
              <StatusBadge label="DONE" color="bg-green-50 text-green-600" description="Finalised and delivered" />
            </ul>
          </SubSection>
          <SubSection title="Deleting a project">
            <p>
              Click the trash icon on the project detail page. This permanently deletes the project,
              all uploaded documents, and all agent run history.
            </p>
          </SubSection>
        </Section>

        <Section id="documents" title="Documents">
          <SubSection title="Uploading">
            <p>
              On the project detail page, click <Strong>Upload</Strong> in the Documents section.
              Supported formats:{" "}
              {["PDF", "DOCX", "XLSX", "TXT", "PNG", "JPG", "SVG"].map(fmt => (
                <code key={fmt} className="bg-gray-100 px-1 rounded text-xs mx-0.5">{fmt}</code>
              ))}.
            </p>
            <p className="mt-2">
              A PNG preview is generated automatically on upload for all formats. For image files,
              the text content is additionally extracted via OCR (Tesseract) and made available to AI agents.
            </p>
            <p className="mt-2">Assign a document type when uploading:</p>
            <ul className="mt-1 space-y-1 text-sm text-gray-600">
              <li><Strong>Source Material</Strong> — reference documents, research, client input</li>
              <li><Strong>Draft</Strong> — intermediate concept versions</li>
              <li><Strong>Final</Strong> — the finished, deliverable concept</li>
              <li><Strong>Supporting</Strong> — appendices, data exports, supplementary files</li>
            </ul>
          </SubSection>
          <SubSection title="Managing documents">
            <p>
              Hover over a document row to reveal action icons: <Strong>Preview</Strong> (eye icon),{" "}
              <Strong>Open</Strong> (external link), <Strong>Edit</Strong> (rename or change type), and{" "}
              <Strong>Delete</Strong>. Deletion removes both the database record and the stored file.
            </p>
          </SubSection>
        </Section>

        <Section id="agents" title="AI Agents">
          <p>
            The Agents tab on a project page lets you run AI agents on your uploaded documents.
            Agents are invoked one at a time and stream their output in real time. Each run is saved
            and can be reviewed in full detail via the run history.
          </p>

          <SubSection title="Workflow">
            <p>
              The agent page shows the recommended pipeline in order. Each agent feeds into the next:
            </p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li><Strong>Read Materials</Strong> — analyses all uploaded documents and produces a structured brief</li>
              <li><Strong>Draft</Strong> — writes the concept document; reruns with fact-check feedback until the draft passes (up to 3 iterations)</li>
              <li><Strong>Fact-Check</Strong> — cross-references every claim against source materials</li>
              <li><Strong>Humanize</Strong> — rewrites AI-sounding passages to match Dataciders' tone</li>
              <li><Strong>Corporate Design Review</Strong> — checks structure and wording against brand guidelines; triggers a full revision cycle (Draft → Fact-Check → Humanize → CDR) if critical issues are found, up to 3 times</li>
              <li><Strong>Executive Summary</Strong> — generates a 1-page summary from the approved concept</li>
            </ol>
            <p className="mt-2">
              Standalone agents (<Strong>Translate</Strong>, <Strong>QA Checklist</Strong>) can be run independently at any point.
            </p>
          </SubSection>

          <SubSection title="Document sources (Read Materials)">
            <p>
              The Read Materials agent uses a four-tier source hierarchy when analysing your project documents:
            </p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li><Strong>Primary</Strong> — the actual uploaded file (PDF or image), sent directly to the model</li>
              <li><Strong>Secondary</Strong> — OCR-extracted text from the file</li>
              <li><Strong>Tertiary</Strong> — online lookups from official sources (Microsoft Learn) when available</li>
              <li><Strong>Fourth</Strong> — model training knowledge, used only as a last resort</li>
            </ol>
            <p className="mt-2">
              All document types are reviewed: Source Material, Supporting, Draft, and Final documents.
            </p>
          </SubSection>

          <SubSection title="Clarification dialogue">
            <p>
              If an agent (Read Materials or Draft) finds that the source materials are insufficient
              to proceed, it will pause and list its open questions. You can then type your answers
              directly in the agent panel and submit them. The agent evaluates each answer for
              completeness — if any answer is vague or missing, it will ask again. Only once all
              questions are resolved does the run continue to completion.
            </p>
            <p className="mt-2">
              The full conversation history (agent questions and your replies) is saved and visible
              in the run detail view.
            </p>
          </SubSection>

          <SubSection title="Audit log">
            <p>
              For multi-step workflows (Draft loop, CDR loop), a workflow audit log is recorded at
              each decision point: iteration number, phase, verdict (PASS / FAIL / WARN), and details.
              The full log is visible on the agent run detail page under <Strong>Workflow Audit Log</Strong>.
            </p>
          </SubSection>

          <SubSection title="All agents">
            <ul className="mt-1 space-y-2 text-sm text-gray-600">
              <AgentRow name="read-materials" description="Reads all uploaded documents using a four-tier source hierarchy and produces a MECE brief with KT Situation Appraisal. Pauses to ask clarifying questions if the materials are incomplete." />
              <AgentRow name="draft" description="Writes the concept document. Automatically loops with fact-check feedback until the draft passes or the iteration limit is reached. Supports revision mode when an existing draft is present." />
              <AgentRow name="fact-check" description="Cross-references every claim in the draft against source materials and flags unsupported statements with a PASS/FAIL verdict." />
              <AgentRow name="humanize" description="Rewrites AI-sounding passages — removes hollow openers, transition filler, and passive voice — to match Dataciders' confident, direct style." />
              <AgentRow name="corporate-design-review" description="Audits structure, wording, and brand compliance. Classifies findings by severity (Critical / High / Medium). Triggers a full revision cycle on failure, up to 3 iterations." />
              <AgentRow name="translate" description="Translates the finished concept between German and English." />
              <AgentRow name="executive-summary" description="Produces a standalone 300–400 word executive summary using the SCR (Situation–Complication–Resolution) framework." />
              <AgentRow name="qa-checklist" description="Runs a final pre-delivery checklist covering completeness, consistency, SCR structure, and Minto Pyramid alignment." />
            </ul>
          </SubSection>
        </Section>

      </div>
    </div>
  );
}

function TocItem({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a href={href} className="text-[#1c1e3b] hover:text-[#b3cc26] transition-colors">
        {label}
      </a>
    </li>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold text-[#1c1e3b] mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pl-3 border-l-2 border-[#b3cc26]">
      <h3 className="text-sm font-semibold text-[#1c1e3b] mb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-[#1c1e3b]">{children}</span>;
}

function StatusBadge({ label, color, description }: { label: string; color: string; description: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
      <span className="text-gray-500">{description}</span>
    </li>
  );
}

function AgentRow({ name, description }: { name: string; description: string }) {
  return (
    <li className="flex gap-3">
      <code className="bg-gray-100 text-[#1c1e3b] px-2 py-0.5 rounded text-xs font-mono shrink-0 h-fit mt-0.5">{name}</code>
      <span>{description}</span>
    </li>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1c1e3b] mb-1">Help</h1>
      <p className="text-gray-500 text-sm mb-8">How to use the Conceptualizer portal.</p>

      <div className="space-y-8">

        <Section title="Overview">
          <p>
            Conceptualizer is a portal for creating and managing consulting concepts at Dataciders.
            The typical workflow is:
          </p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Import a customer from HubSpot</li>
            <li>Create a project for that customer</li>
            <li>Upload source materials (PDFs, DOCX, text files)</li>
            <li>Run AI agents to draft, review, and refine the concept</li>
            <li>Export or deliver the finished document</li>
          </ol>
        </Section>

        <Section title="Customers">
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

        <Section title="Projects">
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

        <Section title="Documents">
          <SubSection title="Uploading">
            <p>
              On the project detail page, click <Strong>Upload</Strong> in the Documents section.
              Supported formats: <code className="bg-gray-100 px-1 rounded text-xs">PDF</code>,{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">DOCX</code>,{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">TXT</code>.
            </p>
            <p className="mt-2">Assign a document type when uploading:</p>
            <ul className="mt-1 space-y-1 text-sm text-gray-600">
              <li><Strong>Source Material</Strong> — reference documents, research, client input</li>
              <li><Strong>Draft</Strong> — intermediate concept versions</li>
              <li><Strong>Final</Strong> — the finished, deliverable concept</li>
              <li><Strong>Supporting</Strong> — appendices, data exports, supplementary files</li>
            </ul>
          </SubSection>
        </Section>

        <Section title="AI Agents">
          <p className="text-gray-500 text-sm italic">
            Agent functionality is coming in the next release. The following agents will be available:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <AgentRow name="read-materials" description="Summarises uploaded source documents into structured key facts, client needs, and open questions." />
            <AgentRow name="draft" description="Writes the initial concept document based on the materials summary." />
            <AgentRow name="fact-check" description="Cross-references claims in the draft against source materials and flags unsupported statements." />
            <AgentRow name="humanize" description="Rewrites AI-sounding passages to match Dataciders' confident, direct tone." />
            <AgentRow name="corporate-design-review" description="Checks wording and structure against Dataciders brand guidelines." />
            <AgentRow name="translate" description="Translates a completed concept between German and English professionally." />
            <AgentRow name="executive-summary" description="Generates a standalone 1-page executive summary from the full concept." />
            <AgentRow name="qa-checklist" description="Runs a final pre-delivery checklist for completeness, consistency, and formatting." />
          </ul>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-[#1c1e3b] mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium text-[#1c1e3b] mb-1">{title}</h3>
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

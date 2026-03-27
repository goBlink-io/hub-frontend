'use client';

import { useState } from 'react';
import {
  BookOpen,
  Key,
  Server,
  Code2,
  Shield,
  Clock,
  ChevronDown,
  ChevronRight,
  Zap,
  CreditCard,
} from 'lucide-react';

/* ─── Types ─── */

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const SECTIONS: DocSection[] = [
  { id: 'overview', title: 'Overview', icon: <BookOpen size={14} /> },
  { id: 'auth', title: 'Authentication', icon: <Key size={14} /> },
  { id: 'endpoints', title: 'Endpoints', icon: <Server size={14} /> },
  { id: 'schema', title: 'Response Schema', icon: <Code2 size={14} /> },
  { id: 'limits', title: 'Rate Limits', icon: <Clock size={14} /> },
  { id: 'pricing', title: 'Pricing', icon: <CreditCard size={14} /> },
  { id: 'examples', title: 'Code Examples', icon: <Zap size={14} /> },
];

/* ─── Page ─── */

export default function DocsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <BookOpen size={24} style={{ color: 'var(--color-primary)' }} />
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            API Documentation
          </h1>
        </div>
        <p
          className="text-sm max-w-lg mx-auto"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Integrate goBlink Audit into your CI/CD pipeline with our REST API.
        </p>
      </div>

      {/* Quick nav */}
      <div
        className="flex items-center gap-2 flex-wrap justify-center"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              textDecoration: 'none',
            }}
          >
            {s.icon}
            {s.title}
          </a>
        ))}
      </div>

      {/* Sections */}
      <OverviewSection />
      <AuthSection />
      <EndpointsSection />
      <SchemaSection />
      <RateLimitsSection />
      <PricingSection />
      <ExamplesSection />
    </div>
  );
}

/* ─── Section Wrapper ─── */

function Section({ id, title, icon, children }: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div
        className="p-5 sm:p-6 space-y-4"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ─── Code Block ─── */

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div
      className="overflow-x-auto text-xs font-mono"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {language}
      </div>
      <pre style={{ color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {code}
      </pre>
    </div>
  );
}

/* ─── Collapsible ─── */

function Collapsible({ title, defaultOpen, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full p-3 text-left text-sm font-semibold transition-colors"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-primary)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && (
        <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Endpoint Card ─── */

function EndpointCard({ method, path, description, children }: {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  children?: React.ReactNode;
}) {
  const methodColor = method === 'POST' ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <Collapsible title={`${method} ${path}`}>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {description}
      </p>
      {children}
    </Collapsible>
  );
}

/* ─── Sections ─── */

function OverviewSection() {
  return (
    <Section id="overview" title="Overview" icon={<BookOpen size={18} />}>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        The goBlink Audit API provides programmatic access to our smart contract security analysis engine.
        Submit Solidity, Move, or Rust contracts and receive comprehensive security reports with formal
        verification results, vulnerability pattern matching, and AI-generated specs.
      </p>
      <div
        className="p-3 text-sm"
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.06)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <strong style={{ color: 'var(--color-primary)' }}>Base URL:</strong>{' '}
        <code style={{ color: 'var(--color-text-primary)' }}>https://api.goblink.io</code>
      </div>
    </Section>
  );
}

function AuthSection() {
  return (
    <Section id="auth" title="Authentication" icon={<Key size={18} />}>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Include your API key in the <code style={{ color: 'var(--color-primary)' }}>X-API-Key</code> header
        with every request. API keys are available from your dashboard after purchasing an audit tier.
      </p>
      <CodeBlock
        language="bash"
        code={`curl -H "X-API-Key: your-api-key" https://api.goblink.io/api/health`}
      />
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        API key authentication is coming soon. Currently, the API is rate-limited by IP address.
      </p>
    </Section>
  );
}

function EndpointsSection() {
  return (
    <Section id="endpoints" title="Endpoints" icon={<Server size={18} />}>
      <div className="space-y-3">
        <EndpointCard method="POST" path="/api/audit" description="Upload contract files for security audit.">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>REQUEST</p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Content-Type: <code>multipart/form-data</code>
              </p>
              <ul className="mt-2 space-y-1">
                <ParamRow name="files" type="File[]" required description="Contract files (.sol, .move, .rs, .zip)" />
                <ParamRow name="chain" type="string" description="Chain hint: auto, evm, sui, aptos, solana, near" />
                <ParamRow name="notifyEmail" type="string" description="Email for completion notification (deep tier)" />
                <ParamRow name="webhookUrl" type="string" description="URL to POST results to on completion" />
              </ul>
            </div>
            <CodeBlock
              language="curl"
              code={`curl -X POST https://api.goblink.io/api/audit \\
  -H "X-API-Key: your-api-key" \\
  -F "files=@MyContract.sol" \\
  -F "chain=evm"`}
            />
          </div>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/audit/github" description="Audit a contract from a GitHub repository URL.">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>REQUEST BODY (JSON)</p>
              <ul className="space-y-1">
                <ParamRow name="url" type="string" required description="GitHub repo URL (https://github.com/user/repo)" />
                <ParamRow name="branch" type="string" description="Branch to clone (default: default branch)" />
                <ParamRow name="path" type="string" description="Subdirectory path within repo to audit" />
              </ul>
            </div>
            <CodeBlock
              language="curl"
              code={`curl -X POST https://api.goblink.io/api/audit/github \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{"url": "https://github.com/OpenZeppelin/openzeppelin-contracts", "path": "contracts/token/ERC20"}'`}
            />
          </div>
        </EndpointCard>

        <EndpointCard method="GET" path="/api/patterns" description="List all vulnerability patterns in the database.">
          <CodeBlock
            language="curl"
            code={`curl https://api.goblink.io/api/patterns`}
          />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/exploits" description="List all tracked exploits with loss amounts and details.">
          <CodeBlock
            language="curl"
            code={`curl https://api.goblink.io/api/exploits`}
          />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/stats" description="Platform statistics: pattern count, exploit count, total losses.">
          <CodeBlock
            language="curl"
            code={`curl https://api.goblink.io/api/stats`}
          />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/health" description="Health check — returns server status and uptime.">
          <CodeBlock
            language="curl"
            code={`curl https://api.goblink.io/api/health`}
          />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/demo" description="Pre-computed demo audit result (no rate limit).">
          <CodeBlock
            language="curl"
            code={`curl https://api.goblink.io/api/demo`}
          />
        </EndpointCard>
      </div>
    </Section>
  );
}

function ParamRow({ name, type, required, description }: {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <code
        className="font-semibold whitespace-nowrap"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {name}
      </code>
      <span style={{ color: 'var(--color-text-muted)' }}>{type}</span>
      {required && (
        <span
          className="text-[11px] font-bold uppercase px-1 py-0.5"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-danger)',
            borderRadius: '3px',
          }}
        >
          required
        </span>
      )}
      <span style={{ color: 'var(--color-text-secondary)' }}>— {description}</span>
    </li>
  );
}

function SchemaSection() {
  const schema = `interface AuditResponse {
  success: boolean;
  chain: string;          // "evm" | "sui" | "aptos" | "solana" | "near"
  language: string;       // "solidity" | "move" | "rust"
  summary: {
    modules: number;
    functions: number;
    specsInferred: number;
    verified: number;     // Formally verified specs
    violated: number;     // Specs with counterexamples
    unknown: number;      // Could not determine
  };
  modules: Array<{
    name: string;
    functions: Array<{
      name: string;
      params: string[];
      spec: {
        requires: string[];  // Pre-conditions
        ensures: string[];   // Post-conditions
      };
      status: "verified" | "violated" | "unknown" | "no-spec";
    }>;
    stateVars: string[];
  }>;
  crossModuleWarnings: string[];
  securityScore?: {
    overall: number;      // 0-100
    grade: "A" | "B" | "C" | "D" | "F";
    breakdown: {
      verification: number;
      testCoverage: number;
      patternSafety: number;
      scamRisk: number;
    };
  };
  testReport?: {
    contractName: string;
    totalTests: number;
    passed: number;
    failed: number;
    results: Array<{
      name: string;
      passed: boolean;
      gasUsed?: number;
      category: string;
      severity: string;
    }>;
  };
}`;

  return (
    <Section id="schema" title="Response Schema" icon={<Code2 size={18} />}>
      <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        All audit endpoints return the same <code style={{ color: 'var(--color-primary)' }}>AuditResponse</code> structure:
      </p>
      <CodeBlock language="typescript" code={schema} />
    </Section>
  );
}

function RateLimitsSection() {
  return (
    <Section id="limits" title="Rate Limits" icon={<Clock size={18} />}>
      <div className="space-y-3">
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <RateLimitCard label="Audit Requests" value="5 / hour" detail="Per IP address" />
          <RateLimitCard label="Concurrent Audits" value="2" detail="Simultaneous" />
          <RateLimitCard label="Max File Size" value="10 MB" detail="Per file" />
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Rate limit headers are included in responses: <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code>, <code>RateLimit-Reset</code>.
          If you hit the limit, you&apos;ll receive a 429 response with a <code>Retry-After</code> header.
        </p>
      </div>
    </Section>
  );
}

function RateLimitCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div
      className="p-3 text-center"
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      <div className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{detail}</div>
    </div>
  );
}

function PricingSection() {
  return (
    <Section id="pricing" title="Pricing" icon={<CreditCard size={18} />}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TierCard name="Quick Scan" price="$99" features={['105 patterns', 'Summary report', 'Instant results']} />
        <TierCard name="Full Audit" price="$249" features={['Formal verification', 'IR analysis', 'Exploit mapping']} highlight />
        <TierCard name="Deep Audit" price="$499" features={['AI spec generation', 'Cross-module analysis', 'Priority processing']} />
      </div>
      <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Visit <a href="/audit" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>hub.goblink.io/audit</a> to purchase.
      </p>
    </Section>
  );
}

function TierCard({ name, price, features, highlight }: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className="p-4"
      style={{
        backgroundColor: highlight ? 'rgba(59, 130, 246, 0.06)' : 'var(--color-bg-tertiary)',
        border: `1px solid ${highlight ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {name}
      </div>
      <div className="text-xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{price}</div>
      <ul className="mt-2 space-y-1">
        {features.map((f) => (
          <li key={f} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span style={{ color: 'var(--color-success)' }}>✓</span> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExamplesSection() {
  const jsExample = `const formData = new FormData();
formData.append('files', fs.createReadStream('MyContract.sol'));
formData.append('chain', 'evm');

const response = await fetch('https://api.goblink.io/api/audit', {
  method: 'POST',
  headers: { 'X-API-Key': process.env.GOBLINK_API_KEY },
  body: formData,
});

const result = await response.json();
console.log(\`Score: \${result.securityScore?.overall}/100 (\${result.securityScore?.grade})\`);
console.log(\`Verified: \${result.summary.verified}, Violated: \${result.summary.violated}\`);`;

  const pythonExample = `import requests

files = {'files': open('MyContract.sol', 'rb')}
data = {'chain': 'evm'}
headers = {'X-API-Key': 'your-api-key'}

response = requests.post(
    'https://api.goblink.io/api/audit',
    files=files,
    data=data,
    headers=headers,
)

result = response.json()
score = result.get('securityScore', {})
print(f"Score: {score.get('overall')}/100 ({score.get('grade')})")
print(f"Verified: {result['summary']['verified']}, Violated: {result['summary']['violated']}")`;

  const githubExample = `# Audit a GitHub repo
curl -X POST https://api.goblink.io/api/audit/github \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{
    "url": "https://github.com/OpenZeppelin/openzeppelin-contracts",
    "path": "contracts/token/ERC20"
  }'`;

  return (
    <Section id="examples" title="Code Examples" icon={<Zap size={18} />}>
      <div className="space-y-4">
        <Collapsible title="JavaScript / Node.js" defaultOpen>
          <CodeBlock language="javascript" code={jsExample} />
        </Collapsible>
        <Collapsible title="Python">
          <CodeBlock language="python" code={pythonExample} />
        </Collapsible>
        <Collapsible title="curl — GitHub URL">
          <CodeBlock language="bash" code={githubExample} />
        </Collapsible>
      </div>
    </Section>
  );
}

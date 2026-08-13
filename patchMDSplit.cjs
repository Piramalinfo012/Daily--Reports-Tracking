const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'MDReport.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Import reportsCache
content = content.replace(
  'import { mdReportsCache, useSheetCache } from "../lib/dataCache";',
  'import { mdReportsCache, reportsCache, useSheetCache } from "../lib/dataCache";'
);

// Add EmployeeReportsView component at the end of the file
const employeeViewStr = `
function EmployeeReportsView({ onBack }: { onBack: () => void }) {
  const { data: allReports, error } = useSheetCache(reportsCache);
  const loading = allReports === null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={onBack} className="!px-3 text-xs">
          ← Back
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-mist-100">Employee Reports</h2>
          <p className="mt-1 text-sm text-mist-500">End-of-day reports submitted by all employees</p>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12 text-mist-500"><Spinner size={24} /></div>
        ) : error ? (
          <div className="p-4 text-rose-400 text-sm">{error}</div>
        ) : allReports.length === 0 ? (
          <EmptyState icon={<ClipboardList size={28} />} title="No reports found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-700/60 text-xs opacity-50 font-semibold uppercase tracking-wide">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Employee ID</th>
                  <th className="py-2 pr-2">Tasks</th>
                  <th className="py-2 pr-2 max-w-sm">Summary</th>
                  <th className="py-2 pr-2">Attachment</th>
                </tr>
              </thead>
              <tbody>
                {[...allReports].reverse().map(r => (
                  <tr key={r._id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-800/30">
                    <td className="py-3 pr-2 text-xs opacity-80 whitespace-nowrap">{formatDisplayDate(r.date)}</td>
                    <td className="py-3 pr-2 font-medium text-teal-400">{r.userId}</td>
                    <td className="py-3 pr-2">
                      <Badge tone="slate">{r.tasksCompleted}/{r.tasksPlanned}</Badge>
                    </td>
                    <td className="py-3 pr-2 opacity-80 text-xs max-w-sm truncate" title={r.summary}>{r.summary}</td>
                    <td className="py-3 pr-2 text-xs">
                      {r.fileUrl ? (
                        <a href={r.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:underline">
                          <Paperclip size={12} /> View
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
`;

if (!content.includes('function EmployeeReportsView')) {
  content += '\n' + employeeViewStr;
}

// Add state to MDReport
content = content.replace(
  'export default function MDReport() {',
  'export default function MDReport() {\n  const [viewMode, setViewMode] = useState<"selection" | "ea" | "employee">("selection");'
);

// Add viewMode logic to the return
const selectionUI = `
  if (viewMode === "selection") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95">
        <h2 className="mb-8 text-2xl font-semibold text-mist-100">Select Report Type</h2>
        <div className="flex flex-col sm:flex-row gap-6 max-w-2xl w-full px-4">
          <Card 
            glow="teal" 
            className="flex-1 cursor-pointer hover:scale-105 transition-transform flex flex-col items-center justify-center py-12 gap-4 border-teal-500/30 bg-teal-500/5"
            onClick={() => setViewMode("ea")}
          >
            <ShieldCheck size={48} className="text-teal-400 drop-shadow-md" />
            <h3 className="text-lg font-bold text-teal-100 tracking-wider">EA REPORT</h3>
            <p className="text-xs text-mist-400 text-center px-4">Executive Assistant Daily Work Log (Password Protected)</p>
          </Card>
          <Card 
            glow="blue" 
            className="flex-1 cursor-pointer hover:scale-105 transition-transform flex flex-col items-center justify-center py-12 gap-4 border-blue-500/30 bg-blue-500/5"
            onClick={() => setViewMode("employee")}
          >
            <ClipboardList size={48} className="text-blue-400 drop-shadow-md" />
            <h3 className="text-lg font-bold text-blue-100 tracking-wider">EMPLOYEE REPORT</h3>
            <p className="text-xs text-mist-400 text-center px-4">View End-of-Day Reports submitted by all employees</p>
          </Card>
        </div>
      </div>
    );
  }

  if (viewMode === "employee") {
    return <EmployeeReportsView onBack={() => setViewMode("selection")} />;
  }
`;

content = content.replace(
  'if (!unlocked) {',
  selectionUI + '\n  if (!unlocked) {'
);

// Add Back button to Password screen
content = content.replace(
  '<div className="mt-8 w-full max-w-sm">',
  '<div className="w-full max-w-sm mb-4"><Button variant="ghost" className="!px-2 text-xs" onClick={() => setViewMode("selection")}>← Back to Menu</Button></div>\n        <div className="w-full max-w-sm">'
);

fs.writeFileSync(filePath, content);
console.log('MDReport updated for split EA/Employee view');

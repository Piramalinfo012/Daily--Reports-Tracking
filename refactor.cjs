const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'MDReport.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. State changes
content = content.replace(
  'const [selectedDate, setSelectedDate] = useState(today);',
  'const [startDate, setStartDate] = useState(today);\n  const [endDate, setEndDate] = useState(today);'
);
content = content.replace('  const [reportStartDate, setReportStartDate] = useState(today);\n', '');
content = content.replace('  const [reportEndDate, setReportEndDate] = useState(today);\n', '');

// 2. Logic changes
const oldLogic = `  const entriesForSelectedDate = useMemo(
    () =>
      (mdReports ?? []).filter((r) => {
        if (dateOf(r.timestamp) === selectedDate) return true;
        if (r.category === "Completed" && r.completedDate && dateOf(r.completedDate) === selectedDate) return true;
        return false;
      }),
    [mdReports, selectedDate],
  );

  const daysLogged = useMemo(() => new Set((mdReports ?? []).map((r) => dateOf(r.timestamp))).size, [mdReports]);

  const entriesInReportRange = useMemo(
    () =>
      (mdReports ?? []).filter((r) => {
        const d = dateOf(r.timestamp);
        return d >= reportStartDate && d <= reportEndDate;
      }),
    [mdReports, reportStartDate, reportEndDate],
  );`;

const newLogic = `  const entriesForSelectedDate = useMemo(
    () =>
      (mdReports ?? []).filter((r) => {
        const d = dateOf(r.timestamp);
        if (d >= startDate && d <= endDate) return true;
        if (r.category === "Completed" && r.completedDate) {
          const cd = dateOf(r.completedDate);
          if (cd >= startDate && cd <= endDate) return true;
        }
        return false;
      }),
    [mdReports, startDate, endDate],
  );

  const daysLogged = useMemo(() => new Set((mdReports ?? []).map((r) => dateOf(r.timestamp))).size, [mdReports]);`;

content = content.replace(oldLogic, newLogic);

// 3. New task timestamp
content = content.replace(
  'timestamp: `${selectedDate}T12:00:00.000Z`,',
  'timestamp: `${endDate}T12:00:00.000Z`,'
);

// 4. Download handlers
content = content.replace(/entriesInReportRange/g, 'entriesForSelectedDate');
content = content.replace(/reportStartDate/g, 'startDate');
content = content.replace(/reportEndDate/g, 'endDate');

// 5. Update UI for the View Card (Amber)
const oldCard = `<Card glow="amber">
          <div className="flex items-center gap-2 text-mist-400">
            <span className="text-amber-400">
              <ClipboardList size={18} />
            </span>
            <p className="text-xs font-medium">Entries on {formatDisplayDate(selectedDate)}</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-mist-100">{entriesForSelectedDate.length}</p>
          <div className="mt-3">
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={\`\${selectClass} w-full\`}>
              {distinctLogDates.map((d) => (
                <option key={d} value={d}>
                  {formatDisplayDate(d)}
                </option>
              ))}
            </select>
          </div>
        </Card>`;

const newCard = `<Card glow="amber">
          <div className="flex items-center gap-2 text-mist-400">
            <span className="text-amber-400">
              <ClipboardList size={18} />
            </span>
            <p className="text-xs font-medium">Entries in Range</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-mist-100">{entriesForSelectedDate.length}</p>
          <div className="mt-3 flex items-center gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="py-2 px-2 text-[13px] w-full" />
            <span className="text-mist-500 text-xs font-medium">to</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="py-2 px-2 text-[13px] w-full" />
          </div>
        </Card>`;

content = content.replace(oldCard, newCard);

// 6. Update Export Card
const oldExport = `<Card className="border-t-2 border-t-amber-500/80 mt-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Download size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-mist-100">Export Reports</h3>
              <p className="text-xs text-mist-500">Download your data in Excel or PDF format.</p>
            </div>
          </div>
          <Badge tone="amber">{entriesForSelectedDate.length} entries</Badge>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-ink-900/50 p-4 rounded-xl border border-white/5">
          <div className="flex flex-1 items-center gap-3 w-full">
            <div className="flex-1">
              <Label className="text-[10px] uppercase tracking-wider mb-1">Date From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="py-2 text-sm" />
            </div>
            <div className="mt-5 text-mist-600 font-medium">to</div>
            <div className="flex-1">
              <Label className="text-[10px] uppercase tracking-wider mb-1">Date To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="py-2 text-sm" />
            </div>
          </div>
          
          <div className="h-10 w-px bg-white/10 hidden lg:block mx-4"></div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0 lg:pt-5">
            <Button variant="primary" icon={<FileSpreadsheet size={16} />} onClick={handleDownloadExcel} className="flex-1 lg:flex-none !bg-gradient-to-br !from-emerald-400 !to-emerald-600 !shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)]">
              Excel
            </Button>
            <Button variant="danger" icon={<FileText size={16} />} onClick={handleDownloadPdf} className="flex-1 lg:flex-none !shadow-[0_8px_24px_-8px_rgba(244,63,94,0.5)]">
              PDF
            </Button>
          </div>
        </div>
      </Card>`;

const newExport = `<Card className="border-t-2 border-t-amber-500/80 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Download size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-mist-100">Export Reports</h3>
              <p className="text-xs text-mist-500">Download {entriesForSelectedDate.length} entries for the selected date range.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="primary" icon={<FileSpreadsheet size={16} />} onClick={handleDownloadExcel} className="flex-1 sm:flex-none !bg-gradient-to-br !from-emerald-400 !to-emerald-600 !shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)]">
              Excel
            </Button>
            <Button variant="danger" icon={<FileText size={16} />} onClick={handleDownloadPdf} className="flex-1 sm:flex-none !shadow-[0_8px_24px_-8px_rgba(244,63,94,0.5)]">
              PDF
            </Button>
          </div>
        </div>
      </Card>`;

content = content.replace(oldExport, newExport);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Success');

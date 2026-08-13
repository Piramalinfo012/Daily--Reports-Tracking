const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'MDReport.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Inject handleAddNewPerson inside MDReport component
const stateInjectionPoint = '  const [personNamesError, setPersonNamesError] = useState<string | null>(null);';
const handleAddNewPersonBlock = `  const [personNamesError, setPersonNamesError] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);

  const handleAddNewPerson = async (name: string, setter: (v: string) => void) => {
    try {
      setAddingPerson(true);
      await masterRepo.addPersonName(name.trim());
      setPersonNames((prev) => {
        const arr = prev ? [...prev, name.trim()] : [name.trim()];
        return [...new Set(arr)].sort();
      });
      setter(name.trim());
      toast.success("New person added to Master table");
    } catch (err: any) {
      toast.error(err.message || "Failed to add new person");
    } finally {
      setAddingPerson(false);
    }
  };`;

content = content.replace(stateInjectionPoint, handleAddNewPersonBlock);

// 2. Remove the old filteredPersonNames and showPersonDropdown logic
content = content.replace('  const [showPersonDropdown, setShowPersonDropdown] = useState(false);\n', '');

const oldFilteredPersonsLogic = `  const filteredPersonNames = useMemo(() => {
    if (!personNames) return [];
    if (!workingPerson) return personNames;
    const search = workingPerson.toLowerCase().trim();
    return personNames.filter((n) => n.toLowerCase().includes(search));
  }, [personNames, workingPerson]);`;
content = content.replace(oldFilteredPersonsLogic + '\n\n', '');

// 3. Replace the Add Task dropdown with PersonDropdown
const oldAddTaskDropdown = `<div className="relative">
              <Label htmlFor="mdw-person">Working person</Label>
              <Input
                id="mdw-person"
                value={workingPerson}
                onChange={(e) => {
                  setWorkingPerson(e.target.value);
                  setShowPersonDropdown(true);
                }}
                onFocus={() => setShowPersonDropdown(true)}
                onClick={() => setShowPersonDropdown(true)}
                onBlur={() => setTimeout(() => setShowPersonDropdown(false), 200)}
                placeholder="Search or select…"
                autoComplete="off"
              />
              {showPersonDropdown && (
                <ul className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-ink-600 bg-ink-900 shadow-lg">
                  {personNames === null ? (
                    <li className="px-3.5 py-2.5 text-sm text-mist-500 italic">Loading names...</li>
                  ) : filteredPersonNames.length === 0 ? (
                    <li className="px-3.5 py-2.5 text-sm text-mist-500">No matches found</li>
                  ) : (
                    filteredPersonNames.map((name) => (
                      <li
                        key={name}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setWorkingPerson(name);
                          setShowPersonDropdown(false);
                        }}
                        className={\`cursor-pointer px-3.5 py-2.5 text-sm transition-colors \${
                          workingPerson === name
                            ? "bg-teal-500/30 text-teal-300 font-medium"
                            : "text-mist-200 hover:bg-ink-800"
                        }\`}
                      >
                        {name}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>`;

const newAddTaskDropdown = `<div>
              <Label htmlFor="mdw-person">Working person</Label>
              <PersonDropdown 
                value={workingPerson} 
                onChange={setWorkingPerson} 
                personNames={personNames} 
                handleAdd={(n) => handleAddNewPerson(n, setWorkingPerson)} 
                adding={addingPerson}
              />
            </div>`;

content = content.replace(oldAddTaskDropdown, newAddTaskDropdown);

// 4. Replace the Edit Task input with PersonDropdown
const oldEditInput = `<div className="relative">
              <Label htmlFor="edit-person">Working person</Label>
              <Input
                id="edit-person"
                value={editWorkPerson}
                onChange={(e) => setEditWorkPerson(e.target.value)}
                placeholder="Select person…"
              />
            </div>`;

const newEditInput = `<div>
              <Label htmlFor="edit-person">Working person</Label>
              <PersonDropdown 
                value={editWorkPerson} 
                onChange={setEditWorkPerson} 
                personNames={personNames} 
                handleAdd={(n) => handleAddNewPerson(n, setEditWorkPerson)} 
                adding={addingPerson}
              />
            </div>`;

content = content.replace(oldEditInput, newEditInput);

// 5. Append PersonDropdown component at the bottom of the file
const personDropdownComponent = `

function PersonDropdown({ 
  value, 
  onChange, 
  placeholder = "Search or select…", 
  personNames, 
  handleAdd,
  adding
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string; 
  personNames: string[] | null; 
  handleAdd: (name: string) => void;
  adding: boolean;
}) {
  const [show, setShow] = useState(false);
  
  const filtered = useMemo(() => {
    if (!personNames) return [];
    if (!value) return personNames;
    const s = value.toLowerCase().trim();
    return personNames.filter((n) => n.toLowerCase().includes(s));
  }, [personNames, value]);

  const exactMatch = personNames?.some(n => n.toLowerCase() === value.toLowerCase().trim());

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onClick={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={adding}
      />
      {show && (
        <ul className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-ink-600 bg-ink-900 shadow-lg">
          {personNames === null ? (
            <li className="px-3.5 py-2.5 text-sm text-mist-500 italic">Loading names...</li>
          ) : (
            <>
              {filtered.map((name) => (
                <li
                  key={name}
                  onMouseDown={(e) => { e.preventDefault(); onChange(name); setShow(false); }}
                  className={\`cursor-pointer px-3.5 py-2.5 text-sm transition-colors \${
                    value === name ? "bg-teal-500/30 text-teal-300 font-medium" : "text-mist-200 hover:bg-ink-800"
                  }\`}
                >
                  {name}
                </li>
              ))}
              {value.trim() !== "" && !exactMatch && (
                <li
                  onMouseDown={(e) => { e.preventDefault(); handleAdd(value); setShow(false); }}
                  className="cursor-pointer px-3.5 py-2.5 text-sm text-teal-300 hover:bg-teal-500/20 border-t border-white/5 flex items-center gap-2 font-medium"
                >
                  <Plus size={14} /> Add "{value}"
                </li>
              )}
              {filtered.length === 0 && (value.trim() === "" || exactMatch) && (
                <li className="px-3.5 py-2.5 text-sm text-mist-500">No matches found</li>
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
`;

content = content + personDropdownComponent;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Success');

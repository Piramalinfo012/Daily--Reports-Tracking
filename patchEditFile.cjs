const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'MDReport.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variables
const stateTarget = `  const [editRemarks, setEditRemarks] = useState("");`;
const stateReplacement = `  const [editRemarks, setEditRemarks] = useState("");
  const [editAttachmentUrl, setEditAttachmentUrl] = useState("");
  const [uploadingEditFile, setUploadingEditFile] = useState(false);`;
content = content.replace(stateTarget, stateReplacement);

// 2. Add handleEditFileUpload
const uploadHandlerTarget = `  const handleUpdateFileUpload = makeFileUploadHandler(setUpdateFileUrl, setUploadingFile);`;
const uploadHandlerReplacement = `  const handleUpdateFileUpload = makeFileUploadHandler(setUpdateFileUrl, setUploadingFile);
  const handleEditFileUpload = makeFileUploadHandler(setEditAttachmentUrl, setUploadingEditFile);`;
content = content.replace(uploadHandlerTarget, uploadHandlerReplacement);

// 3. Update handleEditEntry
const handleEditTarget = `    setEditRemarks(entry.remarks);
  }`;
const handleEditReplacement = `    setEditRemarks(entry.remarks);
    setEditAttachmentUrl(entry.attachmentUrl || "");
  }`;
content = content.replace(handleEditTarget, handleEditReplacement);

// 4. Update handleSubmitEdit (cache mutate)
const cacheTarget = `? { ...x, workDescription: editTaskDesc, workingPerson: editWorkPerson, category: editCategory, remarks: editRemarks, completedDate: newCompletedDate }`;
const cacheReplacement = `? { ...x, workDescription: editTaskDesc, workingPerson: editWorkPerson, category: editCategory, remarks: editRemarks, attachmentUrl: editAttachmentUrl, completedDate: newCompletedDate }`;
content = content.replace(cacheTarget, cacheReplacement);

// 5. Update handleSubmitEdit (repo update)
const repoTarget = `        remarks: editRemarks,
        ...(isCompletingNow && { completedDate: newCompletedDate }),`;
const repoReplacement = `        remarks: editRemarks,
        attachmentUrl: editAttachmentUrl,
        ...(isCompletingNow && { completedDate: newCompletedDate }),`;
content = content.replace(repoTarget, repoReplacement);

// 6. Inject UI in edit form
const uiTarget = `            <div>
              <Label htmlFor="edit-remarks">Remarks</Label>
              <Input
                id="edit-remarks"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button type="submit" className="self-start">`;
const uiReplacement = `            <div>
              <Label htmlFor="edit-remarks">Remarks</Label>
              <Input
                id="edit-remarks"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Attachment (Optional)</Label>
              <div className="flex items-center gap-3 bg-ink-900/50 p-2 rounded-xl border border-white/5">
                <input
                  type="file"
                  id="edit-file"
                  className="hidden"
                  onChange={handleEditFileUpload}
                />
                <Button variant="primary" type="button" onClick={() => document.getElementById("edit-file")?.click()}>
                  Choose File
                </Button>
                <span className="text-xs text-mist-400 truncate max-w-[150px]">
                  {editAttachmentUrl ? "File attached" : "No file chosen"}
                </span>
              </div>
              {uploadingEditFile && <p className="text-xs text-amber-400 mt-1">Uploading...</p>}
              {editAttachmentUrl && !uploadingEditFile && (
                <div className="flex items-center gap-1.5 text-xs text-teal-400 bg-teal-500/10 p-2 rounded mt-2">
                  <Paperclip size={12} /> File attached:{" "}
                  <a href={editAttachmentUrl} target="_blank" rel="noreferrer" className="underline hover:text-teal-300">
                    View file
                  </a>
                  <button type="button" onClick={() => setEditAttachmentUrl("")} className="ml-auto text-rose-400 hover:text-rose-300">Remove</button>
                </div>
              )}
            </div>
            <Button type="submit" className="self-start">`;
content = content.replace(uiTarget, uiReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Success');

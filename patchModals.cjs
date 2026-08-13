const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'MDReport.tsx');
let content = fs.readFileSync(filePath, 'utf8');

function wrapModal(blockName, cardGlow, startStr, closeStr) {
  const wrapperStart = `      {${blockName} && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => set${blockName.charAt(0).toUpperCase() + blockName.slice(1)}(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar"
          >
            <Card glow="${cardGlow}">`;
            
  const wrapperEnd = `            </Button>
          </form>
        </Card>
          </motion.div>
        </div>
      )}`;
      
  const oldStart = `      {${blockName} && (
        <Card glow="${cardGlow}">`;
        
  const oldEnd = `            </Button>
          </form>
        </Card>
      )}`;

  content = content.replace(oldStart, wrapperStart);
  // Only replace the first match after the start, to avoid replacing the wrong end block
  let startIndex = content.indexOf(wrapperStart);
  if (startIndex !== -1) {
    let nextEndIndex = content.indexOf(oldEnd, startIndex);
    if (nextEndIndex !== -1) {
      content = content.slice(0, nextEndIndex) + wrapperEnd + content.slice(nextEndIndex + oldEnd.length);
    }
  }
}

wrapModal('completingEntry', 'amber');
wrapModal('editingEntry', 'teal');
wrapModal('updatingEntry', 'amber');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Success');

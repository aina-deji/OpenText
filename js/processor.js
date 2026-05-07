/**
 * processor.js – OpenText
 * 
 * Responsible for:
 *   - Filtering a FileList from a webkitdirectory input.
 *   - Reading only allowed text files.
 *   - Merging them into a single formatted string.
 * 
 * All logic is pure and testable; it never touches the DOM.
 */

/* ─── Configurable rules (easy to adjust) ─── */
const ALLOWED_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx',           // JavaScript family
    '.html', '.htm',                        // HTML
    '.css', '.scss', '.less',               // Styles
    '.md', '.txt',                          // Documentation / plain text
    '.json', '.yaml', '.yml', '.toml',      // Data / config
    '.py', '.rb', '.go', '.rs', '.java',    // Common languages
    '.c', '.cpp', '.h', '.hpp',
    '.xml', '.svg',                         // Markup / vector
    '.sh', '.bash', '.zsh', '.env',         // Shell / environment
]);

/* Folders / files to completely ignore */
const EXCLUDED_SEGMENTS = [
    'node_modules', '.git', 'DS_Store',
    '__pycache__', '.DS_Store', 'dist', 'build',
    '.next', '.nuxt', 'coverage', '.cache',
];

/* ─── Helper: decide whether a file should be processed ─── */
function isFileAllowed(file) {
    // 1. Get the relative path (works for webkitdirectory drops)
    const path = file.webkitRelativePath || file.name;

    // 2. Check for excluded folders / files in the path
    const parts = path.split('/');
    for (const part of parts) {
        if (EXCLUDED_SEGMENTS.includes(part)) {
            return false; // Exclude entire subtree
        }
    }

    // 3. Ignore hidden files (starting with ".") except important ones
    const fileName = parts[parts.length - 1];
    if (fileName.startsWith('.') && fileName !== '.gitignore' && fileName !== '.env') {
        return false;
    }

    // 4. Check file extension
    const ext = '.' + fileName.split('.').pop().toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext);
}

/* ─── Main export: turns a FileList into a merged string ─── */
/**
 * Process an array of File objects (from <input webkitdirectory>).
 * @param {File[]} files - The raw FileList converted to an array.
 * @returns {Promise<string>} A single formatted string with all file contents.
 */
async function processFolders(files) {
    // 1. Filter out unwanted files
    const validFiles = files.filter(isFileAllowed);

    if (validFiles.length === 0) {
        throw new Error('No valid files found after filtering.');
    }

    // 2. Read all files in parallel using Promise.all & FileReader
    const readPromises = validFiles.map((file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                // File read successfully
                resolve({
                    path: file.webkitRelativePath || file.name,
                    content: event.target.result,
                });
            };

            reader.onerror = () => {
                // If a file can't be read (e.g., permissions), skip it gracefully
                console.warn(`Skipping unreadable file: ${file.webkitRelativePath || file.name}`);
                resolve(null); 
            };

            // Read as text (assumes UTF-8; binary files are already filtered)
            reader.readAsText(file);
        });
    });

    // Wait for all reads to finish
    const results = await Promise.all(readPromises);

    // 3. Build the final string with clear delimiters
    let mergedOutput = '';
    for (const result of results) {
        if (!result) continue; // Skip files that failed to read

        // Header: --- START OF FILE: path ---
        mergedOutput += `--- START OF FILE: ${result.path} ---\n`;
        // Content: ensure it ends with a newline
        mergedOutput += result.content;
        if (!result.content.endsWith('\n')) {
            mergedOutput += '\n';
        }
        // Footer: --- END OF FILE ---
        mergedOutput += `--- END OF FILE ---\n\n`;
    }

    return mergedOutput;
}
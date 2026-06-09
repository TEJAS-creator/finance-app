/**
 * Sleek, client-side PDF text extractor that dynamically lazy loads PDF.js 
 * from CDN to parse and extract text without bloat or local node dependencies.
 */

const PDFJS_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
const PDFJS_WORKER_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfjsLoadingPromise = null;

const loadPdfJs = () => {
  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }

  if (pdfjsLoadingPromise) {
    return pdfjsLoadingPromise;
  }

  pdfjsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_CDN_URL;
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN_URL;
      resolve(window.pdfjsLib);
    };
    script.onerror = (err) => {
      pdfjsLoadingPromise = null;
      reject(new Error('Failed to load PDF processing engine. Please check internet connection.'));
    };
    document.head.appendChild(script);
  });

  return pdfjsLoadingPromise;
};

export const pdfExtractor = {
  /**
   * Reads a file object as ArrayBuffer and extracts text page-by-page.
   * @param {File} file 
   * @returns {Promise<string>}
   */
  async extractText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const pdfjsLib = await loadPdfJs();
          
          // Load document parameters
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          
          let extractedText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Extract text items and combine them line-by-line
            const pageText = textContent.items
              .map(item => item.str)
              .join(' ');
            
            extractedText += `--- Page ${i} ---\n${pageText}\n`;
          }
          
          resolve(extractedText);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file buffer.'));
      };

      reader.readAsArrayBuffer(file);
    });
  }
};

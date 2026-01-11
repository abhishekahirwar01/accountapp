/**
 * Standardized wrapper for PDF generation results
 * Handles conversion of react-native-html-to-pdf results to a consistent interface
 */

export const createPdfWrapper = (pdfFile, templateName = 'Unknown') => {
  console.log(`🟢 PDF Generated Successfully - ${templateName}!`);
  console.log('📊 PDF File Object:', {
    type: typeof pdfFile,
    constructor: pdfFile?.constructor?.name,
    keys: Object.keys(pdfFile || {}),
    hasBase64: typeof pdfFile?.base64,
    base64Length: pdfFile?.base64?.length || 0,
    hasFilePath: !!pdfFile?.filePath,
  });

  // Return a wrapper object with the output method
  const wrapper = {
    ...pdfFile,
    output: (format = 'base64') => {
      console.log(`📋 output() called with format: ${format}`);
      if (format === 'base64') {
        console.log(
          '📤 Returning base64, length:',
          pdfFile.base64?.length || 0,
        );
        return pdfFile.base64;
      }
      if (format === 'filePath') {
        console.log('📤 Returning filePath:', pdfFile.filePath);
        return pdfFile.filePath;
      }
      console.log('📤 Returning base64 (default)');
      return pdfFile.base64;
    },
  };

  console.log('📦 Wrapper object keys:', Object.keys(wrapper));
  return wrapper;
};

export const wrapPdfGeneration = async (
  generationPromise,
  templateName = 'Unknown',
) => {
  try {
    console.log(`🟡 PDF Generation Started - ${templateName}`);
    const file = await generationPromise;
    return createPdfWrapper(file, templateName);
  } catch (error) {
    console.error(`❌ Error generating PDF (${templateName}):`, error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
};

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface ParsedFile {
    text: string;
    type: 'txt' | 'pdf' | 'docx' | 'excel' | 'unknown';
    pageCount?: number;
    metadata?: any;
}

export const parseFile = async (file: File): Promise<ParsedFile> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    switch (fileType) {
        case 'txt':
            return await parseTxt(file);
        case 'pdf':
            return await parsePdf(file);
        case 'docx':
            return await parseDocx(file);
        case 'xlsx':
        case 'xls':
        case 'csv':
            return await parseExcel(file);
        default:
            throw new Error(`Định dạng file .${fileType} chưa được hỗ trợ`);
    }
};

const parseTxt = async (file: File): Promise<ParsedFile> => {
    const text = await file.text();
    return { text, type: 'txt' };
};

const parsePdf = async (file: File): Promise<ParsedFile> => {
    // Dynamic import to avoid SSR issues
    const pdfJS = await import('pdfjs-dist');

    // Set worker source
    pdfJS.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfJS.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfJS.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    const maxPages = pdf.numPages;

    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return {
        text: fullText,
        type: 'pdf',
        pageCount: maxPages
    };
};

const parseDocx = async (file: File): Promise<ParsedFile> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return {
        text: result.value,
        type: 'docx',
        metadata: { messages: result.messages }
    };
};

const parseExcel = async (file: File): Promise<ParsedFile> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let fullText = '';
    let sheetNames: string[] = [];

    workbook.SheetNames.forEach(sheetName => {
        sheetNames.push(sheetName);
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        fullText += `--- Sheet: ${sheetName} ---\n`;
        jsonData.forEach((row: any) => {
            fullText += row.join(', ') + '\n';
        });
        fullText += '\n';
    });

    return {
        text: fullText,
        type: 'excel',
        metadata: { sheets: sheetNames }
    };
};

export const detectCSVDelimiter = (text: string): { comma: number; semicolon: number; tab: number; detected: 'comma' | 'semicolon' | 'tab' } => {
    const lines = text.split('\n').slice(0, 5);

    let commaCount = 0;
    let semicolonCount = 0;
    let tabCount = 0;

    lines.forEach(line => {
        commaCount += (line.match(/,/g) || []).length;
        semicolonCount += (line.match(/;/g) || []).length;
        tabCount += (line.match(/\t/g) || []).length;
    });

    let detected: 'comma' | 'semicolon' | 'tab' = 'comma';
    const max = Math.max(commaCount, semicolonCount, tabCount);

    if (max === tabCount) detected = 'tab';
    else if (max === semicolonCount) detected = 'semicolon';
    else detected = 'comma';

    return { comma: commaCount, semicolon: semicolonCount, tab: tabCount, detected };
};

export const parseCSVWithDelimiter = (text: string, delimiter: 'comma' | 'semicolon' | 'tab'): string => {
    const delimiterChar = delimiter === 'comma' ? ',' : delimiter === 'semicolon' ? ';' : '\t';
    const lines = text.split('\n');
    let formattedText = '';

    lines.forEach((line, index) => {
        if (line.trim()) {
            const cells = line.split(delimiterChar).map(cell => cell.trim().replace(/^"|"$/g, ''));

            if (index === 0) {
                formattedText += '📊 ' + cells.join(' | ') + '\n';
                formattedText += '-'.repeat(Math.min(cells.join(' | ').length, 100)) + '\n';
            } else {
                formattedText += cells.join(' | ') + '\n';
            }
        }
    });

    return formattedText;
};

import React, { useState } from 'react';
import { X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { detectCSVDelimiter, parseCSVWithDelimiter } from '../utils/fileParser';

interface ExcelSheet {
    name: string;
    rowCount: number;
    preview: string;
}

export interface FilePreviewData {
    type: 'excel' | 'csv';
    fileName: string;
    sheets?: ExcelSheet[];
    csvDelimiters?: {
        comma: number;
        semicolon: number;
        tab: number;
        detected: 'comma' | 'semicolon' | 'tab';
    };
    rawData?: any;
}

interface FilePreviewModalProps {
    filePreview: FilePreviewData;
    darkMode: boolean;
    onClose: () => void;
    onImport: (text: string) => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ filePreview, darkMode, onClose, onImport }) => {
    const [selectedSheets, setSelectedSheets] = useState<string[]>(filePreview.sheets ? [filePreview.sheets[0].name] : []);
    const [selectedDelimiter, setSelectedDelimiter] = useState<'comma' | 'semicolon' | 'tab'>(filePreview.csvDelimiters?.detected || 'comma');

    const handleImportExcel = () => {
        if (!filePreview.rawData) return;
        const { workbook } = filePreview.rawData;
        let allText = '';
        selectedSheets.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const sheetText = XLSX.utils.sheet_to_txt(worksheet, { FS: '\t' });
            if (sheetText.trim()) {
                allText += `\n=== ${sheetName} ===\n\n${sheetText}\n`;
            }
        });
        if (allText.trim()) onImport(allText);
    };

    const handleImportCSV = () => {
        if (!filePreview.rawData) return;
        const formattedText = parseCSVWithDelimiter(filePreview.rawData, selectedDelimiter);
        onImport(formattedText);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                {/* Header */}
                <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {filePreview.type === 'excel' ? '📊 Import Excel Options' : '📄 Import CSV Options'}
                            </h3>
                            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {filePreview.fileName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* EXCEL SHEET SELECTOR */}
                    {filePreview.type === 'excel' && filePreview.sheets && (
                        <div>
                            <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                Chọn sheet(s) để import:
                            </label>

                            <div className="space-y-3">
                                {filePreview.sheets.map((sheet) => (
                                    <div
                                        key={sheet.name}
                                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedSheets.includes(sheet.name)
                                            ? darkMode
                                                ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                                                : 'border-blue-500 bg-blue-50'
                                            : darkMode
                                                ? 'border-gray-600 hover:border-gray-500'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        onClick={() => {
                                            if (selectedSheets.includes(sheet.name)) {
                                                setSelectedSheets(selectedSheets.filter(s => s !== sheet.name));
                                            } else {
                                                setSelectedSheets([...selectedSheets, sheet.name]);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedSheets.includes(sheet.name)}
                                                onChange={() => { }}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {sheet.name}
                                                    </h4>
                                                    <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                                        {sheet.rowCount} rows
                                                    </span>
                                                </div>
                                                <pre className={`text-xs mt-2 font-mono whitespace-pre-wrap ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {sheet.preview}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setSelectedSheets(filePreview.sheets?.map(s => s.name) || [])}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Chọn tất cả
                                </button>
                                <button
                                    onClick={() => setSelectedSheets([])}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Bỏ chọn tất cả
                                </button>
                            </div>
                        </div>
                    )}

                    {/* CSV DELIMITER SELECTOR */}
                    {filePreview.type === 'csv' && filePreview.csvDelimiters && (
                        <div>
                            <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                Chọn delimiter (dấu phân cách):
                            </label>

                            <div className="space-y-3">
                                {['comma', 'semicolon', 'tab'].map(type => (
                                    <div
                                        key={type}
                                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedDelimiter === type
                                            ? darkMode
                                                ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                                                : 'border-blue-500 bg-blue-50'
                                            : darkMode
                                                ? 'border-gray-600 hover:border-gray-500'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        onClick={() => setSelectedDelimiter(type as any)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    checked={selectedDelimiter === type}
                                                    onChange={() => setSelectedDelimiter(type as any)}
                                                />
                                                <div>
                                                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {type === 'comma' ? 'Comma ( , )' : type === 'semicolon' ? 'Semicolon ( ; )' : 'Tab ( ⭾ )'}
                                                    </h4>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Preview with type assertion */}
                            <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                                <label className={`block text-xs font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Preview (3 dòng đầu):
                                </label>
                                <pre className={`text-xs font-mono whitespace-pre-wrap ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {parseCSVWithDelimiter(
                                        (filePreview.rawData as string).split('\n').slice(0, 3).join('\n'),
                                        selectedDelimiter
                                    )}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-6 border-t ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className={`px-6 py-2 rounded-lg font-medium ${darkMode
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => {
                                if (filePreview.type === 'excel') handleImportExcel();
                                else handleImportCSV();
                            }}
                            disabled={filePreview.type === 'excel' && selectedSheets.length === 0}
                            className={`px-6 py-2 rounded-lg font-medium ${filePreview.type === 'excel' && selectedSheets.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : darkMode
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                        >
                            {filePreview.type === 'excel'
                                ? `Import ${selectedSheets.length} sheet(s)`
                                : 'Import CSV'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;

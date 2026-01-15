import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export data to CSV and trigger download
 */
export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Generate and download a PDF document
 */
export const generatePDF = (
    headers: string[],
    data: (string | number | boolean)[][],
    filename: string,
    title: string,
    orientation: 'portrait' | 'landscape' = 'portrait'
) => {
    const doc = new jsPDF({ orientation });

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Add date
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Generate table
    autoTable(doc, {
        head: [headers],
        body: data,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600 logic
    });

    doc.save(`${filename}.pdf`);
};

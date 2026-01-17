
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV, generatePDF } from '../utils/export';
import Papa from 'papaparse';
import autoTable from 'jspdf-autotable';

// Mock libraries
vi.mock('papaparse', () => ({
    default: {
        unparse: vi.fn()
    }
}));

const mockDoc = {
    setFontSize: vi.fn(),
    text: vi.fn(),
    setTextColor: vi.fn(),
    save: vi.fn()
};

vi.mock('jspdf', () => {
    return {
        default: class { constructor() { return mockDoc; } },
        jsPDF: class { constructor() { return mockDoc; } }
    };
});

vi.mock('jspdf-autotable', () => ({
    default: vi.fn()
}));

describe('Export Utils', () => {

    // Mock browser APIs
    const mockUrl = {
        createObjectURL: vi.fn(),
        revokeObjectURL: vi.fn()
    };

    beforeEach(() => {
        vi.resetAllMocks();

        // Mock global URL
        global.URL.createObjectURL = mockUrl.createObjectURL;
        global.URL.revokeObjectURL = mockUrl.revokeObjectURL;
    });

    describe('exportToCSV', () => {
        it('should generate CSV and trigger download', () => {
            const data = [{ col1: 'val1' }];
            const filename = 'test-export';

            // Mock Papa.unparse
            vi.mocked(Papa.unparse).mockReturnValue('col1\nval1');

            // Mock URL.createObjectURL
            mockUrl.createObjectURL.mockReturnValue('blob:url');

            // Mock DOM elements
            const link = {
                download: '',
                setAttribute: vi.fn(),
                style: { visibility: '' },
                click: vi.fn(),
                href: ''
            };

            const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(link as unknown as HTMLAnchorElement);
            const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => link as unknown as Node);
            const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => link as unknown as Node);

            exportToCSV(data, filename);

            expect(Papa.unparse).toHaveBeenCalledWith(data);
            expect(mockUrl.createObjectURL).toHaveBeenCalled();
            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(link.setAttribute).toHaveBeenCalledWith('href', 'blob:url');
            expect(link.setAttribute).toHaveBeenCalledWith('download', 'test-export.csv');
            expect(appendSpy).toHaveBeenCalled();
            expect(link.click).toHaveBeenCalled();
            expect(removeSpy).toHaveBeenCalled();
        });

        it('should exit if download attribute is not supported (unlikely in modern browsers but coverage check)', () => {
            const data = [{ col1: 'val1' }];
            vi.mocked(Papa.unparse).mockReturnValue('csv');

            // Mock create element returning object WITHOUT download property
            vi.spyOn(document, 'createElement').mockReturnValue({} as unknown as HTMLAnchorElement);

            // Spy on createObjectURL to ensure it's NOT called if check fails
            mockUrl.createObjectURL.mockClear();

            exportToCSV(data, 'file');

            expect(mockUrl.createObjectURL).not.toHaveBeenCalled();
        });
    });

    describe('generatePDF', () => {
        it('should generate PDF using jsPDF and autoTable', () => {
            const headers = ['H1'];
            const data = [['d1']];
            const filename = 'test-doc';
            const title = 'Test Title';

            generatePDF(headers, data, filename, title);

            // expect(jsPDF).toHaveBeenCalledWith({ orientation: 'portrait' }); // Skipped as it is a class mock

            // Use global mockDoc
            expect(mockDoc.setFontSize).toHaveBeenCalledWith(18);
            expect(mockDoc.text).toHaveBeenCalledWith(title, 14, 22);
            expect(mockDoc.save).toHaveBeenCalledWith('test-doc.pdf');
            expect(autoTable).toHaveBeenCalledWith(mockDoc, expect.objectContaining({
                head: [headers],
                body: data
            }));
        });
    });

});

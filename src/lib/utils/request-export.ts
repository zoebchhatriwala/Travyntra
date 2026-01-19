import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatMoney } from './money';

interface AuditRequestData {
    id: string;
    title: string;
    status: string;
    user: {
        name: string | null;
        email: string;
    };
    createdAt: Date;
    destination: string;
    startDate: Date;
    endDate: Date;
    purpose?: string | null;
    budget?: any;
    cost?: any;
    approvalSteps: {
        step: {
            name: string;
        };
        status: string;
        approvals: {
            user: {
                name: string | null;
            };
            status: string;
            comment?: string | null;
            updatedAt: Date;
        }[];
    }[];
    messages: {
        sender: {
            name: string | null;
            role: string;
        };
        content: string;
        createdAt: Date;
    }[];
}

/**
 * Generates an auditable PDF report for a trip request
 */
export const generateRequestAuditPDF = (data: AuditRequestData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Helper for section headers
    const addSectionHeader = (text: string, y: number) => {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229); // Indigo 600
        doc.text(text, 14, y);
        doc.setDrawColor(229, 231, 235); // Gray 200
        doc.line(14, y + 2, pageWidth - 14, y + 2);
        return y + 10;
    };

    // Header logic
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39); // Gray 900
    doc.text("Trip Request Report", 14, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // Gray 500
    doc.text(`Request ID: ${data.id}`, 14, 32);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 37);

    // Status Badge
    const statusText = data.status.replace(/_/g, ' ');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const statusWidth = doc.getTextWidth(statusText) + 10;
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.roundedRect(pageWidth - statusWidth - 14, 20, statusWidth, 8, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(statusText, pageWidth - statusWidth - 9, 25.5);

    // --- Section 1: Core Information ---
    let currentY = addSectionHeader("General Information", 50);

    const generalInfo = [
        ["Title", data.title],
        ["Created By", `${data.user.name || 'Unknown'} (${data.user.email})`],
        ["Created On", format(new Date(data.createdAt), 'PPP')],
        ["Destination", data.destination],
        ["Travel Dates", `${format(new Date(data.startDate), 'PP')} - ${format(new Date(data.endDate), 'PP')}`],
        ["Purpose", data.purpose || "N/A"],
        ["Budget", data.budget ? formatMoney(data.budget) : "N/A"],
        ["Actual Cost", data.cost ? formatMoney(data.cost) : "N/A"]
    ];

    autoTable(doc, {
        startY: currentY,
        body: generalInfo,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        margin: { left: 14 }
    });

    // --- Section 2: Approval History ---
    currentY = (doc as any).lastAutoTable.finalY + 15;
    currentY = addSectionHeader("Approval Workflow Status", currentY);

    const approvalData: any[] = [];
    data.approvalSteps.forEach(step => {
        if (step.approvals.length === 0) {
            approvalData.push([step.step.name, "Pending Assignment", "-", "PENDING", "-"]);
        } else {
            step.approvals.forEach((approval, idx) => {
                approvalData.push([
                    idx === 0 ? step.step.name : "",
                    approval.user.name || "Unknown",
                    format(new Date(approval.updatedAt), 'PP p'),
                    approval.status,
                    approval.comment || "-"
                ]);
            });
        }
    });

    autoTable(doc, {
        startY: currentY,
        head: [["Step", "Approver", "Action Date", "Status", "Comment"]],
        body: approvalData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14 }
    });

    // --- Section 3: Discussions ---
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page for discussions
    if (currentY > 230) {
        doc.addPage();
        currentY = 25;
    }

    currentY = addSectionHeader("Discussion History", currentY);

    const messages = data.messages || [];
    if (messages.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(107, 114, 128);
        doc.text("No discussion records found for this request.", 14, currentY + 5);
    } else {
        const messageRows = messages.map(msg => [
            `${msg.sender.name || 'Unknown'}\n(${msg.sender.role.replace(/_/g, ' ')})`,
            format(new Date(msg.createdAt), 'PP p'),
            msg.content
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [["Participant", "Date", "Comment"]],
            body: messageRows,
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [79, 70, 229] },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 40 },
                2: { cellWidth: 'auto' }
            },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { left: 14 }
        });
    }

    // Footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
            `Page ${i} of ${pageCount} - Confidential Audit Record`,
            pageWidth / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    doc.save(`TripRequest_${data.id.slice(0, 8)}.pdf`);
};

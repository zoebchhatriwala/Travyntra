
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    getFulfillmentRequest,
    addFulfillmentItem,
    updateFulfillmentItem,
    deleteFulfillmentItem,
    toggleFulfillmentItem,
    uploadFulfillmentDocument,
    deleteDocument,
    markAsBooked,
    markAsCompleted
} from '@/app/agent/fulfillment/actions';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { RequestStatus } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

// Mocks
vi.mock('next-auth');
vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));
vi.mock('@/lib/storage', () => ({
    uploadFile: vi.fn().mockResolvedValue('http://mock-url.com'),
}));

describe('Fulfillment Actions', () => {
    const mockSession = {
        user: {
            id: 'agent-1',
            companyId: 'agency-1',
            role: 'TRAVEL_AGENT',
            name: 'Agent Smith',
            email: 'agent@test.com'
        }
    };

    beforeEach(() => {
        vi.resetAllMocks();
        (getServerSession as Mock).mockResolvedValue(mockSession);
    });

    describe('getFulfillmentRequest', () => {
        it('should return null if not authorized', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await getFulfillmentRequest('req-1');
            expect(result).toBeNull();
        });

        it('should return null if no companyId in session', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'TRAVEL_AGENT' } });
            const result = await getFulfillmentRequest('req-1');
            expect(result).toBeNull();
        });

        it('should handle non-TRAVEL_AGENT role for invoice visibility', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                agencyId: 'agency-1',
                invoice: { amount: 100 }
            } as any);

            const result = await getFulfillmentRequest('req-1');
            expect(result?.invoice).toBeNull();
        });

        it('should return request if assigned to agency', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                agencyId: 'agency-1',
                invoice: { amount: 100, subtotal: 80 }
            } as any);

            const result = await getFulfillmentRequest('req-1');
            expect(result).not.toBeNull();
            expect(result?.id).toBe('req-1');
            expect(result?.invoice?.amount).toBe(100);
            expect(result?.invoice?.subtotal).toBe(80);
        });

        it('should return null if request not found', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue(null);
            const result = await getFulfillmentRequest('req-1');
            expect(result).toBeNull();
        });

        it('should handle missing invoice', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                agencyId: 'agency-1',
                invoice: null
            } as any);

            const result = await getFulfillmentRequest('req-1');
            expect(result?.invoice).toBeNull();
        });

        it('should handle missing subtotal in invoice', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                agencyId: 'agency-1',
                invoice: { amount: 100 }
            } as any);

            const result = await getFulfillmentRequest('req-1');
            expect(result?.invoice?.subtotal).toBe(0);
        });

        it('should fetch all messages when limitMessages is false', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                agencyId: 'agency-1',
                bids: [],
                messages: []
            } as any);

            await getFulfillmentRequest('req-1', false);

            expect(prismaMock.tripRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                include: expect.objectContaining({
                    messages: expect.objectContaining({
                        orderBy: { createdAt: 'asc' }
                    })
                })
            }));
            // Verify 'take' is NOT present in the messages include when limitMessages is false
            const callArgs = prismaMock.tripRequest.findFirst.mock.calls[0][0] as any;
            expect(callArgs?.include?.messages?.take).toBeUndefined();
        });
    });

    describe('addFulfillmentItem', () => {
        it('should return error if unauthorized (no companyId)', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'TRAVEL_AGENT' } });
            const result = await addFulfillmentItem('req-1', 'Item');
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should return error if unauthorized (wrong role)', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'EMPLOYEE' } });
            const result = await addFulfillmentItem('req-1', 'Item');
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should add item successfully', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                agencyId: 'agency-1',
                fulfillmentItems: []
            } as any);

            prismaMock.fulfillmentItem.create.mockResolvedValue({ id: 'item-1' } as any);

            const result = await addFulfillmentItem('req-1', 'Ticket');

            expect(result.success).toBe(true);
            expect(prismaMock.fulfillmentItem.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ title: 'Ticket', order: 0 })
            }));
        });

        it('should add item successfully as AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                agencyId: 'agency-1',
                fulfillmentItems: []
            } as any);
            prismaMock.fulfillmentItem.create.mockResolvedValue({ id: 'item-1' } as any);

            const result = await addFulfillmentItem('req-1', 'Ticket');
            expect(result.success).toBe(true);
        });

        it('should return error if request not found or not assigned', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue(null);
            const result = await addFulfillmentItem('req-1', 'Ticket');
            expect(result.error).toBe("Request not found or not assigned to your agency");
        });

        it('should handle database error', async () => {
            prismaMock.tripRequest.findFirst.mockRejectedValue(new Error('DB Error'));
            const result = await addFulfillmentItem('req-1', 'Ticket');
            expect(result.error).toBe('Failed to add item');
        });
    });

    describe('updateFulfillmentItem', () => {
        it('should update item', async () => {
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({ id: 'item-1' } as any);
            const result = await updateFulfillmentItem('item-1', 'req-1', { title: 'New' });
            expect(result.success).toBe(true);
            expect(prismaMock.fulfillmentItem.update).toHaveBeenCalled();
        });

        it('should update item as AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({ id: 'item-1' } as any);
            const result = await updateFulfillmentItem('item-1', 'req-1', { title: 'New' });
            expect(result.success).toBe(true);
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await updateFulfillmentItem('item-1', 'req-1', { title: 'New' });
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should return error if item not found', async () => {
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue(null);
            const result = await updateFulfillmentItem('item-1', 'req-1', { title: 'New' });
            expect(result.error).toBe('Item not found');
        });

        it('should handle database error', async () => {
            prismaMock.fulfillmentItem.findFirst.mockRejectedValue(new Error('DB Error'));
            const result = await updateFulfillmentItem('item-1', 'req-1', { title: 'New' });
            expect(result.error).toBe('Failed to update item');
        });
    });

    describe('deleteFulfillmentItem', () => {
        it('should delete item and docs', async () => {
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({
                id: 'item-1',
                documents: [{ id: 'doc-1' }]
            } as any);

            const result = await deleteFulfillmentItem('item-1', 'req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.document.deleteMany).toHaveBeenCalled();
            expect(prismaMock.fulfillmentItem.delete).toHaveBeenCalled();
        });

        it('should delete item as AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({
                id: 'item-1',
                documents: []
            } as any);
            const result = await deleteFulfillmentItem('item-1', 'req-1');
            expect(result.success).toBe(true);
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await deleteFulfillmentItem('item-1', 'req-1');
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should return error if item not found', async () => {
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue(null);
            const result = await deleteFulfillmentItem('item-1', 'req-1');
            expect(result.error).toBe('Item not found');
        });

        it('should handle database error', async () => {
            prismaMock.fulfillmentItem.findFirst.mockRejectedValue(new Error('DB Error'));
            const result = await deleteFulfillmentItem('item-1', 'req-1');
            expect(result.error).toBe('Failed to delete item');
        });
    });

    describe('toggleFulfillmentItem', () => {
        it('should toggle completion status', async () => {
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({ id: 'item-1' } as any);
            const result = await toggleFulfillmentItem('item-1', 'req-1', true);
            expect(result.success).toBe(true);
            expect(prismaMock.fulfillmentItem.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { isCompleted: true }
            }));
        });

        it('should toggle as AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({ id: 'item-1' } as any);
            const result = await toggleFulfillmentItem('item-1', 'req-1', true);
            expect(result.success).toBe(true);
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await toggleFulfillmentItem('item-1', 'req-1', true);
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should return error if item not found', async () => {
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue(null);
            const result = await toggleFulfillmentItem('item-1', 'req-1', true);
            expect(result.error).toBe('Item not found');
        });

        it('should handle database error', async () => {
            prismaMock.fulfillmentItem.findFirst.mockRejectedValue(new Error('DB Error'));
            const result = await toggleFulfillmentItem('item-1', 'req-1', true);
            expect(result.error).toBe('Failed to update item');
        });
    });

    describe('uploadFulfillmentDocument', () => {
        it('should upload document', async () => {
            const formData = new FormData();
            formData.append('files', new Blob(['content']), 'test.pdf');
            formData.append('requestId', 'req-1');
            formData.append('fulfillmentItemId', 'item-1');

            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({
                id: 'item-1',
                title: 'Item 1',
                request: { companyId: 'co-1', userId: 'u1', title: 'T1', company: { slug: 'co' } }
            } as any);
            prismaMock.document.create.mockResolvedValue({ id: 'new-doc', url: 'http://url', name: 'test.pdf' } as any);

            const result = await uploadFulfillmentDocument(formData);

            expect(result.success).toBe(true);
            expect(prismaMock.document.create).toHaveBeenCalled();
            expect(createNotification).toHaveBeenCalled();
        });

        it('should upload as AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            const formData = new FormData();
            formData.append('files', new Blob(['content']), 'test.pdf');
            formData.append('requestId', 'req-1');
            formData.append('fulfillmentItemId', 'item-1');

            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({
                id: 'item-1',
                title: 'Item 1',
                request: { companyId: 'co-1', userId: 'u1', title: 'T1', company: { slug: 'co' } }
            } as any);
            prismaMock.document.create.mockResolvedValue({ id: 'doc-1', url: 'http://url', name: 'test.pdf' } as any);

            const result = await uploadFulfillmentDocument(formData);
            expect(result.success).toBe(true);
        });

        it('should upload document with provided type', async () => {
            const formData = new FormData();
            formData.append('files', new Blob(['content']), 'test.pdf');
            formData.append('requestId', 'req-1');
            formData.append('fulfillmentItemId', 'item-1');
            formData.append('type', 'TICKET');

            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({
                id: 'item-1',
                title: 'Item 1',
                request: { companyId: 'co-1', userId: 'u1', title: 'T1', company: { slug: 'co' } }
            } as any);
            prismaMock.document.create.mockResolvedValue({ id: 'new-doc', url: 'http://url', name: 'test.pdf' } as any);

            const result = await uploadFulfillmentDocument(formData);

            expect(result.success).toBe(true);
            expect(prismaMock.document.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ type: 'TICKET' })
            }));
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await uploadFulfillmentDocument(new FormData());
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should return error if no files', async () => {
            const formData = new FormData();
            formData.append('requestId', 'req-1');
            formData.append('fulfillmentItemId', 'item-1');
            const result = await uploadFulfillmentDocument(formData);
            expect(result.error).toBe('No files provided');
        });

        it('should return error if missing requestId', async () => {
            const formData = new FormData();
            formData.append('files', new Blob(['content']), 'test.pdf');
            formData.append('fulfillmentItemId', 'item-1');
            const result = await uploadFulfillmentDocument(formData);
            expect(result.error).toBe('Request ID is required');
        });

        it('should return error if missing fulfillmentItemId', async () => {
            const formData = new FormData();
            formData.append('files', new Blob(['content']), 'test.pdf');
            formData.append('requestId', 'req-1');
            const result = await uploadFulfillmentDocument(formData);
            expect(result.error).toBe('Fulfillment item ID is required');
        });

        it('should return error if item not found', async () => {
            const formData = new FormData();
            formData.append('files', new Blob(['content']), 'test.pdf');
            formData.append('requestId', 'req-1');
            formData.append('fulfillmentItemId', 'item-1');
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue(null);
            const result = await uploadFulfillmentDocument(formData);
            expect(result.error).toBe('Fulfillment item not found or not assigned to your agency');
        });

        it('should return error if file size limit exceeded', async () => {
            const formData = new FormData();
            const largeFile = new Blob(['a'.repeat(11 * 1024 * 1024)]);
            formData.append('files', largeFile, 'large.pdf');
            formData.append('requestId', 'req-1');
            formData.append('fulfillmentItemId', 'item-1');

            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({ id: 'item-1' } as any);

            const result = await uploadFulfillmentDocument(formData);
            expect(result.error).toContain('exceeds 10MB limit');
        });

        it('should handle database error', async () => {
            const formData = new FormData();
            formData.append('files', new Blob(['content']), 'test.pdf');
            formData.append('requestId', 'req-1');
            formData.append('fulfillmentItemId', 'item-1');
            prismaMock.fulfillmentItem.findFirst.mockRejectedValue(new Error('DB Error'));
            const result = await uploadFulfillmentDocument(formData);
            expect(result.error).toBe('Failed to upload documents');
        });
    });

    describe('deleteDocument', () => {
        it('should delete document', async () => {
            prismaMock.document.findFirst.mockResolvedValue({ id: 'doc-1' } as any);
            const result = await deleteDocument('doc-1', 'req-1');
            expect(result.success).toBe(true);
            expect(prismaMock.document.delete).toHaveBeenCalled();
        });

        it('should delete document as AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            prismaMock.document.findFirst.mockResolvedValue({ id: 'doc-1' } as any);
            const result = await deleteDocument('doc-1', 'req-1');
            expect(result.success).toBe(true);
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await deleteDocument('doc-1', 'req-1');
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should return error if document not found', async () => {
            prismaMock.document.findFirst.mockResolvedValue(null);
            const result = await deleteDocument('doc-1', 'req-1');
            expect(result.error).toBe('Document not found');
        });

        it('should handle database error', async () => {
            prismaMock.document.findFirst.mockRejectedValue(new Error('DB Error'));
            const result = await deleteDocument('doc-1', 'req-1');
            expect(result.error).toBe('Failed to delete document');
        });
    });

    describe('markAsBooked', () => {
        it('should mark as booked', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                companyId: 'co-1',
                company: { slug: 'co' },
                title: 'Trip'
            } as any);

            const result = await markAsBooked('req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: RequestStatus.BOOKED }
            }));
            expect(createNotification).toHaveBeenCalled();
        });

        it('should mark as booked as AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                companyId: 'co-1',
                company: { slug: 'co' },
                title: 'Trip'
            } as any);
            const result = await markAsBooked('req-1');
            expect(result.success).toBe(true);
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await markAsBooked('req-1');
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should return error if request not found or wrong status', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue(null);
            const result = await markAsBooked('req-1');
            expect(result.error).toBe('Request not found or not in correct status');
        });

        it('should handle database error', async () => {
            prismaMock.tripRequest.findFirst.mockRejectedValue(new Error('DB Error'));
            const result = await markAsBooked('req-1');
            expect(result.error).toBe('Failed to update status');
        });
    });

    describe('markAsCompleted', () => {
        it('should error if items incomplete', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                fulfillmentItems: [{ isCompleted: false }]
            } as any);

            const result = await markAsCompleted('req-1');
            expect(result.error).toContain('incomplete');
        });

        it('should complete if all items done', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                companyId: 'co-1',
                company: { slug: 'co' },
                title: 'Trip',
                fulfillmentItems: [{ isCompleted: true }]
            } as any);
            prismaMock.user.findMany.mockResolvedValue([]); // admins

            const result = await markAsCompleted('req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: RequestStatus.COMPLETED }
            }));
        });

        it('should mark as completed as AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'AGENCY_EMPLOYEE' } });
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                companyId: 'co-1',
                company: { slug: 'co' },
                title: 'Trip',
                fulfillmentItems: [{ isCompleted: true }]
            } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            const result = await markAsCompleted('req-1');
            expect(result.success).toBe(true);
            expect(createNotification).toHaveBeenCalled();
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await markAsCompleted('req-1');
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should error if request not found', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue(null);
            const result = await markAsCompleted('req-1');
            expect(result.error).toBe('Request not found or not in correct status');
        });

        it('should error if no fulfillment items', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                fulfillmentItems: []
            } as any);

            const result = await markAsCompleted('req-1');
            expect(result.error).toBe('Please add at least one fulfillment item before completing');
        });

        it('should handle database error', async () => {
            prismaMock.tripRequest.findFirst.mockRejectedValue(new Error('DB Error'));
            const result = await markAsCompleted('req-1');
            expect(result.error).toBe('Failed to complete request');
        });
    });
});

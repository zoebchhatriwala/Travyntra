
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

        it('should return request if assigned to agency', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue({
                id: 'req-1',
                agencyId: 'agency-1',
                invoice: { amount: 100 }
            } as any);

            const result = await getFulfillmentRequest('req-1');
            expect(result).not.toBeNull();
            expect(result?.id).toBe('req-1');
        });
    });

    describe('addFulfillmentItem', () => {
        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await addFulfillmentItem('req-1', 'Item');
            expect(result.error).toBe('Unauthorized');
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
    });

    describe('updateFulfillmentItem', () => {
        it('should update item', async () => {
            prismaMock.fulfillmentItem.findFirst.mockResolvedValue({ id: 'item-1' } as any);
            const result = await updateFulfillmentItem('item-1', 'req-1', { title: 'New' });
            expect(result.success).toBe(true);
            expect(prismaMock.fulfillmentItem.update).toHaveBeenCalled();
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
    });

    describe('deleteDocument', () => {
        it('should delete document', async () => {
            prismaMock.document.findFirst.mockResolvedValue({ id: 'doc-1' } as any);
            const result = await deleteDocument('doc-1', 'req-1');
            expect(result.success).toBe(true);
            expect(prismaMock.document.delete).toHaveBeenCalled();
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
    });
});

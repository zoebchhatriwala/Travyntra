
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    getEmployeeDashboardStats,
    getEmployeeRequests,
    getTripRequest,
    postTripMessage,
    uploadMessageAttachment,
    getEmployeeAssets,
    updateTripRequest,
    cancelTripRequest,
    deleteTripRequest,
    addCollaborator,

    removeCollaborator,
    getCompanyGroupTrips,
    createTripRequest,
    getTripMessages,
    searchCompanyUsers,
    updateEmployeeProfile
} from '@/app/company/[slug]/(dashboard)/dashboard/actions';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { createNotification } from '@/lib/notifications';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));
vi.mock('@/lib/storage', () => ({
    uploadFile: vi.fn().mockResolvedValue('https://example.com/file.pdf'),
}));
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/lib/workflow-engine', () => ({
    WorkflowEngine: {
        handleRequestUpdate: vi.fn(),
        startWorkflow: vi.fn(),
    }
}));
vi.mock('@/lib/schemas/trip-preferences', () => ({
    TripPreferencesSchema: {
        safeParse: () => ({ success: true })
    }
}));

describe('Dashboard Actions', () => {
    const mockSession = {
        user: {
            id: 'user-1',
            companyId: 'company-1',
            companySlug: 'test-co',
            name: 'Test User',
            email: 'test@test.com',
            role: 'EMPLOYEE'
        }
    };

    beforeEach(() => {
        vi.resetAllMocks();
        (getServerSession as Mock).mockResolvedValue(mockSession);
        prismaMock.$transaction.mockImplementation(((arg: any) => {
            if (Array.isArray(arg)) return Promise.all(arg);
            if (typeof arg === 'function') return arg(prismaMock);
            return Promise.resolve(arg);
        }) as any);
    });

    describe('getEmployeeDashboardStats', () => {
        it('should return null if not authenticated', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await getEmployeeDashboardStats();
            expect(result).toBeNull();
        });

        it('should return stats for authenticated user', async () => {
            const mockCompany = { currency: 'USD' };
            prismaMock.tripRequest.count.mockResolvedValueOnce(5); // Active
            prismaMock.tripRequest.count.mockResolvedValueOnce(2); // Completed
            prismaMock.tripRequest.findMany.mockResolvedValue([
                { id: '1', title: 'Trip 1', status: 'PENDING', createdAt: new Date(), budget: { amount: 1000, currencyCode: 'USD', multiplier: 100 }, userId: 'user-1' }
            ] as any);
            prismaMock.company.findUnique.mockResolvedValue(mockCompany as any);

            const result = await getEmployeeDashboardStats();

            expect(result).toEqual(expect.objectContaining({
                userName: 'Test User',
                activeRequests: 5,
                completedTrips: 2,
                currency: 'USD'
            }));
            expect(result?.recentRequests).toHaveLength(1);
        });
    });

    describe('getEmployeeRequests', () => {
        it('should return paginated requests', async () => {
            const mockCompany = { currency: 'USD' };
            prismaMock.tripRequest.count.mockResolvedValue(10);
            prismaMock.tripRequest.findMany.mockResolvedValue([
                { id: '1', title: 'Trip 1', status: 'APPROVED', createdAt: new Date(), budget: { amount: 500, currencyCode: 'USD', multiplier: 100 }, userId: 'user-1' }
            ] as any);
            prismaMock.company.findUnique.mockResolvedValue(mockCompany as any);

            const result = await getEmployeeRequests({ page: 1, limit: 10 });

            expect(result.total).toBe(10);
            expect(result.requests).toHaveLength(1);
            expect(prismaMock.tripRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
        });
    });

    describe('getTripRequest', () => {
        it('should return null if user is not authorized', async () => {
            // Mock request belonging to another company
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                companyId: 'other-company',
                userId: 'other-user',
                collaborators: [],
                approvalSteps: []
            } as any);

            const result = await getTripRequest('req-1');
            expect(result).toBeNull();
        });

        it('should return request with converted bids if authorized', async () => {
            const mockRequest = {
                id: 'req-1',
                companyId: 'company-1',
                userId: 'user-1',
                collaborators: [],
                approvalSteps: [],
                company: { currency: 'EUR', name: 'Co' }, // Company uses EUR
                bids: [
                    {
                        id: 'bid-1',
                        amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 }, // Bid in USD ($100)
                        taxes: []
                    }
                ],
                messages: [],
                documents: [],
                childTrips: []
            };

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            // Mock currency service
            // Note: Since getTripRequest uses dynamic imports for money/currency utils sometimes, 
            // or standard imports, we rely on the implementation. 
            // The code uses `convertMoney` from '@/lib/services/currency'.
            // The file `lib/services/currency` isn't mocked globally here so it might use real logic or fail if fetch missing.
            // We should mock `fetch` for currency conversion.
            global.fetch = vi.fn().mockResolvedValue({
                json: async () => ({ success: true, rates: { 'USD': 1, 'EUR': 0.85 } })
            });

            const result = await getTripRequest('req-1');

            expect(result).toBeTruthy();
            expect(result?.bids[0].convertedAmount).toBeDefined();
            // 100 USD * 0.85 = 85 EUR
            expect(result?.bids[0].convertedAmount?.amount).toBeCloseTo(8500, -2);
        });
    });

    describe('postTripMessage', () => {
        it('should post message and notify mentioned users', async () => {
            const mockRequest = {
                id: 'req-1',
                title: 'Trip',
                userId: 'user-1',
                collaborators: [],
                company: { slug: 'test-co' }
            };

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.message.create.mockResolvedValue({ id: 'msg-1' } as any);

            // Mock users for mention
            prismaMock.user.findMany.mockResolvedValue([
                { id: 'user-2', name: 'John Doe' }
            ] as any);

            // Message with mention
            const content = "Hello @John Doe please check";

            await postTripMessage('req-1', content);

            // Verify notification
            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-2',
                title: 'You were mentioned'
            }));

            // Verify collaborator addition
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: expect.objectContaining({
                    collaborators: { connect: [{ id: 'user-2' }] }
                })
            }));
        });
    });

    describe('uploadMessageAttachment', () => {
        it('should return error if files exceed limit', async () => {
            const formData = new FormData();
            for (let i = 0; i < 6; i++) {
                formData.append('files', new Blob(['test']), `file${i}.pdf`);
            }
            formData.append('requestId', 'req-1');

            const result = await uploadMessageAttachment(formData);
            expect(result).toEqual({ error: "Maximum 5 files allowed" });
        });

        it('should upload files successfully', async () => {
            const formData = new FormData();
            formData.append('files', new Blob(['content']), 'test.pdf');
            formData.append('requestId', 'req-1');

            const result = await uploadMessageAttachment(formData);

            expect(result.success).toBe(true);
            expect(result.urls).toHaveLength(1);
        });
    });

    describe('getEmployeeAssets', () => {
        it('should return employee documents', async () => {
            prismaMock.document.count.mockResolvedValue(5);
            prismaMock.document.findMany.mockResolvedValue([
                {
                    id: 'doc-1',
                    name: 'Ticket',
                    type: 'TICKET',
                    url: 'http://url',
                    createdAt: new Date(),
                    request: { title: 'Trip 1' },
                    uploader: { name: 'Admin', role: 'ADMIN' }
                }
            ] as any);

            const result = await getEmployeeAssets({ page: 1 });

            expect(result.documents).toHaveLength(1);
            expect(result.documents[0].tripTitle).toBe('Trip 1');
            expect(result.total).toBe(5);
        });
    });

    describe('updateTripRequest', () => {
        it('should update request if owner', async () => {
            const mockRequest = {
                id: 'req-1',
                userId: 'user-1',
                companyId: 'company-1',
                status: 'DRAFT',
                title: 'Old Title',
                preferences: {}
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            (prismaMock as any).address.create.mockResolvedValue({ id: 'addr-1', formatted: 'New York' });

            const result = await updateTripRequest('req-1', { title: 'New Title' });

            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: expect.objectContaining({ title: 'New Title' })
            }));
        });

        it('should return error if not authorized', async () => {
            const mockRequest = {
                id: 'req-1',
                userId: 'other-user',
                companyId: 'company-1',
                status: 'DRAFT'
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            const result = await updateTripRequest('req-1', { title: 'New' });
            expect(result.error).toContain('not authorized');
        });

        it('should return error if status is not editable', async () => {
            const mockRequest = {
                id: 'req-1',
                userId: 'user-1',
                companyId: 'company-1',
                status: 'COMPLETED'
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            const result = await updateTripRequest('req-1', { title: 'New' });
            expect(result.error).toContain('Cannot update');
        });
    });

    describe('cancelTripRequest', () => {
        it('should cancel request if owner and valid status', async () => {
            const mockRequest = {
                id: 'req-1',
                userId: 'user-1',
                companyId: 'company-1',
                status: 'APPROVED',
                title: 'Trip'
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            const result = await cancelTripRequest('req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: { status: 'CANCELLED' }
            }));
        });
    });

    describe('deleteTripRequest', () => {
        it('should delete request', async () => {
            const mockRequest = {
                id: 'req-1',
                userId: 'user-1',
                companyId: 'company-1',
                status: 'DRAFT'
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            const result = await deleteTripRequest('req-1');

            expect(result.success).toBe(true);
            // Verify transaction called
            expect(prismaMock.$transaction).toHaveBeenCalled();
        });
    });

    describe('manageCollaborators', () => {
        it('should add collaborator', async () => {
            const mockRequest = {
                id: 'req-1',
                userId: 'user-1',
                companyId: 'company-1',
                title: 'Trip',
                company: { slug: 'test' }
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            const result = await addCollaborator('req-1', 'user-2');

            expect(result.success).toBe(true);
            expect(createNotification).toHaveBeenCalled();
        });

        it('should remove collaborator', async () => {
            const mockRequest = {
                id: 'req-1',
                userId: 'user-1',
                companyId: 'company-1',
                company: { slug: 'test' }
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            const result = await removeCollaborator('req-1', 'user-2');
            expect(result.success).toBe(true);
        });
    });
    describe('getCompanyGroupTrips', () => {
        it('should return group trips', async () => {
            prismaMock.tripRequest.findMany.mockResolvedValue([
                { id: 'g-1', title: 'Group Trip', isGroup: true, startDate: new Date() }
            ] as any);

            const result = await getCompanyGroupTrips();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('g-1');
        });
    });

    describe('createTripRequest', () => {
        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await createTripRequest({ title: 'Trip' } as any);
            expect(result.error).toContain('Unauthenticated');
        });

        it('should create trip request', async () => {
            prismaMock.tripRequest.create.mockResolvedValue({
                id: 'req-new',
                company: { slug: 'co' },
                title: 'Trip'
            } as any);
            // Mock startWorkflow if needed


            const result = await createTripRequest({
                title: 'New Trip',
                destination: { formatted: 'Paris' },
                startDate: new Date(),
                endDate: new Date(),
            } as any);

            expect(result.success).toBe(true);
            expect(result.requestId).toBe('req-new');
        });
    });

    describe('getTripMessages', () => {
        it('should return messages', async () => {
            prismaMock.message.findMany.mockResolvedValue([
                { id: 'm-1', content: 'hello', sender: { name: 'User' } }
            ] as any);

            const result = await getTripMessages('req-1');
            expect(result).toHaveLength(1);
        });
    });

    describe('searchCompanyUsers', () => {
        it('should return users', async () => {
            prismaMock.user.findMany.mockResolvedValue([{ id: 'u-2', name: 'Bob' }] as any);
            const result = await searchCompanyUsers('Bob');
            expect(result).toHaveLength(1);
            expect(prismaMock.user.findMany).toHaveBeenCalled();
        });
    });

    describe('updateEmployeeProfile', () => {
        it('should update profile', async () => {
            const formData = new FormData();
            formData.append('name', 'New Name');

            const result = await updateEmployeeProfile(formData);
            expect(result.success).toBeTruthy();
            expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'user-1' },
                data: { name: 'New Name' }
            }));
        });
    });
});

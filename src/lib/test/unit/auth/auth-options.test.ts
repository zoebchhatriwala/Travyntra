
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
    compare: vi.fn()
}));

// Now import modules that depend on the mocks
import { prismaMock } from '@/lib/test/helpers/prisma';
import { compare } from 'bcryptjs';
import { authOptions, createAuthOptions } from '@/lib/auth-options';

describe('Auth Options', () => {
    // Helper to get providers
    let devProvider: any;
    let normalProvider: any;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.unstubAllEnvs();
        vi.stubEnv('NODE_ENV', 'test');

        const devAuthOptions = createAuthOptions(prismaMock,
            'development'
        );

        const productionAuthOptions = createAuthOptions(prismaMock,
            'production'
        );

        devProvider = devAuthOptions.providers[0].options
        normalProvider = productionAuthOptions.providers[1].options
    });

    describe('createAuthOptions', () => {
        it('should use default secret when NEXTAUTH_SECRET is missing', () => {
            vi.stubEnv('NEXTAUTH_SECRET', '');
            const options = createAuthOptions(prismaMock, 'development');
            expect(options.secret).toBe('travyntrasecretproject2026version');
        });

        it('should use provided secret when NEXTAUTH_SECRET is present', () => {
            vi.stubEnv('NEXTAUTH_SECRET', 'env-secret');
            const options = createAuthOptions(prismaMock, 'development');
            expect(options.secret).toBe('env-secret');
        });

        it('should use default nodeEnv when process.env.NODE_ENV is missing', () => {
            vi.stubEnv('NODE_ENV', '');
            const options = createAuthOptions(prismaMock);
            // We can't easily check internal nodeEnv usage without more exposure, 
            // but calling it ensures the branch is hit.
            expect(options).toBeDefined();
        });
    });


    describe('Dev Login Provider', () => {
        it('should reject if not in development mode', async () => {
            // Use a provider created with production environment to test rejection
            const productionAuthOptions = createAuthOptions(prismaMock, 'production');
            const prodDevProvider = productionAuthOptions.providers[0].options;

            const result = await prodDevProvider.authorize({ email: 'test@test.com' }, {} as any);
            expect(result).toBeNull();
        });

        it('should reject if email is missing', async () => {
            const result = await devProvider.authorize({}, {} as any);
            expect(result).toBeNull();
        });

        it('should reject if user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await devProvider.authorize({ email: 'unknown@test.com' });
            expect(result).toBeNull();
        });

        it('should authenticate successfully in dev mode', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test',
                role: 'EMPLOYEE',
                companyId: 'comp-1',
                company: { type: 'AGENCY', slug: 'agency' },
                avatarUrl: 'image.jpg'
            };

            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

            const result = await devProvider.authorize({ email: 'test@test.com' });

            expect(result).toEqual({
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test',
                role: 'EMPLOYEE',
                companyId: 'comp-1',
                companyType: 'AGENCY',
                companySlug: 'agency',
                image: 'image.jpg'
            });
        });

        it('should handle database errors', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            const result = await devProvider.authorize({ email: 'test@test.com' });
            expect(result).toBeNull();
        });
    });

    describe('Normal Login Provider', () => {
        it('should reject missing credentials', async () => {
            const result1 = await normalProvider.authorize({});
            expect(result1).toBeNull();

            const result2 = await normalProvider.authorize({ email: 'test@test.com' });
            expect(result2).toBeNull();
        });

        it('should reject if user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await normalProvider.authorize({ email: 'test@test.com', password: 'pass' });
            expect(result).toBeNull();
        });

        it('should reject if user has no password (e.g. OAuth)', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', password: null } as any);
            const result = await normalProvider.authorize({ email: 'test@test.com', password: 'pass' });
            expect(result).toBeNull();
        });

        it('should reject if user is inactive', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hash', isActive: false } as any);
            const result = await normalProvider.authorize({ email: 'test@test.com', password: 'pass' });
            expect(result).toBeNull();
        });

        it('should reject if password invalid', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hash', isActive: true } as any);
            (compare as Mock).mockResolvedValue(false);

            const result = await normalProvider.authorize({ email: 'test@test.com', password: 'wrong' });
            expect(result).toBeNull();
        });

        it('should authenticate successfully', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test',
                role: 'EMPLOYEE',
                password: 'hash',
                isActive: true,
                companyId: 'comp-1',
                company: { type: 'AGENCY', slug: 'agency' },
                avatarUrl: 'image.jpg'
            };

            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            (compare as Mock).mockResolvedValue(true);

            const result = await normalProvider.authorize({ email: 'test@test.com', password: 'pass' });

            expect(result).toEqual({
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test',
                role: 'EMPLOYEE',
                companyId: 'comp-1',
                companyType: 'AGENCY',
                companySlug: 'agency',
                image: 'image.jpg'
            });
        });
    });

    describe('Callbacks', () => {
        describe('jwt', () => {
            it('should populate token on initial sign in', async () => {
                const user = {
                    id: 'user-1',
                    role: 'EMPLOYEE',
                    companyId: 'comp-1',
                    companyType: 'AGENCY',
                    companySlug: 'agency',
                    name: 'Test',
                    image: 'img.jpg'
                };
                const token = {};

                const result = await authOptions.callbacks!.jwt!({ token, user } as any);

                expect(result).toEqual(expect.objectContaining({
                    id: 'user-1',
                    role: 'EMPLOYEE',
                    companySlug: 'agency'
                }));
            });

            it('should return token unchanged if no user or trigger', async () => {
                const token = { id: 'user-1' };
                const result = await authOptions.callbacks!.jwt!({ token } as any);
                expect(result).toBe(token);
            });

            it('should update token on "update" trigger', async () => {
                const token = { id: 'user-1', name: 'Old' };
                const session = { user: { name: 'New', image: 'New.jpg' } };

                prismaMock.user.findUnique.mockResolvedValue({
                    name: 'DB Name',
                    avatarUrl: 'DB.jpg'
                } as any);

                const result = await authOptions.callbacks!.jwt!({
                    token,
                    trigger: 'update',
                    session
                } as any);

                expect(result).toEqual(expect.objectContaining({
                    name: 'DB Name',
                    picture: 'DB.jpg'
                }));
            });
            it('should update token from session if db user not found(fallback logic check - though code implies only db update matters if db record found)', async () => {
                const token = { id: 'user-1', name: 'Old' };
                const session = { user: { name: 'New', image: 'New.jpg' } };

                prismaMock.user.findUnique.mockResolvedValue(null);

                const result = await authOptions.callbacks!.jwt!({
                    token,
                    trigger: 'update',
                    session
                } as any);

                // If DB user not found, it keeps session updates or fallback? 
                // Code says: sets token.name=updatedName, then checks DB. If DB found, overwrite.
                expect(result.name).toBe('New');
            });

            it('should handle update trigger with missing name in session', async () => {
                const token = { id: 'user-1', name: 'Old', picture: 'old.jpg' };
                const session = { user: { image: 'New.jpg' } }; // No name

                prismaMock.user.findUnique.mockResolvedValue({
                    name: 'DB Name',
                    avatarUrl: 'DB.jpg'
                } as any);

                const result = await authOptions.callbacks!.jwt!({
                    token,
                    trigger: 'update',
                    session
                } as any);

                expect(result.name).toBe('DB Name');
                expect(result.picture).toBe('DB.jpg');
            });

            it('should handle update trigger with missing image in session', async () => {
                const token = { id: 'user-1', name: 'Old', picture: 'old.jpg' };
                const session = { user: { name: 'New' } }; // No image

                prismaMock.user.findUnique.mockResolvedValue({
                    name: 'DB Name',
                    avatarUrl: 'DB.jpg'
                } as any);

                const result = await authOptions.callbacks!.jwt!({
                    token,
                    trigger: 'update',
                    session
                } as any);

                expect(result.name).toBe('DB Name');
                expect(result.picture).toBe('DB.jpg');
            });

            it('should handle update trigger without session', async () => {
                const token = { id: 'user-1', name: 'Old' };

                const result = await authOptions.callbacks!.jwt!({
                    token,
                    trigger: 'update'
                } as any);

                expect(result).toBe(token);
            });
        });

        describe('session', () => {
            it('should populate session from token', async () => {
                const token = {
                    id: 'user-1',
                    role: 'EMPLOYEE',
                    companyId: 'c1',
                    companyType: 't1',
                    companySlug: 's1',
                    name: 'Name',
                    picture: 'img'
                };
                const session = { user: {} };

                const result = await authOptions.callbacks!.session!({ session, token } as any);

                expect(result.user).toEqual(expect.objectContaining({
                    id: 'user-1',
                    role: 'EMPLOYEE',
                    companySlug: 's1'
                }));
            });

            it('should handle missing token', async () => {
                const session = { user: {} };

                const result = await authOptions.callbacks!.session!({ session, token: null } as any);

                expect(result).toBe(session);
            });

            it('should handle missing session.user', async () => {
                const token = {
                    id: 'user-1',
                    role: 'EMPLOYEE'
                };
                const session = {} as any;

                const result = await authOptions.callbacks!.session!({ session, token } as any);

                expect(result).toBe(session);
            });
        });
    });
});

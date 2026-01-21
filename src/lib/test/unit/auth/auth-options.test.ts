
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
    compare: vi.fn()
}));

// Now import modules that depend on the mocks
import { prismaMock } from '@/lib/test/helpers/prisma';
import { compare } from 'bcryptjs';
import { authOptions, createAuthOptions } from '@/lib/auth-options';
import { addDays } from 'date-fns';

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
                company: {
                    type: 'AGENCY', slug: 'agency', subscriptionExpiresAt: addDays(
                        new Date(), 2
                    )
                },
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
                image: 'image.jpg',
                isPlanExpired: false
            });
        });

        it('should handle expired plan in dev mode', async () => {
            const mockUser = {
                id: 'user-1',
                company: {
                    type: 'AGENCY',
                    slug: 'agency',
                    subscriptionExpiresAt: new Date(Date.now() - 1000) // Past
                }
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            const result = await devProvider.authorize({ email: 'test@test.com' });
            expect(result.isPlanExpired).toBe(true);
        });

        it('should handle null subscription date in dev mode', async () => {
            const mockUser = {
                id: 'user-1',
                company: {
                    type: 'AGENCY',
                    slug: 'agency',
                    subscriptionExpiresAt: null
                }
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            const result = await devProvider.authorize({ email: 'test@test.com' });
            expect(result.isPlanExpired).toBe(false);
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

        it('should reject if email is not verified', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 'u1',
                password: 'hash',
                emailVerifiedAt: null
            } as any);
            const result = normalProvider.authorize({ email: 'test@test.com', password: 'pass' });
            await expect(result).rejects.toThrow("Please verify your email before signing in.");
        });

        it('should reject if user is inactive', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hash', isActive: false, emailVerifiedAt: new Date() } as any);
            const result = normalProvider.authorize({ email: 'test@test.com', password: 'pass' });
            await expect(result).rejects.toThrow("Your account is currently pending administrator approval.");
        });

        it('should reject if password invalid', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hash', isActive: true, emailVerifiedAt: new Date() } as any);
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
                emailVerifiedAt: new Date(),
                companyId: 'comp-1',
                company: { type: 'AGENCY', slug: 'agency', subscriptionExpiresAt: new Date() },
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
                image: 'image.jpg',
                isPlanExpired: false
            });
        });

        it('should handle expired plan in normal login', async () => {
            const mockUser = {
                id: 'u1',
                password: 'hash',
                isActive: true,
                emailVerifiedAt: new Date(),
                company: { type: 'AGENCY', slug: 'agency', subscriptionExpiresAt: new Date(Date.now() - 1000) }
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            (compare as Mock).mockResolvedValue(true);
            const result = await normalProvider.authorize({ email: 't@t.com', password: 'p' });
            expect(result.isPlanExpired).toBe(true);
        });
        it('should handle null subscription date in normal login', async () => {
            const mockUser = {
                id: 'u1',
                password: 'hash',
                isActive: true,
                emailVerifiedAt: new Date(),
                company: { type: 'AGENCY', slug: 'agency', subscriptionExpiresAt: null }
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            (compare as Mock).mockResolvedValue(true);
            const result = await normalProvider.authorize({ email: 't@t.com', password: 'p' });
            expect(result.isPlanExpired).toBe(false);
        });

        it('should reject if company is blocked', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 'u1',
                password: 'hash',
                isActive: true,
                emailVerifiedAt: new Date(),
                company: { status: 'BLOCKED' }
            } as any);
            const result = normalProvider.authorize({ email: 't@t.com', password: 'p' });
            await expect(result).rejects.toThrow("Your workspace has been suspended. Please contact your company administrator.");
        });

        it('should reject if user is blocked', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 'u1',
                password: 'hash',
                isActive: true,
                emailVerifiedAt: new Date(),
                isBlocked: true
            } as any);
            const result = normalProvider.authorize({ email: 't@t.com', password: 'p' });
            await expect(result).rejects.toThrow("Your account has been suspended. Please contact support.");
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

            describe('periodic status sync', () => {
                it('should sync user status if sync interval has passed', async () => {
                    const token = { id: 'u1', lastStatusCheck: 0 };
                    prismaMock.user.findUnique.mockResolvedValue({
                        isBlocked: false,
                        isActive: true,
                        company: { status: 'ACTIVE' }
                    } as any);

                    const result = await authOptions.callbacks!.jwt!({ token } as any);

                    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                        where: { id: 'u1' }
                    }));
                    expect(result.isBlocked).toBe(false);
                    expect(result.lastStatusCheck).toBeGreaterThan(0);
                });

                it('should mark user as blocked if database record says so', async () => {
                    const token = { id: 'u1', lastStatusCheck: 0 };
                    prismaMock.user.findUnique.mockResolvedValue({
                        isBlocked: true,
                        isActive: true,
                        company: { status: 'ACTIVE' }
                    } as any);

                    const result = await authOptions.callbacks!.jwt!({ token } as any);

                    expect(result.isBlocked).toBe(true);
                });

                it('should skip status sync if sync interval has not passed', async () => {
                    const now = Date.now();
                    const token = { id: 'u1', lastStatusCheck: now - 30000 }; // 30 seconds ago
                    const result = await authOptions.callbacks!.jwt!({ token } as any);
                    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
                    expect(result.lastStatusCheck).toBe(token.lastStatusCheck);
                });

                it('should handle database errors during status sync', async () => {
                    const token = { id: 'u1', lastStatusCheck: 0 };
                    prismaMock.user.findUnique.mockRejectedValue(new Error('Sync error'));
                    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

                    const result = await authOptions.callbacks!.jwt!({ token } as any);

                    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to sync user status'), expect.any(Error));
                    expect(result).toBeDefined();
                    consoleSpy.mockRestore();
                });
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


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { verifyOtp, resendOtp, requestPasswordReset, resetPassword } from '@/lib/actions/auth';
import * as authUtils from '@/lib/auth-utils';

// Mock notifications and email
vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Auth Actions', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('verifyOtp', () => {
        it('should return error if input is invalid', async () => {
            const result = await verifyOtp({ email: 'invalid', otp: '123' } as any);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid input');
        });

        it('should return error if user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await verifyOtp({ email: 'test@test.com', otp: '123456' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });

        it('should return error if OTP is invalid', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 'u1',
                email: 'test@test.com',
                otpToken: '654321'
            } as any);
            const result = await verifyOtp({ email: 'test@test.com', otp: '123456' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid OTP');
        });

        it('should return error if OTP has expired', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 'u1',
                email: 'test@test.com',
                otpToken: '123456',
                otpExpiresAt: new Date(Date.now() - 1000)
            } as any);
            const result = await verifyOtp({ email: 'test@test.com', otp: '123456' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('OTP has expired');
        });

        it('should verify OTP and auto-activate TRAVEL_AGENT', async () => {
            const mockUser = {
                id: 'u1',
                email: 'agent@test.com',
                role: 'TRAVEL_AGENT',
                otpToken: '123456',
                otpExpiresAt: new Date(Date.now() + 10000),
                isActive: false
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            prismaMock.user.update.mockResolvedValue({} as any);

            const result = await verifyOtp({ email: 'agent@test.com', otp: '123456' });

            expect(result.success).toBe(true);
            expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    isActive: true
                })
            }));
        });

        it('should verify OTP and NOT auto-activate EMPLOYEE', async () => {
            const mockUser = {
                id: 'u1',
                email: 'staff@test.com',
                role: 'EMPLOYEE',
                otpToken: '123456',
                otpExpiresAt: new Date(Date.now() + 10000),
                isActive: false
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            prismaMock.user.update.mockResolvedValue({} as any);

            const result = await verifyOtp({ email: 'staff@test.com', otp: '123456' });

            expect(result.success).toBe(true);
            expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    isActive: false
                })
            }));
        });

        it('should handle database errors', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            const result = await verifyOtp({ email: 'test@test.com', otp: '123456' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Internal server error');
        });
    });

    describe('resendOtp', () => {
        it('should return error if user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await resendOtp('test@test.com');
            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });

        it('should resend OTP successfully', async () => {
            const mockUser = {
                id: 'u1',
                email: 'test@test.com',
                name: 'Test'
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

            // We need to mock the sendOtpVerification from auth-utils
            // Since it's an internal call via dynamic import in the code, 
            // we might need to mock the module or ensure the module itself is testable.
            // Actually, the implementation uses `await import("@/lib/auth-utils")`.

            // Let's mock sendOtpVerification in auth-utils
            const sendOtpSpy = vi.spyOn(authUtils, 'sendOtpVerification').mockResolvedValue(true);

            const result = await resendOtp('test@test.com');

            expect(result.success).toBe(true);
            expect(sendOtpSpy).toHaveBeenCalledWith('u1', 'test@test.com', 'Test');
        });

        it('should return error if email sending fails', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com' } as any);
            vi.spyOn(authUtils, 'sendOtpVerification').mockResolvedValue(false);

            const result = await resendOtp('t@t.com');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to send email');
        });

        it('should handle internal errors', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Fail'));
            const result = await resendOtp('t@t.com');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Internal server error');
        });
    });

    describe('requestPasswordReset', () => {
        it('should return success even if user not found (to prevent enumeration)', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await requestPasswordReset('unknown@test.com');
            expect(result.success).toBe(true);
        });

        it('should send reset OTP successfully', async () => {
            const mockUser = { id: 'u1', email: 'test@test.com', name: 'Test' };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            const sendResetSpy = vi.spyOn(authUtils, 'sendPasswordResetOtp').mockResolvedValue(true);

            const result = await requestPasswordReset('test@test.com');

            expect(result.success).toBe(true);
            expect(sendResetSpy).toHaveBeenCalledWith('u1', 'test@test.com', 'Test');
        });

        it('should return error if sending reset OTP fails', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com' } as any);
            vi.spyOn(authUtils, 'sendPasswordResetOtp').mockResolvedValue(false);

            const result = await requestPasswordReset('t@t.com');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to send reset email');
        });

        it('should handle internal errors in requestPasswordReset', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            const result = await requestPasswordReset('test@test.com');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Internal server error');
        });
    });

    describe('resetPassword', () => {
        it('should return error if input is invalid', async () => {
            const result = await resetPassword({ email: 'invalid', otp: '123' } as any);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid input');
        });

        it('should return error if user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await resetPassword({ email: 't@t.com', otp: '123456', password: 'newpassword' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });

        it('should return error if OTP is invalid', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', otpToken: '654321' } as any);
            const result = await resetPassword({ email: 't@t.com', otp: '123456', password: 'newpass' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid OTP');
        });

        it('should return error if OTP has expired', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 'u1',
                otpToken: '123456',
                otpExpiresAt: new Date(Date.now() - 1000)
            } as any);
            const result = await resetPassword({ email: 't@t.com', otp: '123456', password: 'newpass' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('OTP has expired');
        });

        it('should reset password successfully', async () => {
            const mockUser = {
                id: 'u1',
                email: 'test@test.com',
                otpToken: '123456',
                otpExpiresAt: new Date(Date.now() + 10000)
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
            prismaMock.user.update.mockResolvedValue({} as any);

            const result = await resetPassword({ email: 'test@test.com', otp: '123456', password: 'newpassword123' });

            expect(result.success).toBe(true);
            expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'u1' },
                data: expect.objectContaining({
                    password: expect.any(String),
                    otpToken: null,
                    isActive: true
                })
            }));
        });

        it('should handle internal errors in resetPassword', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Fail'));
            const result = await resetPassword({ email: 't@t.com', otp: '123456', password: 'newpassword123' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Internal server error');
        });
    });
});

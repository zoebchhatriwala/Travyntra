
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { generateOtp, sendOtpVerification, sendPasswordResetOtp } from '@/lib/auth-utils';
import * as emailModule from '@/lib/email';

vi.mock('@/lib/email', () => ({
    sendEmail: vi.fn(),
}));

describe('Auth Utils', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('generateOtp', () => {
        it('should generate a 6-digit string', () => {
            const otp = generateOtp();
            expect(otp).toHaveLength(6);
            expect(/^[0-9]+$/.test(otp)).toBe(true);
        });

        it('should be fairly random', () => {
            const otps = new Set();
            for (let i = 0; i < 100; i++) {
                otps.add(generateOtp());
            }
            // If we get 100 unique OTPs in 100 tries, it's good enough for this test
            expect(otps.size).toBeGreaterThan(95);
        });
    });

    describe('sendOtpVerification', () => {
        it('should update user and send email', async () => {
            prismaMock.user.update.mockResolvedValue({} as any);
            (emailModule.sendEmail as any).mockResolvedValue({ success: true });

            const result = await sendOtpVerification('u1', 'test@test.com', 'Test User');

            expect(result).toBe(true);
            expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'u1' },
                data: expect.objectContaining({
                    otpToken: expect.stringMatching(/^[0-9]{6}$/),
                    otpExpiresAt: expect.any(Date)
                })
            }));
            expect(emailModule.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'test@test.com',
                subject: 'Verify Your Email - Travyntra',
                html: expect.stringContaining('Test User')
            }));
        });

        it('should return false if update fails', async () => {
            prismaMock.user.update.mockRejectedValue(new Error('Update failed'));
            const result = await sendOtpVerification('u1', 'test@test.com', 'Test');
            expect(result).toBe(false);
        });

        it('should return false if email sending fails', async () => {
            prismaMock.user.update.mockResolvedValue({} as any);
            (emailModule.sendEmail as any).mockResolvedValue({ success: false });

            const result = await sendOtpVerification('u1', 'test@test.com', 'Test');
            expect(result).toBe(false);
        });
    });

    describe('sendPasswordResetOtp', () => {
        it('should update user with reset OTP and send reset email', async () => {
            prismaMock.user.update.mockResolvedValue({} as any);
            (emailModule.sendEmail as any).mockResolvedValue({ success: true });

            const result = await sendPasswordResetOtp('u1', 'test@test.com', 'Test User');

            expect(result).toBe(true);
            expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'u1' },
                data: expect.objectContaining({
                    otpToken: expect.stringMatching(/^[0-9]{6}$/),
                    otpExpiresAt: expect.any(Date)
                })
            }));
            expect(emailModule.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'test@test.com',
                subject: 'Reset Your Password - Travyntra',
                html: expect.stringContaining('Test User')
            }));
        });

        it('should return false if database update fails during reset', async () => {
            prismaMock.user.update.mockRejectedValue(new Error('Reset update failed'));
            const result = await sendPasswordResetOtp('u1', 'test@test.com', 'Test');
            expect(result).toBe(false);
        });
    });
});


import { describe, it, expect } from 'vitest';
import {
    wrapEmailTemplate,
    getGeneralNotificationTemplate,
    getDigestEmailTemplate,
    getStaffWelcomeTemplate,
    getOtpEmailTemplate,
    getPasswordResetTemplate
} from '@/lib/email-templates';

describe('Email Templates', () => {
    describe('wrapEmailTemplate', () => {
        it('should wrap content in a template', () => {
            const html = wrapEmailTemplate('Test Title', '<p>Test Content</p>');
            expect(html).toContain('Travyntra');
            expect(html).toContain('Test Title');
            expect(html).toContain('<p>Test Content</p>');
            expect(html).toContain(new Date().getFullYear().toString());
        });
    });

    describe('getGeneralNotificationTemplate', () => {
        it('should generate notification template without button', () => {
            const html = getGeneralNotificationTemplate('Title', 'Message');
            expect(html).toContain('Title');
            expect(html).toContain('Message');
            expect(html).not.toContain('<a href=');
        });
        it('should generate notification template with button', () => {
            const html = getGeneralNotificationTemplate('Title', 'Message', 'https://example.com', 'Click Me');
            expect(html).toContain('Title');
            expect(html).toContain('Message');
            expect(html).toContain('href="https://example.com"');
            expect(html).toContain('Click Me');
        });

        it('should use default action text if not provided', () => {
            const html = getGeneralNotificationTemplate('Title', 'Message', 'https://example.com');
            expect(html).toContain('View Details');
            expect(html).toContain('href="https://example.com"');
        });
    });

    describe('getDigestEmailTemplate', () => {
        it('should handle multiple notifications and approvals', () => {
            const html = getDigestEmailTemplate('User', 5, 3, 'https://dash.com');
            expect(html).toContain('5</span>');
            expect(html).toContain('3</span>');
            expect(html).toContain('href="https://dash.com"');
        });

        it('should handle single notification and approval (singular)', () => {
            const html = getDigestEmailTemplate('User', 1, 1, 'https://dash.com');
            expect(html).toContain('1</span>');
            expect(html).toContain('Unread notification</span>');
        });

        it('should handle caught up state', () => {
            const html = getDigestEmailTemplate('User', 0, 0, 'https://dash.com');
            expect(html).toContain('You are all caught up!');
        });
    });

    describe('getStaffWelcomeTemplate', () => {
        it('should generate welcome email with credentials', () => {
            const html = getStaffWelcomeTemplate('User', 'test@test.com', 'secret123', 'https://login.com');
            expect(html).toContain('Welcome to Travyntra');
            expect(html).toContain('test@test.com');
            expect(html).toContain('secret123');
            expect(html).toContain('href="https://login.com"');
        });
    });

    describe('getOtpEmailTemplate', () => {
        it('should generate OTP email', () => {
            const html = getOtpEmailTemplate('User', '123456');
            expect(html).toContain('Verify Your Account');
            expect(html).toContain('123456');
            expect(html).toContain('10 minutes');
        });
    });

    describe('getPasswordResetTemplate', () => {
        it('should generate password reset template', () => {
            const html = getPasswordResetTemplate('User', '123456');
            expect(html).toContain('Reset Your Password');
            expect(html).toContain('123456');
            expect(html).toContain('10 minutes');
        });
    });
});

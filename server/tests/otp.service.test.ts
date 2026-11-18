import { describe, it, expect } from 'vitest';
import { otpService } from '../src/services/otp.service.js';

describe('OtpService Tests', () => {
  it('should generate a 6-digit OTP', () => {
    const otp = otpService.generateOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should format Vietnamese phone numbers properly', () => {
    const res1 = otpService.formatPhoneNumber('0912345678');
    expect(res1.e164).toBe('+84912345678');
    expect(res1.national).toBe('0912345678');

    const res2 = otpService.formatPhoneNumber('+84987654321');
    expect(res2.e164).toBe('+84987654321');
    expect(res2.national).toBe('0987654321');

    const res3 = otpService.formatPhoneNumber('84901234567');
    expect(res3.e164).toBe('+84901234567');
    expect(res3.national).toBe('0901234567');
  });

  it('should mask targets for privacy', () => {
    const maskedEmail = otpService.maskTarget('nguyenvana@gmail.com', 'email');
    expect(maskedEmail).toBe('ngu***@gmail.com');

    const maskedPhone = otpService.maskTarget('0987654321', 'phone');
    expect(maskedPhone).toBe('098****321');
  });

  it('should request and verify OTP in mock/dev mode correctly', async () => {
    const testEmail = 'test_otp_user@example.com';
    const req = await otpService.requestOtp(testEmail, 'email');

    expect(req.success).toBe(true);
    expect(req.previewOtp).toBeDefined();
    expect(req.previewOtp).toHaveLength(6);

    // Verify with incorrect OTP should fail
    await expect(otpService.verifyOtp(testEmail, 'email', '000000')).rejects.toThrow();

    // Verify with correct OTP should succeed
    const ok = await otpService.verifyOtp(testEmail, 'email', req.previewOtp!);
    expect(ok).toBe(true);

    // Reusing the same OTP should fail as it was deleted
    await expect(otpService.verifyOtp(testEmail, 'email', req.previewOtp!)).rejects.toThrow();
  });
});


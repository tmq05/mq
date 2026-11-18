import crypto from 'crypto';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { cache } from '../config/redis.js';

export interface SendOtpResult {
  success: boolean;
  message: string;
  channel: 'email' | 'phone';
  targetMasked: string;
  previewOtp?: string;
  expiresIn: number;
}

export class OtpService {
  /**
   * Tạo mã OTP ngẫu nhiên 6 chữ số
   */
  generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Chuẩn hóa số điện thoại Việt Nam / quốc tế
   */
  formatPhoneNumber(phone: string): { e164: string; national: string } {
    const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
    let national = cleaned;
    let e164 = cleaned;

    if (cleaned.startsWith('+84')) {
      national = '0' + cleaned.slice(3);
      e164 = cleaned;
    } else if (cleaned.startsWith('84')) {
      national = '0' + cleaned.slice(2);
      e164 = '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      national = cleaned;
      e164 = '+84' + cleaned.slice(1);
    } else {
      national = '0' + cleaned;
      e164 = '+84' + cleaned;
    }

    return { e164, national };
  }

  /**
   * Làm mờ địa chỉ email hoặc số điện thoại để hiển thị bảo mật
   */
  maskTarget(target: string, channel: 'email' | 'phone'): string {
    if (channel === 'email') {
      const parts = target.split('@');
      if (parts.length < 2) return target;
      const user = parts[0];
      const domain = parts[1];
      const visible = user.slice(0, Math.min(3, user.length));
      return `${visible}***@${domain}`;
    } else {
      const { national } = this.formatPhoneNumber(target);
      if (national.length <= 4) return national;
      const first = national.slice(0, 3);
      const last = national.slice(-3);
      return `${first}****${last}`;
    }
  }

  /**
   * Gửi mã OTP qua Gmail SMTP
   */
  async sendGmailOtp(email: string, otp: string): Promise<{ sent: boolean; isMock: boolean }> {
    const isConfigured = Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);

    if (!isConfigured || env.NODE_ENV === 'test') {
      if (!isConfigured) {
        logger.warn(`⚠️ [OTP Gmail] Chưa cấu hình GMAIL_USER / GMAIL_APP_PASSWORD trong .env. Sử dụng chế độ thử nghiệm (Mock).`);
      }
      logger.info(`✉️ [Mã OTP Gmail] Gửi tới: ${email} -> Mã OTP: ${otp}`);
      return { sent: true, isMock: true };
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: env.GMAIL_USER,
          pass: env.GMAIL_APP_PASSWORD,
        },
      });

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0d0d11; color: #ffffff; border-radius: 16px; border: 1px solid #1f1f27;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: -1.5px; color: #ffffff;">mq</span>
            <p style="font-size: 12px; color: #8e8e93; margin: 4px 0 0;">Âm nhạc trực tuyến tối giản</p>
          </div>
          <div style="background: #16161c; border: 1px solid #23232d; border-radius: 12px; padding: 24px; text-align: center;">
            <h2 style="font-size: 18px; margin: 0 0 10px; font-weight: 600; color: #ffffff;">Mã xác thực OTP</h2>
            <p style="font-size: 13px; color: #a1a1a6; margin: 0 0 20px; line-height: 1.5;">
              Bạn vừa yêu cầu mã xác thực để đặt lại mật khẩu cho tài khoản <strong>${email}</strong>.
            </p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; padding: 14px 24px; background: #22222b; border-radius: 10px; display: inline-block; font-family: monospace;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #7c7c82; margin: 20px 0 0; line-height: 1.5;">
              Mã có hiệu lực trong vòng <strong>5 phút</strong>.<br/>
              Vì lý do an toàn, tuyệt đối không chia sẻ mã này cho bất kỳ ai.
            </p>
          </div>
          <p style="font-size: 11px; text-align: center; color: #52525a; margin-top: 24px;">
            Nếu bạn không thực hiện yêu cầu này, bạn có thể yên tâm bỏ qua email này.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: `"${env.GMAIL_FROM_NAME}" <${env.GMAIL_USER}>`,
        to: email,
        subject: `[mq] Mã xác thực OTP của bạn: ${otp}`,
        html: htmlContent,
      });

      logger.info(`✅ [OTP Gmail] Đã gửi mã OTP thành công tới: ${email}`);
      return { sent: true, isMock: false };
    } catch (err: any) {
      logger.error(`❌ [OTP Gmail] Lỗi khi gửi email: ${err.message}`);
      // Fallback to mock in dev if sending fails
      if (env.NODE_ENV === 'development') {
        logger.info(`✉️ [Mã OTP Gmail (Dev Fallback)] Gửi tới: ${email} -> Mã OTP: ${otp}`);
        return { sent: true, isMock: true };
      }
      throw new Error(`Không thể gửi email OTP: ${err.message}`);
    }
  }

  /**
   * Gửi mã OTP qua SMS (SpeedSMS / Twilio / Mock)
   */
  async sendSmsOtp(phone: string, otp: string): Promise<{ sent: boolean; isMock: boolean }> {
    const formatted = this.formatPhoneNumber(phone);
    const provider = env.SMS_PROVIDER;

    // Twilio
    if (provider === 'twilio' && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
        const params = new URLSearchParams();
        params.append('From', env.TWILIO_PHONE_NUMBER);
        params.append('To', formatted.e164);
        params.append('Body', `[mq] Ma xac thuc OTP cua ban la: ${otp}. Hieu luc trong 5 phut. Vui long khong chia se ma nay.`);

        const authHeader = 'Basic ' + Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
        await axios.post(url, params.toString(), {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        });

        logger.info(`✅ [OTP SMS Twilio] Đã gửi SMS tới ${formatted.e164}`);
        return { sent: true, isMock: false };
      } catch (err: any) {
        logger.error(`❌ [OTP SMS Twilio] Lỗi gửi SMS: ${err.response?.data?.message || err.message}`);
        if (env.NODE_ENV === 'development') {
          return { sent: true, isMock: true };
        }
        throw new Error(`Gửi tin nhắn SMS thất bại: ${err.message}`);
      }
    }

    // SpeedSMS
    if (provider === 'speedsms' && env.SPEEDSMS_API_KEY) {
      try {
        const url = 'https://api.speedsms.vn/index.php/sms/send';
        const payload = {
          to: [formatted.national],
          content: `[mq] Ma xac thuc OTP cua ban la ${otp}. Ma co hieu luc trong 5 phut.`,
          sms_type: 2,
          sender: env.SPEEDSMS_SENDER || '',
        };

        const authHeader = 'Basic ' + Buffer.from(`${env.SPEEDSMS_API_KEY}:x`).toString('base64');
        await axios.post(url, payload, {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        logger.info(`✅ [OTP SMS SpeedSMS] Đã gửi SMS tới ${formatted.national}`);
        return { sent: true, isMock: false };
      } catch (err: any) {
        logger.error(`❌ [OTP SMS SpeedSMS] Lỗi gửi SMS: ${err.response?.data?.message || err.message}`);
        if (env.NODE_ENV === 'development') {
          return { sent: true, isMock: true };
        }
        throw new Error(`Gửi tin nhắn SpeedSMS thất bại: ${err.message}`);
      }
    }

    // Mock Mode
    logger.warn(`⚠️ [OTP SMS] Provider '${provider}' chưa có API Key hoặc đang ở chế độ mock. Sử dụng mô phỏng tin nhắn SMS.`);
    logger.info(`📱 [Mã OTP SMS (Mock)] Gửi tới SĐT: ${phone} (${formatted.national}) -> Mã OTP: ${otp}`);
    return { sent: true, isMock: true };
  }

  /**
   * Tạo, lưu cache và gửi mã OTP đến người dùng
   */
  async requestOtp(target: string, channel: 'email' | 'phone'): Promise<SendOtpResult> {
    const normalizedTarget = channel === 'email' ? target.toLowerCase().trim() : this.formatPhoneNumber(target).national;

    // Rate-limiting: kiểm tra cooldown 60 giây
    const cooldownKey = `otp_cooldown:${channel}:${normalizedTarget}`;
    const cooldownExists = await cache.get(cooldownKey);
    if (cooldownExists) {
      throw new Error('Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP.');
    }

    // Sinh mã OTP 6 số
    const otp = this.generateOtp();

    // Lưu vào Cache (TTL 300s = 5 phút)
    const otpKey = `otp:${channel}:${normalizedTarget}`;
    await cache.set(
      otpKey,
      JSON.stringify({
        code: otp,
        attempts: 0,
        createdAt: Date.now(),
      }),
      'EX',
      300
    );

    // Kích hoạt cooldown 60 giây
    await cache.set(cooldownKey, '1', 'EX', 60);

    // Tiến hành gửi qua kênh tương ứng
    let sendStatus: { sent: boolean; isMock: boolean };
    if (channel === 'email') {
      sendStatus = await this.sendGmailOtp(normalizedTarget, otp);
    } else {
      sendStatus = await this.sendSmsOtp(normalizedTarget, otp);
    }

    const masked = this.maskTarget(normalizedTarget, channel);

    return {
      success: true,
      message: `Mã xác thực OTP đã được gửi thành công tới Gmail ${masked}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam).`,
      channel,
      targetMasked: masked,
      expiresIn: 300,
      previewOtp: (env.NODE_ENV === 'test' || Boolean(process.env.VITEST)) ? otp : undefined,
    };
  }

  /**
   * Xác minh mã OTP
   */
  async verifyOtp(
    target: string,
    channel: 'email' | 'phone',
    code: string,
    consume = true
  ): Promise<boolean> {
    const normalizedTarget = channel === 'email' ? target.toLowerCase().trim() : this.formatPhoneNumber(target).national;
    const otpKey = `otp:${channel}:${normalizedTarget}`;

    const raw = await cache.get(otpKey);
    if (!raw) {
      throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn (5 phút). Vui lòng yêu cầu mã mới.');
    }

    let data: { code: string; attempts: number };
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Dữ liệu xác thực không hợp lệ. Vui lòng thử lại.');
    }

    if (data.attempts >= 5) {
      await cache.del(otpKey);
      throw new Error('Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu mã mới.');
    }

    if (data.code !== code.trim()) {
      data.attempts += 1;
      await cache.set(otpKey, JSON.stringify(data), 'EX', 300);
      throw new Error(`Mã OTP không chính xác. Bạn còn ${5 - data.attempts} lần thử.`);
    }

    // Xóa mã OTP sau khi xác minh thành công để không tái sử dụng (khi consume = true)
    if (consume) {
      await cache.del(otpKey);
    }
    return true;
  }
}

export const otpService = new OtpService();


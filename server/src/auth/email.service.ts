import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tls from 'tls';

interface VerificationEmailInput {
  to: string;
  fullName: string;
  verificationUrl: string;
}

interface OtpEmailInput {
  to: string;
  fullName: string;
  otp: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendVerificationEmail(input: VerificationEmailInput) {
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const smtpPort = Number(this.configService.get<string>('SMTP_PORT', '465'));
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('EMAIL_FROM', smtpUser || 'celvinaviora@gmail.com');
    const subject = 'Verify your Celvina Viora account';

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h2 style="color:#374880">Verify your Celvina Viora account</h2>
        <p>Hello ${input.fullName},</p>
        <p>Welcome to Celvina Viora. Please verify your email address before logging in.</p>
        <p>
          <a href="${input.verificationUrl}" style="display:inline-block;background:#374880;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">
            Verify Email
          </a>
        </p>
        <p>This verification link expires in 24 hours.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `;

    if (!smtpUser || !smtpPass) {
      this.logger.warn(`Email delivery is not configured. Verification link for ${input.to}: ${input.verificationUrl}`);
      return { delivered: false, mode: 'log' as const };
    }

    await this.sendViaSmtp({
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
      from,
      to: input.to,
      subject,
      html,
    });
    this.logger.log(`Verification email sent to ${input.to} through ${smtpHost}`);
    return { delivered: true, mode: 'smtp' as const };
  }

  async sendVerificationOtp(input: OtpEmailInput) {
    const subject = 'Your Celvina Viora verification code';
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h2 style="color:#374880">Verify your Celvina Viora account</h2>
        <p>Hello ${input.fullName},</p>
        <p>Use this code to verify your email address:</p>
        <div style="font-size:28px;letter-spacing:8px;font-weight:800;background:#f3f4f6;color:#111827;padding:16px 20px;border-radius:10px;display:inline-block">
          ${input.otp}
        </div>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `;

    return this.sendMail({
      to: input.to,
      subject,
      html,
    });
  }

  async sendPasswordResetEmail(input: { to: string; fullName: string; resetUrl: string }) {
    const subject = 'Reset your Celvina Viora password';
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h2 style="color:#374880">Reset your Celvina Viora password</h2>
        <p>Hello ${input.fullName},</p>
        <p>Use the button below to reset your password. This link expires in 30 minutes.</p>
        <p>
          <a href="${input.resetUrl}" style="display:inline-block;background:#374880;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">
            Reset Password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    return this.sendMail({
      to: input.to,
      subject,
      html,
    });
  }

  private async sendMail(input: { to: string; subject: string; html: string }) {
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const smtpPort = Number(this.configService.get<string>('SMTP_PORT', '465'));
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('EMAIL_FROM', smtpUser || 'celvinaviora@gmail.com');

    if (!smtpUser || !smtpPass) {
      this.logger.warn(`Email delivery is not configured. Intended recipient: ${input.to}`);
      return { delivered: false, mode: 'log' as const };
    }

    await this.sendViaSmtp({
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    this.logger.log(`Email sent to ${input.to} through ${smtpHost}`);
    return { delivered: true, mode: 'smtp' as const };
  }

  private sendViaSmtp(payload: {
    host: string;
    port: number;
    username: string;
    password: string;
    from: string;
    to: string;
    subject: string;
    html: string;
  }) {
    return new Promise<void>((resolve, reject) => {
      const socket = tls.connect(payload.port, payload.host, { servername: payload.host }, () => {
        run().catch(reject);
      });
      socket.setEncoding('utf8');
      socket.setTimeout(20000);

      let buffer = '';
      const waitFor = (expectedCodes: string[]) => new Promise<string>((resolveWait, rejectWait) => {
        const onData = (chunk: string) => {
          buffer += chunk;
          const lines = buffer.split(/\r?\n/).filter(Boolean);
          const lastLine = lines[lines.length - 1];
          if (!lastLine || /^\d{3}-/.test(lastLine)) return;

          const code = lastLine.slice(0, 3);
          if (expectedCodes.includes(code)) {
            const response = buffer;
            buffer = '';
            socket.off('data', onData);
            resolveWait(response);
            return;
          }

          if (/^[45]\d{2}/.test(code)) {
            const response = buffer;
            buffer = '';
            socket.off('data', onData);
            socket.end();
            rejectWait(new Error(`SMTP command failed: ${response}`));
          }
        };
        socket.on('data', onData);
      });

      const command = async (line: string, expectedCodes: string[]) => {
        socket.write(`${line}\r\n`);
        return waitFor(expectedCodes);
      };

      const message = [
        `From: ${payload.from}`,
        `To: ${payload.to}`,
        `Subject: ${payload.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        payload.html,
      ].join('\r\n');

      const auth = Buffer.from(`\0${payload.username}\0${payload.password}`).toString('base64');

      const run = async () => {
        await waitFor(['220']);
        await command(`EHLO ${payload.host}`, ['250']);
        await command(`AUTH PLAIN ${auth}`, ['235']);
        await command(`MAIL FROM:<${this.extractEmail(payload.from)}>`, ['250']);
        await command(`RCPT TO:<${payload.to}>`, ['250', '251']);
        await command('DATA', ['354']);
        await command(`${message}\r\n.`, ['250']);
        await command('QUIT', ['221']);
        socket.end();
        resolve();
      };

      socket.on('error', reject);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('SMTP connection timed out'));
      });
    });
  }

  private extractEmail(value: string) {
    const match = value.match(/<([^>]+)>/);
    return match ? match[1] : value;
  }
}

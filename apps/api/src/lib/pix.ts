/**
 * Pix BACEN — gera payload EMV + QR Code (PNG base64) sem dependência de
 * provedor externo. Padrão: BR Code estático com txId e valor.
 *
 * Configuração via env: PIX_KEY, PIX_MERCHANT_NAME, PIX_MERCHANT_CITY.
 * Quando PIX_KEY ausente, `isConfigured` = false e callers devem fazer fallback.
 */
import QRCode from 'qrcode';
import { env } from '../config/env.js';

export interface PixPaymentRequest {
  amount: number;
  description?: string;
  /** Identificador da transação (max 25, alphanumeric). Default '***'. */
  txId?: string;
}

export interface PixPaymentResult {
  payload: string;
  qrCodeBase64: string;
  copyPaste: string;
}

class PixService {
  readonly isConfigured: boolean;
  private readonly merchantName: string;
  private readonly merchantCity: string;

  constructor() {
    this.isConfigured = Boolean(env.PIX_KEY);
    this.merchantName = sanitizeAscii(env.PIX_MERCHANT_NAME).slice(0, 25);
    this.merchantCity = sanitizeAscii(env.PIX_MERCHANT_CITY).slice(0, 15);
  }

  buildPayload(req: PixPaymentRequest): string {
    if (!env.PIX_KEY) {
      throw new Error('PIX_KEY não configurada');
    }

    const pixKeyField = tlv('01', env.PIX_KEY);
    const descField = req.description
      ? tlv('02', sanitizeDescription(req.description).slice(0, 72))
      : '';
    const merchantAccountInfo =
      tlv('00', 'BR.GOV.BCB.PIX') + pixKeyField + descField;

    const txId =
      (req.txId ?? '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

    const parts = [
      tlv('00', '01'),                            // Payload Format Indicator
      tlv('26', merchantAccountInfo),             // Merchant Account Info
      tlv('52', '0000'),                          // Merchant Category Code
      tlv('53', '986'),                           // Currency (BRL)
      tlv('54', req.amount.toFixed(2)),           // Amount
      tlv('58', 'BR'),                            // Country
      tlv('59', this.merchantName),               // Merchant Name
      tlv('60', this.merchantCity),               // Merchant City
      tlv('62', tlv('05', txId)),                 // Additional Data (txId)
      '6304',                                     // CRC placeholder
    ];
    const withoutCrc = parts.join('');
    return withoutCrc + crc16(withoutCrc);
  }

  async generate(req: PixPaymentRequest): Promise<PixPaymentResult> {
    if (!this.isConfigured) {
      throw new Error('Pix não configurado. Defina PIX_KEY no .env');
    }
    const payload = this.buildPayload(req);
    const qrCodeBase64 = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 4,
    });
    return { payload, qrCodeBase64, copyPaste: payload };
  }
}

export const pixService = new PixService();

// ── helpers ──────────────────────────────────────────────────────────────

function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function sanitizeAscii(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase();
}

function sanitizeDescription(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '');
}

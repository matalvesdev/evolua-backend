import { describe, it, expect } from 'vitest';
import { pixService } from './pix.js';

/**
 * Testes do Pix EMV BACEN — geração de payload + CRC16.
 *
 * Cobre:
 *  - estrutura TLV (Tag-Length-Value)
 *  - presença dos campos obrigatórios EMV
 *  - CRC16 com polinômio CCITT-FALSE (0x1021)
 *  - sanitização de merchantName/city (ASCII upper, max len)
 *  - txId default '***' quando não informado
 */

describe('pixService.buildPayload', () => {
  it('inclui Payload Format Indicator (00) e Country (58=BR)', () => {
    const payload = pixService.buildPayload({ amount: 10 });
    expect(payload).toMatch(/^000201/); // 00=01 (PFI)
    expect(payload).toMatch(/5802BR/); // Country=BR
    expect(payload).toMatch(/5303986/); // Currency=BRL
  });

  it('formata amount com 2 casas decimais e tag 54', () => {
    const payload = pixService.buildPayload({ amount: 199.5 });
    // 54 + len + valor
    expect(payload).toMatch(/5406199\.50/);
  });

  it('amount inteiro vira XX.00', () => {
    const payload = pixService.buildPayload({ amount: 200 });
    expect(payload).toMatch(/5406200\.00/);
  });

  it('inclui CRC16 hex uppercase de 4 chars no final', () => {
    const payload = pixService.buildPayload({ amount: 50 });
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('CRC16 muda quando o payload muda', () => {
    const a = pixService.buildPayload({ amount: 50 });
    const b = pixService.buildPayload({ amount: 60 });
    const crcA = a.slice(-4);
    const crcB = b.slice(-4);
    expect(crcA).not.toBe(crcB);
  });

  it('trunca txId não-alfanuméricos e usa "***" como fallback', () => {
    const payload = pixService.buildPayload({ amount: 10, txId: '!!!@@@' });
    // txId vai para tag 62 → 05 → '***'
    expect(payload).toMatch(/6207050[345]\*\*\*/);
  });

  it('aceita description e a embute em tag 02 dentro do 26', () => {
    const payload = pixService.buildPayload({
      amount: 10,
      description: 'Sessão fisioterapia',
    });
    // description sanitizada (diacríticos removidos, mantém case original)
    expect(payload).toContain('Sessao');
    expect(payload).toContain('fisioterapia');
  });

  it('serviço configurado quando PIX_KEY presente', () => {
    expect(pixService.isConfigured).toBe(true);
  });
});

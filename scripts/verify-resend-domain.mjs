import { Resend } from 'resend';

const resend = new Resend('re_YWg2Hxy4_2dycYM4JzNWeRx7uRdjiP4PV');

try {
  const domainId = 'dec09a12-ab31-467f-80b3-2ed97ad34c13';
  const domain = await resend.domains.get(domainId);
  console.log('Domain:', JSON.stringify(domain, null, 2));
} catch (e) {
  console.error('Error:', e);
}

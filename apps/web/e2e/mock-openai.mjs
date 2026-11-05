// Minimal stand-in for the OpenAI Responses API used ONLY by end-to-end tests.
// It returns a fixed, fictional extraction so the upload → review → analysis
// flow can be tested without a real API key. Never used in production.
import http from 'node:http';

const extraction = {
  isEnergyBill: true,
  energyType: 'electricity',
  supplier: 'E2E Test Énergie',
  contractName: 'Offre Test Fixe',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  issueDate: '2026-09-05',
  consumption: 310,
  consumptionUnit: 'kWh',
  gasConversionFactor: null,
  readingType: 'estimated',
  lines: [
    { label: 'Abonnement', category: 'subscription', timeBand: null, quantity: 1, quantityUnit: 'mois', unitPrice: 15.5, amount: 15.5 },
    { label: 'Consommation Base', category: 'energy', timeBand: 'base', quantity: 310, quantityUnit: 'kWh', unitPrice: 0.2, amount: 65 },
    { label: 'TVA', category: 'vat', timeBand: null, quantity: null, quantityUnit: null, unitPrice: null, amount: 16.1 },
  ],
  totalAmount: 96.6,
  amountDue: 12.4,
  currency: 'EUR',
  meterReference: '12345678901234',
  notes: ['Fictional end-to-end test document.'],
  uncertainFields: ['contractName'],
};

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/responses') {
    let size = 0;
    req.on('data', (c) => (size += c.length));
    req.on('end', () => {
      if (req.headers.authorization !== 'Bearer test-key') {
        res.writeHead(401).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(extraction) }] }] }));
    });
    return;
  }
  res.writeHead(200).end('mock-openai ok');
});
server.listen(4010, '127.0.0.1', () => console.log('mock-openai listening on 4010'));

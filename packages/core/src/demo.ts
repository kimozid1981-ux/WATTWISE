import { addDays, monthBounds } from './calc/dates';
import { round } from './calc/numbers';
import type { StoredBill } from './bills/schema';
import type { CountryConfig } from './countries/types';

/**
 * DEMO household data. Entirely fictional: the supplier name contains "DEMO",
 * every bill has origin "demo", and the UI shows a DEMO badge wherever these
 * figures appear. The prices are round illustrative numbers, not market data.
 */
export function demoBills(country: CountryConfig, endDate: string): StoredBill[] {
  const bills: StoredBill[] = [];
  // Seasonal profile for a fictional electrically-heated flat (kWh per day), oldest first.
  const dailyKwh = [14.2, 11.8, 8.1, 6.4, 6.0, 7.2, 9.9, 13.5, 15.1, 13.0, 9.2, 7.0];
  const lastMonthEnd = monthBounds(endDate).start;
  let end = addDays(lastMonthEnd, -1);
  const months: Array<{ start: string; end: string }> = [];
  for (let i = 0; i < 12; i++) {
    const b = monthBounds(end);
    months.unshift(b);
    end = addDays(b.start, -1);
  }
  const unitPrice = 0.2;
  const subscriptionPerMonth = 15;
  months.forEach((m, i) => {
    const days = Number(m.end.slice(8, 10));
    const kwh = round(dailyKwh[i]! * days, 0);
    const energy = round(kwh * unitPrice, 2);
    const vat = round((energy + subscriptionPerMonth) * 0.2, 2);
    bills.push({
      id: `demo-${country.code}-${m.start.slice(0, 7)}`,
      origin: 'demo',
      confirmedAt: `${m.end}T12:00:00.000Z`,
      data: {
        energyType: 'electricity',
        supplier: 'DEMO Energy',
        contractName: 'DEMO fixed price',
        periodStart: m.start,
        periodEnd: m.end,
        issueDate: addDays(m.end, 3),
        consumption: kwh,
        consumptionUnit: 'kWh',
        gasConversionFactor: null,
        readingType: i % 4 === 3 ? 'estimated' : 'actual',
        lines: [
          { label: 'DEMO subscription', category: 'subscription', timeBand: null, quantity: 1, quantityUnit: 'month', unitPrice: subscriptionPerMonth, amount: subscriptionPerMonth },
          { label: 'DEMO energy', category: 'energy', timeBand: 'base', quantity: kwh, quantityUnit: 'kWh', unitPrice, amount: energy },
          { label: 'DEMO VAT', category: 'vat', timeBand: null, quantity: null, quantityUnit: null, unitPrice: null, amount: vat },
        ],
        totalAmount: round(energy + subscriptionPerMonth + vat, 2),
        amountDue: null,
        currency: country.currency,
        meterReference: null,
      },
    });
  });
  return bills;
}

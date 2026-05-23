import { db } from '../server/db';
import { services } from '../shared/schema';
import { asc } from 'drizzle-orm';

async function main() {
  const all = await db.select({ id: services.id, name: services.name, pricingType: services.pricingType }).from(services).orderBy(asc(services.id));
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

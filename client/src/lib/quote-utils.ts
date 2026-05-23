export interface QuoteLineItem {
  activity?: string;
  hours: number;
  rate: number;
}

export interface QuotePersonnel {
  role: string;
  hourlyRate: number;
  quantity: number;
}

export interface QuoteEquipment {
  name: string;
  hourlyRate: number;
  included: boolean;
  quantity: number;
}

export interface QuoteExpense {
  name: string;
  cost: number;
  expenseType: string;
}

export interface QuoteData {
  timeEstimates: QuoteLineItem[];
  personnel: QuotePersonnel[];
  equipment: QuoteEquipment[];
  expenses: QuoteExpense[];
  thirdPartyProducts: QuoteExpense[];
}

export function calculateTotal(data: QuoteData): number {
  const timeTotal = data.timeEstimates.reduce(
    (sum, item) => sum + item.hours * item.rate,
    0
  );

  const personnelTotal = data.personnel.reduce((sum, person) => {
    if (person.role === "Pilot in Command") return sum;
    return sum + person.hourlyRate * person.quantity;
  }, 0);

  const equipmentTotal = data.equipment.reduce(
    (sum, equip) => sum + (equip.included ? equip.hourlyRate : 0),
    0
  );

  const expensesTotal = data.expenses.reduce((sum, exp) => sum + exp.cost, 0);

  const thirdPartyTotal = data.thirdPartyProducts.reduce(
    (sum, product) => sum + product.cost,
    0
  );

  return timeTotal + personnelTotal + equipmentTotal + expensesTotal + thirdPartyTotal;
}

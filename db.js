(function (global) {
  const STORAGE_KEY = 'erp_pocket_v2_plus_state';
  const HISTORY_KEY = 'erp_pocket_v2_plus_history';
  const MAX_HISTORY = 25;

  const EXPENSE_GROUPS = {
    Administrativos: ['Sueldos administrativos', 'Papelería', 'Servicios profesionales', 'Capacitación', 'Limpieza', 'Alquiler', 'Depreciación', 'Amortización', 'Otros'],
    Ventas: ['Publicidad', 'Marketing', 'Distribución', 'Comisiones', 'Viáticos', 'Combustible', 'Telefonía', 'Internet', 'Otros'],
    Financieros: ['Intereses', 'Comisiones bancarias', 'Multas', 'Otros'],
    Producción: ['Sueldos de producción', 'Horas extra', 'Bonos', 'Mantenimiento', 'Energía', 'Agua', 'Seguros', 'Supervisión', 'Otros'],
    CIF: ['Energía', 'Agua', 'Internet', 'Telefonía', 'Alquiler', 'Seguros', 'Depreciación', 'Amortización', 'Mantenimiento', 'Limpieza', 'Capacitación', 'Viáticos', 'Combustible', 'Tributos', 'Arbitrios', 'SUNAT', 'Otros'],
    MOD: ['Sueldos producción', 'Horas extra', 'Bonos', 'Otros'],
    MD: ['Materia prima directa', 'Insumos directos', 'Otros'],
    Logística: ['Flete', 'Distribución', 'Almacenaje', 'Combustible', 'Peajes', 'Otros'],
    Distribución: ['Despacho', 'Flete', 'Comisiones', 'Otros'],
    Publicidad: ['Digital', 'Radio', 'Prensa', 'BTL', 'Otros'],
    Marketing: ['Campañas', 'Diseño', 'Branding', 'Otros'],
    Donaciones: ['Donación', 'Apoyo social', 'Otros'],
    Tributos: ['IGV', 'Renta', 'Arbitrios', 'SUNAT', 'Otros'],
    Energía: ['Electricidad', 'Gas', 'Combustible', 'Otros'],
    Servicios: ['Agua', 'Internet', 'Telefonía', 'Luz', 'Otros']
  };

  const PRODUCT_TYPES = [
    'Mercadería',
    'Materia Prima Directa',
    'Materia Prima Indirecta',
    'Producto en Proceso',
    'Producto Terminado',
    'Suministro',
    'Activo',
    'Servicio'
  ];

  const MOVEMENT_TYPES = ['purchase', 'sale', 'loss', 'production', 'expense', 'adjustment'];

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    companyName: 'ERP Pocket Demo SAC',
    currency: 'PEN',
    taxRate: 0.18,
    lowStockDays: 90,
    lowMarginPct: 5,
    capitalThresholdPct: 60,
    lastTab: 'dashboard'
  };

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }
  function uid(prefix = 'ID') {
    return `${prefix}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  }
  function money(n) {
    const value = Number.isFinite(Number(n)) ? Number(n) : 0;
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(value);
  }
  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function safeText(v) {
    return String(v ?? '').trim();
  }
  function sortByDate(a, b) {
    const ad = `${a.date || ''}T${a.time || '00:00:00'}`;
    const bd = `${b.date || ''}T${b.time || '00:00:00'}`;
    if (ad === bd) return (a.createdAt || '').localeCompare(b.createdAt || '');
    return ad.localeCompare(bd);
  }
  function daysBetween(dateA, dateB) {
    const a = new Date(dateA);
    const b = new Date(dateB);
    const diff = Math.abs(b - a);
    return Math.floor(diff / 86400000);
  }
  function monthIndex(date) {
    return new Date(date || todayISO()).getMonth();
  }
  function emptyProduct(p = {}) {
    return {
      id: p.id || uid('PRD'),
      code: safeText(p.code),
      name: safeText(p.name),
      description: safeText(p.description),
      unitDescription: safeText(p.unitDescription),
      type: p.type || 'Mercadería',
      category: safeText(p.category || p.type || 'Mercadería'),
      costUnit: num(p.costUnit),
      salePriceNoTax: num(p.salePriceNoTax),
      salePriceTax: num(p.salePriceTax),
      stock: num(p.stock),
      minStock: num(p.minStock),
      maxStock: num(p.maxStock),
      supplier: safeText(p.supplier),
      observations: safeText(p.observations),
      createdAt: p.createdAt || todayISO(),
      updatedAt: p.updatedAt || todayISO(),
      currentStock: num(p.currentStock ?? p.stock),
      currentAvgCost: num(p.currentAvgCost ?? p.costUnit),
      currentValue: num(p.currentValue ?? (num(p.stock) * num(p.costUnit))),
      lastMovementAt: p.lastMovementAt || null
    };
  }
  function emptyRecipe(r = {}) {
    return {
      id: r.id || uid('RCP'),
      finishedProductId: r.finishedProductId || '',
      name: safeText(r.name),
      timeEstimated: safeText(r.timeEstimated),
      modCost: num(r.modCost),
      cifCost: num(r.cifCost),
      notes: safeText(r.notes),
      items: Array.isArray(r.items) ? r.items.map(it => ({
        productId: it.productId || '',
        qtyRequired: num(it.qtyRequired)
      })) : [],
      createdAt: r.createdAt || todayISO(),
      updatedAt: r.updatedAt || todayISO()
    };
  }
  function emptyState() {
    return {
      settings: clone(DEFAULT_SETTINGS),
      products: [],
      recipes: [],
      operations: [],
      expenses: [],
      history: [],
      ui: { search: '', category: '', dateFrom: '', dateTo: '' }
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : emptyState();
      const merged = {
        ...emptyState(),
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed?.settings || {}) },
        ui: { ...emptyState().ui, ...(parsed?.ui || {}) }
      };
      merged.products = Array.isArray(merged.products) ? merged.products.map(emptyProduct) : [];
      merged.recipes = Array.isArray(merged.recipes) ? merged.recipes.map(emptyRecipe) : [];
      merged.operations = Array.isArray(merged.operations) ? merged.operations : [];
      merged.expenses = Array.isArray(merged.expenses) ? merged.expenses : [];
      merged.history = Array.isArray(merged.history) ? merged.history : [];
      return merged;
    } catch (err) {
      return emptyState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function pushHistory() {
    const snapshot = clone(state);
    state.history.push(snapshot);
    if (state.history.length > MAX_HISTORY) state.history.shift();
    saveState();
  }

  function undo() {
    if (!state.history.length) return false;
    state = state.history.pop();
    state.products = state.products.map(emptyProduct);
    state.recipes = state.recipes.map(emptyRecipe);
    saveState();
    return true;
  }

  function resetState() {
    state = emptyState();
    saveState();
    return state;
  }

  function getState() {
    return state;
  }

  function setSetting(key, value) {
    state.settings[key] = value;
    saveState();
  }

  function normalizeDate(date) {
    return date ? String(date).slice(0, 10) : todayISO();
  }

  function addProduct(product, snapshot = true) {
    if (snapshot) pushHistory();
    const item = emptyProduct(product);
    if (!item.name) throw new Error('El producto necesita un nombre.');
    state.products.push(item);
    saveState();
    return item;
  }

  function updateProduct(id, data) {
    pushHistory();
    const idx = state.products.findIndex(p => p.id === id);
    if (idx < 0) throw new Error('Producto no encontrado.');
    state.products[idx] = emptyProduct({ ...state.products[idx], ...data, id });
    state.products[idx].updatedAt = todayISO();
    saveState();
    return state.products[idx];
  }

  function duplicateProduct(id) {
    pushHistory();
    const p = state.products.find(x => x.id === id);
    if (!p) throw new Error('Producto no encontrado.');
    const copy = emptyProduct({ ...clone(p), id: uid('PRD'), code: `${p.code || 'DUP'}-COPY`, name: `${p.name} (copia)` });
    copy.createdAt = todayISO();
    copy.updatedAt = todayISO();
    state.products.push(copy);
    saveState();
    return copy;
  }

  function removeProduct(id) {
    pushHistory();
    state.products = state.products.filter(p => p.id !== id);
    state.operations = state.operations.filter(op => {
      if (op.kind === 'production') return op.outputProductId !== id && !((op.inputs || []).some(i => i.productId === id));
      return op.productId !== id;
    });
    state.expenses = state.expenses.filter(e => e.productId !== id);
    state.recipes = state.recipes.filter(r => r.finishedProductId !== id && !(r.items || []).some(i => i.productId === id));
    saveState();
  }

  function addRecipe(recipe) {
    pushHistory();
    const rec = emptyRecipe(recipe);
    if (!rec.finishedProductId) throw new Error('La receta necesita un producto terminado.');
    if (!rec.items.length) throw new Error('Agrega al menos una materia prima.');
    state.recipes.push(rec);
    saveState();
    return rec;
  }

  function updateRecipe(id, data) {
    pushHistory();
    const idx = state.recipes.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('Receta no encontrada.');
    state.recipes[idx] = emptyRecipe({ ...state.recipes[idx], ...data, id });
    state.recipes[idx].updatedAt = todayISO();
    saveState();
    return state.recipes[idx];
  }

  function removeRecipe(id) {
    pushHistory();
    state.recipes = state.recipes.filter(r => r.id !== id);
    saveState();
  }

  function createOperation(op) {
    return {
      id: op.id || uid('OP'),
      kind: op.kind,
      date: normalizeDate(op.date),
      time: op.time || new Date().toTimeString().slice(0, 8),
      createdAt: op.createdAt || new Date().toISOString(),
      updatedAt: op.updatedAt || new Date().toISOString(),
      document: safeText(op.document),
      provider: safeText(op.provider),
      customer: safeText(op.customer),
      productId: op.productId || '',
      productName: safeText(op.productName),
      unit: safeText(op.unit),
      qty: num(op.qty),
      unitCost: num(op.unitCost),
      unitPrice: num(op.unitPrice),
      tax: num(op.tax),
      reason: safeText(op.reason),
      description: safeText(op.description),
      responsible: safeText(op.responsible),
      purchaseType: safeText(op.purchaseType),
      group: safeText(op.group),
      subgroup: safeText(op.subgroup),
      note: safeText(op.note),
      recipeId: op.recipeId || '',
      finishedProductId: op.finishedProductId || '',
      inputs: Array.isArray(op.inputs) ? op.inputs.map(i => ({ productId: i.productId || '', qtyRequired: num(i.qtyRequired) })) : [],
      modCost: num(op.modCost),
      cifCost: num(op.cifCost),
      totalCost: num(op.totalCost),
      stockAfter: num(op.stockAfter),
      avgAfter: num(op.avgAfter),
      valueAfter: num(op.valueAfter),
      cogs: num(op.cogs)
    };
  }

  function addOperation(op, snapshot = true) {
    if (snapshot) pushHistory();
    const item = createOperation(op);
    if (!MOVEMENT_TYPES.includes(item.kind)) throw new Error('Tipo de movimiento inválido.');
    state.operations.push(item);
    saveState();
    return item;
  }

  function updateOperation(id, data) {
    pushHistory();
    const idx = state.operations.findIndex(op => op.id === id);
    if (idx < 0) throw new Error('Movimiento no encontrado.');
    state.operations[idx] = createOperation({ ...state.operations[idx], ...data, id });
    state.operations[idx].updatedAt = new Date().toISOString();
    saveState();
    return state.operations[idx];
  }

  function removeOperation(id) {
    pushHistory();
    state.operations = state.operations.filter(op => op.id !== id);
    saveState();
  }

  function duplicateOperation(id) {
    pushHistory();
    const op = state.operations.find(x => x.id === id);
    if (!op) throw new Error('Movimiento no encontrado.');
    const copy = createOperation({ ...clone(op), id: uid('OP'), date: todayISO(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    state.operations.push(copy);
    saveState();
    return copy;
  }

  function addExpense(exp, snapshot = true) {
    if (snapshot) pushHistory();
    const item = {
      id: exp.id || uid('EXP'),
      date: normalizeDate(exp.date),
      group: safeText(exp.group),
      subgroup: safeText(exp.subgroup),
      amount: num(exp.amount),
      document: safeText(exp.document),
      description: safeText(exp.description),
      responsible: safeText(exp.responsible),
      productId: exp.productId || '',
      createdAt: exp.createdAt || new Date().toISOString()
    };
    state.expenses.push(item);
    saveState();
    return item;
  }

  function updateExpense(id, data) {
    pushHistory();
    const idx = state.expenses.findIndex(e => e.id === id);
    if (idx < 0) throw new Error('Gasto no encontrado.');
    state.expenses[idx] = { ...state.expenses[idx], ...data, amount: num(data.amount ?? state.expenses[idx].amount), date: normalizeDate(data.date || state.expenses[idx].date) };
    saveState();
    return state.expenses[idx];
  }

  function removeExpense(id) {
    pushHistory();
    state.expenses = state.expenses.filter(e => e.id !== id);
    saveState();
  }

  function formatRowType(kind) {
    return ({
      purchase: 'Compra',
      sale: 'Venta',
      loss: 'Pérdida',
      production: 'Producción',
      expense: 'Gasto',
      adjustment: 'Ajuste'
    })[kind] || kind;
  }

  function productSnapshotMap() {
    const map = new Map();
    for (const p of state.products) {
      map.set(p.id, {
        ...clone(p),
        stock: num(p.stock ?? p.currentStock ?? 0),
        avgCost: num(p.costUnit ?? p.currentAvgCost ?? 0),
        value: num(p.currentValue ?? p.stock * p.costUnit),
        lastMovementAt: p.lastMovementAt || null,
        kardex: []
      });
    }
    return map;
  }

  function applyPurchase(prod, op, ledger) {
    const qty = num(op.qty);
    const cost = num(op.unitCost);
    const prevStock = prod.stock;
    const prevValue = prod.value;
    const newStock = prevStock + qty;
    const newValue = prevValue + qty * cost;
    const avg = newStock > 0 ? newValue / newStock : cost;
    prod.stock = newStock;
    prod.value = newValue;
    prod.avgCost = avg;
    prod.currentStock = newStock;
    prod.currentAvgCost = avg;
    prod.currentValue = newValue;
    prod.lastMovementAt = op.date;
    prod.costUnit = avg;
    ledger.push({
      id: op.id,
      date: op.date,
      kind: 'purchase',
      movement: 'Entrada',
      document: op.document,
      provider: op.provider,
      customer: '',
      productId: op.productId,
      productName: prod.name,
      qtyIn: qty,
      qtyOut: 0,
      unitCost: cost,
      avgCost: avg,
      balance: newStock,
      valueBalance: newValue,
      detail: op.note || op.purchaseType || 'Compra'
    });
    return qty * cost;
  }

  function applySaleLike(prod, op, ledger, label = 'sale') {
    const qty = num(op.qty);
    const prevStock = prod.stock;
    const avg = prod.avgCost || num(prod.costUnit) || 0;
    const cogs = qty * avg;
    const newStock = prevStock - qty;
    const newValue = prod.value - cogs;
    prod.stock = newStock;
    prod.value = newValue;
    prod.avgCost = newStock > 0 ? (newValue / newStock) : avg;
    prod.currentStock = newStock;
    prod.currentAvgCost = prod.avgCost;
    prod.currentValue = newValue;
    prod.lastMovementAt = op.date;
    ledger.push({
      id: op.id,
      date: op.date,
      kind: label,
      movement: label === 'sale' ? 'Salida' : 'Salida por pérdida',
      document: op.document,
      provider: op.provider,
      customer: op.customer,
      productId: op.productId,
      productName: prod.name,
      qtyIn: 0,
      qtyOut: qty,
      unitCost: avg,
      avgCost: prod.avgCost,
      balance: newStock,
      valueBalance: newValue,
      detail: op.reason || op.description || op.note || formatRowType(label),
      cogs
    });
    return cogs;
  }

  function applyProductionInput(prod, inputQty, op, ledger, sourceName) {
    const qty = num(inputQty);
    const avg = prod.avgCost || num(prod.costUnit) || 0;
    const cogs = qty * avg;
    const newStock = prod.stock - qty;
    const newValue = prod.value - cogs;
    prod.stock = newStock;
    prod.value = newValue;
    prod.avgCost = newStock > 0 ? (newValue / newStock) : avg;
    prod.currentStock = newStock;
    prod.currentAvgCost = prod.avgCost;
    prod.currentValue = newValue;
    prod.lastMovementAt = op.date;
    ledger.push({
      id: `${op.id}-${prod.id}-in`,
      date: op.date,
      kind: 'production_input',
      movement: 'Consumo producción',
      document: op.document || sourceName,
      provider: '',
      customer: '',
      productId: prod.id,
      productName: prod.name,
      qtyIn: 0,
      qtyOut: qty,
      unitCost: avg,
      avgCost: prod.avgCost,
      balance: newStock,
      valueBalance: newValue,
      detail: op.note || 'Consumo para producción',
      cogs
    });
    return cogs;
  }

  function applyProductionOutput(prod, qty, unitCost, op, ledger) {
    const q = num(qty);
    const cost = num(unitCost);
    const prevStock = prod.stock;
    const prevValue = prod.value;
    const newStock = prevStock + q;
    const newValue = prevValue + q * cost;
    const avg = newStock > 0 ? newValue / newStock : cost;
    prod.stock = newStock;
    prod.value = newValue;
    prod.avgCost = avg;
    prod.currentStock = newStock;
    prod.currentAvgCost = avg;
    prod.currentValue = newValue;
    prod.lastMovementAt = op.date;
    prod.costUnit = avg;
    ledger.push({
      id: `${op.id}-${prod.id}-out`,
      date: op.date,
      kind: 'production',
      movement: 'Ingreso producción',
      document: op.document || op.recipeId || 'PROD',
      provider: '',
      customer: '',
      productId: prod.id,
      productName: prod.name,
      qtyIn: q,
      qtyOut: 0,
      unitCost: cost,
      avgCost: avg,
      balance: newStock,
      valueBalance: newValue,
      detail: op.note || 'Producto terminado',
      cogs: q * cost
    });
    return q * cost;
  }

  function currentBalanceByProduct() {
    const products = productSnapshotMap();
    const ledger = [];
    const ops = [...state.operations].sort(sortByDate);

    for (const op of ops) {
      if (op.kind === 'purchase') {
        const prod = products.get(op.productId);
        if (!prod) continue;
        applyPurchase(prod, op, ledger);
      } else if (op.kind === 'sale') {
        const prod = products.get(op.productId);
        if (!prod) continue;
        applySaleLike(prod, op, ledger, 'sale');
      } else if (op.kind === 'loss') {
        const prod = products.get(op.productId);
        if (!prod) continue;
        applySaleLike(prod, op, ledger, 'loss');
      } else if (op.kind === 'production') {
        const recipe = state.recipes.find(r => r.id === op.recipeId);
        const outProd = products.get(op.finishedProductId || recipe?.finishedProductId || op.productId);
        if (!outProd || !recipe) continue;
        for (const input of (op.inputs || recipe.items || [])) {
          const prod = products.get(input.productId);
          if (!prod) continue;
          applyProductionInput(prod, num(input.qtyRequired) * num(op.qty), op, ledger, recipe.name || 'Producción');
        }
        const directCosts = num(op.modCost) + num(op.cifCost);
        let materialsCost = 0;
        for (const input of (op.inputs || recipe.items || [])) {
          const prod = products.get(input.productId);
          const avg = prod ? (prod.currentAvgCost || prod.avgCost || num(prod.costUnit) || 0) : 0;
          materialsCost += num(input.qtyRequired) * num(op.qty) * avg;
        }
        const totalCost = num(op.totalCost) || (materialsCost + directCosts);
        const unitCost = num(op.qty) > 0 ? totalCost / num(op.qty) : totalCost;
        applyProductionOutput(outProd, num(op.qty), unitCost, op, ledger);
      } else if (op.kind === 'adjustment') {
        const prod = products.get(op.productId);
        if (!prod) continue;
        const qty = num(op.qty);
        const prevStock = prod.stock;
        const prevValue = prod.value;
        const isIn = qty >= 0;
        const absQty = Math.abs(qty);
        if (isIn) {
          const cost = num(op.unitCost) || prod.avgCost;
          const newStock = prevStock + absQty;
          const newValue = prevValue + absQty * cost;
          const avg = newStock > 0 ? newValue / newStock : cost;
          prod.stock = newStock;
          prod.value = newValue;
          prod.avgCost = avg;
          prod.currentStock = newStock;
          prod.currentAvgCost = avg;
          prod.currentValue = newValue;
          ledger.push({
            id: op.id,
            date: op.date,
            kind: 'adjustment',
            movement: 'Ajuste entrada',
            document: op.document,
            provider: '',
            customer: '',
            productId: op.productId,
            productName: prod.name,
            qtyIn: absQty,
            qtyOut: 0,
            unitCost: cost,
            avgCost: avg,
            balance: newStock,
            valueBalance: newValue,
            detail: op.note || 'Ajuste manual'
          });
        } else {
          const cost = prod.avgCost || num(prod.costUnit) || 0;
          const newStock = prevStock - absQty;
          const newValue = prevValue - absQty * cost;
          const avg = newStock > 0 ? newValue / newStock : cost;
          prod.stock = newStock;
          prod.value = newValue;
          prod.avgCost = avg;
          prod.currentStock = newStock;
          prod.currentAvgCost = avg;
          prod.currentValue = newValue;
          ledger.push({
            id: op.id,
            date: op.date,
            kind: 'adjustment',
            movement: 'Ajuste salida',
            document: op.document,
            provider: '',
            customer: '',
            productId: op.productId,
            productName: prod.name,
            qtyIn: 0,
            qtyOut: absQty,
            unitCost: cost,
            avgCost: avg,
            balance: newStock,
            valueBalance: newValue,
            detail: op.note || 'Ajuste manual'
          });
        }
      }
    }

    const updatedProducts = Array.from(products.values()).map(p => ({
      ...p,
      stock: p.stock,
      costUnit: p.currentAvgCost || p.costUnit || 0,
      currentStock: p.stock,
      currentAvgCost: p.avgCost || p.currentAvgCost || 0,
      currentValue: p.value,
      lastMovementAt: p.lastMovementAt || null
    }));

    return { products: updatedProducts, kardex: ledger };
  }

  function operationsFiltered(filters = {}) {
    let items = [...state.operations].sort(sortByDate);
    if (filters.kind) items = items.filter(op => op.kind === filters.kind);
    if (filters.productId) items = items.filter(op => op.productId === filters.productId || op.finishedProductId === filters.productId);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(op => JSON.stringify(op).toLowerCase().includes(q));
    }
    if (filters.from) items = items.filter(op => op.date >= filters.from);
    if (filters.to) items = items.filter(op => op.date <= filters.to);
    return items;
  }

  function expenseFiltered(filters = {}) {
    let items = [...state.expenses].sort(sortByDate);
    if (filters.group) items = items.filter(e => e.group === filters.group);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(e => JSON.stringify(e).toLowerCase().includes(q));
    }
    if (filters.from) items = items.filter(e => e.date >= filters.from);
    if (filters.to) items = items.filter(e => e.date <= filters.to);
    return items;
  }

  function statement() {
    const { products, kardex } = currentBalanceByProduct();
    const sales = state.operations.filter(op => op.kind === 'sale');
    const purchases = state.operations.filter(op => op.kind === 'purchase');
    const losses = state.operations.filter(op => op.kind === 'loss');
    const production = state.operations.filter(op => op.kind === 'production');

    const ventas = sales.reduce((sum, op) => sum + num(op.qty) * num(op.unitPrice) + num(op.tax), 0);
    const devoluciones = state.operations.filter(op => op.kind === 'adjustment' && op.qty < 0).reduce((s, op) => s + Math.abs(num(op.qty)) * num(op.unitPrice), 0);
    const ventasNetas = ventas - devoluciones;
    const costoVentas = sales.reduce((sum, op) => {
      const row = kardex.find(r => r.id === op.id && r.kind === 'sale');
      return sum + (row ? num(row.cogs) : 0);
    }, 0);
    const utilidadBruta = ventasNetas - costoVentas;

    const expenses = {
      Administrativos: 0,
      Ventas: 0,
      Financieros: 0,
      Producción: 0,
      CIF: 0,
      MOD: 0,
      MD: 0,
      Logística: 0,
      Distribución: 0,
      Publicidad: 0,
      Marketing: 0,
      Donaciones: 0,
      Tributos: 0,
      Energía: 0,
      Servicios: 0,
      Otros: 0
    };
    for (const e of state.expenses) {
      if (Object.prototype.hasOwnProperty.call(expenses, e.group)) expenses[e.group] += num(e.amount);
      else expenses.Otros += num(e.amount);
    }

    const gastosAdministrativos = expenses.Administrativos;
    const gastosVenta = expenses.Ventas + expenses.Logística + expenses.Distribución + expenses.Publicidad + expenses.Marketing;
    const gastosFinancieros = expenses.Financieros;
    const otrosGastos = expenses.Donaciones + expenses.Tributos + expenses.Energía + expenses.Servicios + losses.reduce((s, op) => s + (op.cogs || 0), 0);
    const otrosIngresos = 0;
    const utilidadOperativa = utilidadBruta - gastosAdministrativos - gastosVenta - gastosFinancieros - otrosGastos + otrosIngresos;
    const impuestos = utilidadOperativa > 0 ? utilidadOperativa * num(state.settings.taxRate || 0) : 0;
    const utilidadNeta = utilidadOperativa - impuestos;

    const inventoryValue = products.reduce((sum, p) => sum + num(p.currentValue), 0);
    const capitalInvertido = inventoryValue + purchases.reduce((s, op) => s + num(op.qty) * num(op.unitCost) + num(op.tax), 0);
    const grossMargin = ventasNetas > 0 ? (utilidadBruta / ventasNetas) * 100 : 0;
    const netMargin = ventasNetas > 0 ? (utilidadNeta / ventasNetas) * 100 : 0;
    const avgInventory = products.length ? inventoryValue / products.length : inventoryValue;
    const rotation = inventoryValue > 0 ? costoVentas / inventoryValue : 0;
    const lowStock = products.filter(p => num(p.currentStock) <= num(p.minStock));
    const outStock = products.filter(p => num(p.currentStock) <= 0);
    const negativeStock = products.filter(p => num(p.currentStock) < 0);
    const noRotation = products.filter(p => !p.lastMovementAt || daysBetween(p.lastMovementAt, todayISO()) >= num(state.settings.lowStockDays || 90) && num(p.currentStock) > 0);

    const cashSimulated = ventasNetas - purchases.reduce((s, op) => s + num(op.qty) * num(op.unitCost) + num(op.tax), 0) - Object.values(expenses).reduce((a, b) => a + b, 0);
    const operationsCount = state.operations.length + state.expenses.length;
    const lossCount = losses.length;
    const producedCount = production.reduce((s, op) => s + num(op.qty), 0);
    const margins = { grossMargin, netMargin };
    const inventoryNegatives = negativeStock.length;

    return {
      ventas,
      devoluciones,
      ventasNetas,
      costoVentas,
      utilidadBruta,
      gastosAdministrativos,
      gastosVenta,
      gastosFinancieros,
      otrosGastos,
      otrosIngresos,
      utilidadOperativa,
      impuestos,
      utilidadNeta,
      inventoryValue,
      capitalInvertido,
      grossMargin,
      netMargin,
      rotation,
      cashSimulated,
      avgInventory,
      products,
      kardex,
      expenses,
      purchasesTotal: purchases.reduce((s, op) => s + num(op.qty) * num(op.unitCost) + num(op.tax), 0),
      salesCount: sales.length,
      purchaseCount: purchases.length,
      operationsCount,
      alertsCount: 0,
      lowStock,
      outStock,
      negativeStock,
      noRotation,
      lossCount,
      producedCount
    };
  }

  function alertSeverityForMessage(type) {
    return ({
      info: 'Información',
      warning: 'Advertencia',
      urgent: 'Urgente',
      critical: 'Crítica'
    })[type] || 'Información';
  }

  function computeAlerts(summary = statement()) {
    const alerts = [];
    const add = (type, title, message, meta = {}) => alerts.push({ id: uid('ALT'), type, title, message, meta });

    if (summary.lowStock.length) add('warning', 'Stock crítico', `${summary.lowStock.length} producto(s) están bajo el mínimo.`, { count: summary.lowStock.length });
    if (summary.outStock.length) add('critical', 'Productos agotados', `${summary.outStock.length} producto(s) no tienen stock.`, { count: summary.outStock.length });
    if (summary.negativeStock.length) add('critical', 'Inventario negativo', `${summary.negativeStock.length} producto(s) quedaron en negativo.`, { count: summary.negativeStock.length });
    if (summary.utilidadNeta < 0) add('critical', 'Utilidad negativa', `La utilidad neta es ${money(summary.utilidadNeta)}.`, {});
    if (summary.netMargin > 0 && summary.netMargin < num(state.settings.lowMarginPct || 5)) add('urgent', 'Rentabilidad baja', `Margen neto de ${summary.netMargin.toFixed(2)}%.`, {});
    if (summary.rotation > 0 && summary.rotation < 0.5) add('warning', 'Rotación lenta', 'El inventario rota muy poco frente al costo de ventas.', {});
    if (summary.noRotation.length) add('info', 'Sin rotación', `${summary.noRotation.length} producto(s) no se han movido en ${num(state.settings.lowStockDays || 90)} días.`, {});
    if (summary.cashSimulated < 0) add('critical', 'Liquidez simulada negativa', 'Las salidas superan a los ingresos simulados.', {});
    if (summary.inventoryValue > 0 && summary.ventasNetas > 0 && (summary.inventoryValue / summary.ventasNetas) * 100 > num(state.settings.capitalThresholdPct || 60)) add('warning', 'Capital inmovilizado', 'El inventario representa un porcentaje alto de las ventas.', {});
    if (summary.gastosAdministrativos + summary.gastosVenta + summary.gastosFinancieros > summary.ventasNetas * 0.7 && summary.ventasNetas > 0) add('urgent', 'Gastos excesivos', 'Los gastos ya se comen una parte importante de las ventas.', {});
    if (summary.purchasesTotal > summary.ventasNetas * 1.3 && summary.ventasNetas > 0) add('info', 'Compras elevadas', 'Las compras superan ampliamente a las ventas.', {});
    if (summary.lossCount > 0) add('warning', 'Pérdidas registradas', `${summary.lossCount} evento(s) de pérdida impactan el kardex y resultados.`, {});

    return alerts;
  }

  function dashboardChartsData() {
    const months = Array.from({ length: 12 }, (_, i) => ({
      label: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
      sales: 0,
      purchases: 0,
      expenses: 0,
      production: 0
    }));
    for (const op of state.operations) {
      const idx = monthIndex(op.date);
      if (!months[idx]) continue;
      if (op.kind === 'sale') months[idx].sales += num(op.qty) * num(op.unitPrice) + num(op.tax);
      if (op.kind === 'purchase') months[idx].purchases += num(op.qty) * num(op.unitCost) + num(op.tax);
      if (op.kind === 'production') months[idx].production += num(op.qty);
    }
    for (const e of state.expenses) {
      const idx = monthIndex(e.date);
      if (months[idx]) months[idx].expenses += num(e.amount);
    }
    return months;
  }

  function inventoryByType() {
    const groups = {};
    for (const p of state.products) {
      const key = p.type || 'Otros';
      groups[key] = (groups[key] || 0) + num(p.currentValue);
    }
    return Object.entries(groups).map(([label, value]) => ({ label, value }));
  }

  function expenseByGroup() {
    const groups = {};
    for (const e of state.expenses) {
      groups[e.group] = (groups[e.group] || 0) + num(e.amount);
    }
    return Object.entries(groups).map(([label, value]) => ({ label, value }));
  }

  function profitDistribution(summary = statement()) {
    const revenue = summary.ventasNetas || 1;
    const positiveUtility = Math.max(summary.utilidadNeta, 0);
    const negativeLoss = Math.abs(Math.min(summary.utilidadNeta, 0));
    const cost = summary.costoVentas;
    const expenses = summary.gastosAdministrativos + summary.gastosVenta + summary.gastosFinancieros + summary.otrosGastos + summary.impuestos;
    return [
      { label: 'Ventas', value: Math.max(revenue, 0), color: '#60a5fa' },
      { label: 'Costo de ventas', value: Math.max(cost, 0), color: '#22c55e' },
      { label: 'Gastos', value: Math.max(expenses, 0), color: '#f59e0b' },
      { label: 'Utilidad', value: positiveUtility, color: '#a78bfa' },
      { label: 'Pérdida', value: negativeLoss, color: '#ef4444' }
    ].filter(x => x.value > 0);
  }

  function publicAPI() {
    const summary = statement();
    const alerts = computeAlerts(summary);
    return {
      EXPENSE_GROUPS,
      PRODUCT_TYPES,
      MOVEMENT_TYPES,
      DEFAULT_SETTINGS,
      getState,
      saveState,
      resetState,
      setSetting,
      loadState,
      pushHistory,
      undo,
      uid,
      num,
      money,
      todayISO,
      addProduct,
      updateProduct,
      duplicateProduct,
      removeProduct,
      addRecipe,
      updateRecipe,
      removeRecipe,
      addOperation,
      updateOperation,
      duplicateOperation,
      removeOperation,
      addExpense,
      updateExpense,
      removeExpense,
      operationsFiltered,
      expenseFiltered,
      currentBalanceByProduct,
      statement,
      computeAlerts,
      dashboardChartsData,
      inventoryByType,
      expenseByGroup,
      profitDistribution,
      alertSeverityForMessage,
      formatRowType,
      normalizeDate
    };
  }

  global.ERP_DB = publicAPI();
})(window);

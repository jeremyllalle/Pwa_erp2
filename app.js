(function () {
  const DB = window.ERP_DB;
  const CH = window.ERP_Charts;
  const state = () => DB.getState();
  const $ = (id) => document.getElementById(id);

  const money = DB.money;
  const today = DB.todayISO();

  const ui = {
    editingProductId: null,
    editingOperationId: null,
    editingOperationKind: null,
    editingRecipeId: null,
    recipeItems: [],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    installPrompt: null,
    quickOpen: false,
    calendarDate: new Date()
  };

  const elements = {};
  const ids = [
    'companyName', 'themeToggle', 'btnInstall', 'btnDemo', 'btnUndo', 'btnHelp', 'btnCalendar', 'btnCalculator', 'btnQuick',
    'globalSearch', 'dateFrom', 'dateTo', 'categoryFilter', 'btnClearFilters',
    'kpiGrid', 'dashboardStats', 'alertsList',
    'chartSales', 'chartExpenses', 'chartInventory', 'chartProfit',
    'productSearch', 'productCategory', 'btnNewProduct', 'btnExportProducts', 'productTable',
    'kardexProduct', 'kardexFrom', 'kardexTo', 'btnExportKardex', 'btnRefreshKardex', 'kardexTable',
    'buyDate', 'buyType', 'buyProduct', 'buyProvider', 'buyDocument', 'buyQty', 'buyUnitCost', 'buyTax', 'buyNote', 'btnSaveBuy',
    'saleDate', 'saleProduct', 'saleCustomer', 'saleDocument', 'saleQty', 'saleUnitPrice', 'saleTax', 'saleNote', 'btnSaveSale',
    'lossDate', 'lossProduct', 'lossQty', 'lossReason', 'lossDescription', 'lossResponsible', 'btnSaveLoss',
    'expDate', 'expGroup', 'expSubgroup', 'expAmount', 'expDescription', 'expDocument', 'expResponsible', 'btnSaveExpense',
    'recipeProduct', 'recipeName', 'recipeTime', 'recipeMod', 'recipeCif', 'recipeNotes', 'recipeItems', 'btnAddRecipeItem', 'btnSaveRecipe',
    'produceRecipe', 'produceQty', 'produceDate', 'produceDocument', 'produceNote', 'btnRunProduction',
    'recipeTable', 'opTable',
    'statementList', 'reportTable', 'btnExportCSV', 'btnExportXLS', 'btnExportPDF',
    'productModal', 'productForm', 'btnSaveProduct', 'btnCancelProduct',
    'pCode', 'pName', 'pDescription', 'pUnitDescription', 'pType', 'pCategory', 'pCostUnit', 'pSaleNoTax', 'pSaleWithTax', 'pStock', 'pMinStock', 'pMaxStock', 'pSupplier', 'pObs',
    'opModal', 'opModalTitle', 'opModalBody', 'btnSaveOp', 'btnCancelOp', 'btnCloseOp',
    'calcModal', 'calcDisplay', 'calcKeys', 'btnCalcClose',
    'calendarModal', 'calendarTitle', 'calendarGrid', 'btnPrevMonth', 'btnNextMonth', 'btnCalClose',
    'helpModal', 'btnHelpClose',
    'toastContainer', 'splash', 'fab', 'fabMenu'
  ];
  ids.forEach(id => elements[id] = $(id));

  function qs(selector) {
    return document.querySelector(selector);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    DB.setSetting('theme', theme);
    elements.themeToggle.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
  }

  function toggleModal(el, show) {
    if (!el) return;
    el.classList.toggle('open', !!show);
    document.body.classList.toggle('modal-open', document.querySelectorAll('.modal.open').length > 0);
  }

  function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 220);
    }, 2800);
  }

  function formatBadge(kind) {
    const map = {
      info: 'badge info',
      warning: 'badge warning',
      urgent: 'badge urgent',
      critical: 'badge critical'
    };
    return map[kind] || 'badge info';
  }

  function renderKpis(summary) {
    const lowStockCount = summary.lowStock.length;
    const outStockCount = summary.outStock.length;
    const list = [
      ['Ventas Totales', money(summary.ventasNetas), 'Ingresos netos acumulados', 'positive'],
      ['Compras Totales', money(summary.purchasesTotal), 'Compras registradas', 'neutral'],
      ['Inventario Valorizado', money(summary.inventoryValue), 'Costo total de inventario', 'neutral'],
      ['Costo de Ventas', money(summary.costoVentas), 'Salida valorizada', 'neutral'],
      ['Utilidad Bruta', money(summary.utilidadBruta), 'Ventas menos costo', summary.utilidadBruta >= 0 ? 'positive' : 'negative'],
      ['Utilidad Operativa', money(summary.utilidadOperativa), 'Antes de impuestos', summary.utilidadOperativa >= 0 ? 'positive' : 'negative'],
      ['Utilidad Neta', money(summary.utilidadNeta), 'Resultado final', summary.utilidadNeta >= 0 ? 'positive' : 'negative'],
      ['Liquidez Simulada', money(summary.cashSimulated), 'Caja estimada', summary.cashSimulated >= 0 ? 'positive' : 'negative'],
      ['Capital Invertido', money(summary.capitalInvertido), 'Inventario + compras', 'neutral'],
      ['Margen de Utilidad', `${summary.netMargin.toFixed(1)}%`, 'Sobre ventas netas', summary.netMargin >= 0 ? 'positive' : 'negative'],
      ['Rotación de Inventarios', summary.rotation.toFixed(2), 'Veces aprox.', 'neutral'],
      ['Cantidad de Productos', String(summary.products.length), 'Catálogo total', 'neutral'],
      ['Cantidad de Operaciones', String(summary.operationsCount), 'Movimientos y gastos', 'neutral'],
      ['Alertas Activas', String(DB.computeAlerts(summary).length), 'Reglas detectadas', 'warning'],
      ['Stock Crítico', String(lowStockCount), 'Bajo mínimo', lowStockCount ? 'warning' : 'positive'],
      ['Productos Agotados', String(outStockCount), 'Sin unidades', outStockCount ? 'critical' : 'positive'],
      ['Producción Realizada', String(summary.producedCount), 'Unidades producidas', 'neutral'],
      ['Pérdidas de Inventario', String(summary.lossCount), 'Eventos registrados', summary.lossCount ? 'warning' : 'positive']
    ];

    elements.kpiGrid.innerHTML = list.map(([title, value, note, tone]) => `
      <article class="kpi-card ${tone}">
        <div class="kpi-head">
          <div>
            <div class="kpi-title">${title}</div>
            <div class="kpi-value">${value}</div>
          </div>
          <span class="kpi-tone">${tone === 'positive' ? 'OK' : tone === 'negative' ? 'Atención' : tone === 'critical' ? 'Crítico' : tone === 'warning' ? 'Revisar' : 'Auto'}</span>
        </div>
        <div class="kpi-note">${note}</div>
      </article>
    `).join('');
  }

  function renderDashboard(summary) {
    const alerts = DB.computeAlerts(summary);
    elements.dashboardStats.innerHTML = [
      ['Ventas', money(summary.ventasNetas)],
      ['Compras', money(summary.purchasesTotal)],
      ['Costos CIF', money(summary.expenses.CIF)],
      ['Costo de ventas', money(summary.costoVentas)],
      ['Gastos operativos', money(summary.gastosAdministrativos + summary.gastosVenta + summary.gastosFinancieros + summary.otrosGastos)],
      ['Utilidad neta', money(summary.utilidadNeta)],
      ['Rotación', summary.rotation.toFixed(2)],
      ['Liquidez', money(summary.cashSimulated)]
    ].map(([label, value]) => `
      <div class="mini-stat">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `).join('');

    elements.alertsList.innerHTML = alerts.length ? alerts.map(a => `
      <div class="alert-card ${a.type}">
        <div class="alert-top">
          <strong>${a.title}</strong>
          <span class="${formatBadge(a.type)}">${DB.alertSeverityForMessage(a.type)}</span>
        </div>
        <p>${a.message}</p>
      </div>
    `).join('') : `<div class="empty-state">Sin alertas. Todo luce estable.</div>`;

    const months = DB.dashboardChartsData();
    CH.drawLine(elements.chartSales,
      months.map(m => m.label),
      [
        { label: 'Ventas', color: '#60a5fa', values: months.map(m => m.sales) },
        { label: 'Compras', color: '#22c55e', values: months.map(m => m.purchases) }
      ],
      { legend: [{ label: 'Ventas', color: '#60a5fa' }, { label: 'Compras', color: '#22c55e' }] }
    );

    CH.drawBar(elements.chartExpenses,
      DB.expenseByGroup().slice(0, 8).map((x, idx) => ({ label: x.label.slice(0, 8), value: x.value, color: ['#f59e0b', '#a78bfa', '#38bdf8', '#ef4444', '#22c55e', '#f97316', '#06b6d4', '#84cc16'][idx % 8] }))
    );

    CH.drawBar(elements.chartInventory,
      summary.products.slice().sort((a, b) => b.currentValue - a.currentValue).slice(0, 8).map((p, idx) => ({
        label: (p.code || p.name || `P${idx + 1}`).slice(0, 8),
        value: Number(p.currentValue || 0),
        color: ['#60a5fa', '#22c55e', '#f59e0b', '#a78bfa', '#ef4444', '#06b6d4', '#84cc16', '#fb7185'][idx % 8]
      }))
    );

    CH.drawDoughnut(elements.chartProfit, DB.profitDistribution(summary), {
      centerTitle: summary.utilidadNeta >= 0 ? 'Utilidad' : 'Pérdida',
      centerSubtitle: money(summary.utilidadNeta)
    });
  }

  function productQuery() {
    const q = elements.productSearch.value.trim().toLowerCase();
    const type = elements.productCategory.value;
    return state().products.filter(p => {
      const matchesQ = !q || JSON.stringify(p).toLowerCase().includes(q);
      const matchesType = !type || p.type === type;
      return matchesQ && matchesType;
    });
  }

  function productSelectOptions(selectedId = '') {
    const products = state().products;
    const opts = products.length ? products.map(p => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.code || p.id)} — ${escapeHtml(p.name)}</option>`).join('') : '<option value="">No hay productos</option>';
    ['buyProduct', 'saleProduct', 'lossProduct', 'expenseProduct', 'recipeProduct', 'produceRecipe', 'kardexProduct'].forEach(id => {
      if (!elements[id]) return;
      if (id === 'produceRecipe') {
        elements[id].innerHTML = state().recipes.length ? state().recipes.map(r => {
          const fp = state().products.find(p => p.id === r.finishedProductId);
          return `<option value="${r.id}">${escapeHtml(r.name || fp?.name || r.id)}</option>`;
        }).join('') : '<option value="">Sin recetas</option>';
      } else if (id === 'kardexProduct') {
        elements[id].innerHTML = opts;
      } else {
        elements[id].innerHTML = opts;
      }
    });
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  function renderProducts() {
    const products = productQuery();
    elements.productTable.innerHTML = products.length ? products.map(p => {
      const status = Number(p.currentStock) <= 0 ? 'Agotado' : Number(p.currentStock) <= Number(p.minStock) ? 'Crítico' : Number(p.maxStock) && Number(p.currentStock) >= Number(p.maxStock) ? 'Máximo' : 'OK';
      const badgeClass = status === 'Agotado' ? 'critical' : status === 'Crítico' ? 'warning' : status === 'Máximo' ? 'info' : 'good';
      return `
        <tr>
          <td>${escapeHtml(p.code)}</td>
          <td>
            <strong>${escapeHtml(p.name)}</strong>
            <div class="cell-sub">${escapeHtml(p.description || p.observations || '')}</div>
          </td>
          <td>${escapeHtml(p.type)}</td>
          <td>${escapeHtml(p.unitDescription || '')}</td>
          <td class="right">${money(p.currentAvgCost || p.costUnit || 0)}</td>
          <td class="right">${money(p.salePriceNoTax || 0)}</td>
          <td class="right">${Number(p.currentStock || 0).toFixed(2)}</td>
          <td class="right">${Number(p.minStock || 0).toFixed(2)}</td>
          <td class="right">${Number(p.maxStock || 0).toFixed(2)}</td>
          <td><span class="badge ${badgeClass}">${status}</span></td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-edit-product="${p.id}" title="Editar">✏️</button>
              <button class="icon-btn" data-dup-product="${p.id}" title="Duplicar">⧉</button>
              <button class="icon-btn danger" data-del-product="${p.id}" title="Eliminar">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="11"><div class="empty-state">Todavía no hay productos creados.</div></td></tr>`;
  }

  function renderKardex() {
    const productId = elements.kardexProduct.value || state().products[0]?.id || '';
    if (!elements.kardexProduct.value && productId) elements.kardexProduct.value = productId;
    const summary = DB.currentBalanceByProduct();
    const rows = summary.kardex.filter(row => {
      if (productId && row.productId !== productId) return false;
      if (elements.kardexFrom.value && row.date < elements.kardexFrom.value) return false;
      if (elements.kardexTo.value && row.date > elements.kardexTo.value) return false;
      return true;
    });
    elements.kardexTable.innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.movement)}</td>
        <td>${escapeHtml(r.document || '')}</td>
        <td>${escapeHtml(r.provider || r.customer || '')}</td>
        <td class="right">${Number(r.qtyIn || 0).toFixed(2)}</td>
        <td class="right">${Number(r.qtyOut || 0).toFixed(2)}</td>
        <td class="right">${money(r.unitCost || 0)}</td>
        <td class="right">${money(r.avgCost || 0)}</td>
        <td class="right">${Number(r.balance || 0).toFixed(2)}</td>
        <td class="right">${money(r.valueBalance || 0)}</td>
      </tr>
    `).join('') : `<tr><td colspan="10"><div class="empty-state">Sin movimientos para el producto seleccionado.</div></td></tr>`;
  }

  function gatherExpenseSubgroups(group) {
    const list = DB.EXPENSE_GROUPS[group] || ['Otros'];
    elements.expSubgroup.innerHTML = list.map(x => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
  }

  function renderExpenseSubgroups() {
    gatherExpenseSubgroups(elements.expGroup.value);
  }

  function renderRecipeItems() {
    const items = ui.recipeItems;
    elements.recipeItems.innerHTML = items.length ? items.map((item, idx) => `
      <div class="ingredient-row" data-row="${idx}">
        <select data-ing-product="${idx}">
          ${state().products.map(p => `<option value="${p.id}" ${p.id === item.productId ? 'selected' : ''}>${escapeHtml(p.code || '')} — ${escapeHtml(p.name)}</option>`).join('')}
        </select>
        <input data-ing-qty="${idx}" type="number" step="0.01" value="${item.qtyRequired || 0}" placeholder="Cantidad requerida" />
        <button class="icon-btn danger" data-remove-ing="${idx}" title="Eliminar">🗑️</button>
      </div>
    `).join('') : `<div class="empty-state small">Añade materias primas a la receta.</div>`;
  }

  function setRecipeFromModal(recipe = null) {
    ui.editingRecipeId = recipe?.id || null;
    elements.recipeProduct.value = recipe?.finishedProductId || state().products[0]?.id || '';
    elements.recipeName.value = recipe?.name || '';
    elements.recipeTime.value = recipe?.timeEstimated || '';
    elements.recipeMod.value = recipe?.modCost || 0;
    elements.recipeCif.value = recipe?.cifCost || 0;
    elements.recipeNotes.value = recipe?.notes || '';
    ui.recipeItems = recipe?.items?.length ? recipe.items.map(x => ({ productId: x.productId, qtyRequired: x.qtyRequired })) : [{ productId: state().products[0]?.id || '', qtyRequired: 1 }];
    renderRecipeItems();
  }

  function readRecipeItems() {
    const rows = [...elements.recipeItems.querySelectorAll('.ingredient-row')];
    return rows.map((row, idx) => ({
      productId: row.querySelector(`[data-ing-product="${idx}"]`)?.value || '',
      qtyRequired: Number(row.querySelector(`[data-ing-qty="${idx}"]`)?.value || 0)
    })).filter(x => x.productId && x.qtyRequired > 0);
  }

  function renderRecipes() {
    elements.recipeTable.innerHTML = state().recipes.length ? state().recipes.map(r => {
      const fp = state().products.find(p => p.id === r.finishedProductId);
      return `
        <tr>
          <td>${escapeHtml(r.name || fp?.name || 'Receta')}</td>
          <td>${escapeHtml(fp?.name || '')}</td>
          <td>${r.items?.length || 0}</td>
          <td class="right">${money(r.modCost || 0)}</td>
          <td class="right">${money(r.cifCost || 0)}</td>
          <td>${escapeHtml(r.timeEstimated || '')}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-edit-recipe="${r.id}">✏️</button>
              <button class="icon-btn" data-dup-recipe="${r.id}">⧉</button>
              <button class="icon-btn danger" data-del-recipe="${r.id}">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="7"><div class="empty-state">Aún no hay recetas creadas.</div></td></tr>`;
  }

  
  function opList() {
    const filteredOps = DB.operationsFiltered({
      search: elements.globalSearch.value.trim(),
      from: elements.dateFrom.value,
      to: elements.dateTo.value
    }).map(op => ({ ...op, source: 'operation' }));

    const filteredExpenses = DB.expenseFiltered({
      search: elements.globalSearch.value.trim(),
      from: elements.dateFrom.value,
      to: elements.dateTo.value
    }).map(exp => ({
      id: exp.id,
      kind: 'expense',
      source: 'expense',
      date: exp.date,
      document: exp.document,
      provider: '',
      customer: '',
      responsible: exp.responsible,
      group: exp.group,
      subgroup: exp.subgroup,
      description: exp.description,
      amount: exp.amount,
      qty: exp.amount,
      productId: exp.productId || '',
      productName: '',
      unitPrice: 0,
      unitCost: 0,
      tax: 0
    }));

    const combined = [...filteredOps, ...filteredExpenses].sort((a, b) => `${a.date}T${a.time || '00:00:00'}`.localeCompare(`${b.date}T${b.time || '00:00:00'}`));
    elements.reportTable.innerHTML = combined.length ? combined.map(op => {
      const product = state().products.find(p => p.id === op.productId) || state().products.find(p => p.id === op.finishedProductId);
      const total = op.kind === 'sale' ? (op.qty * op.unitPrice + op.tax) : op.kind === 'purchase' ? (op.qty * op.unitCost + op.tax) : op.kind === 'production' ? (op.totalCost || 0) : op.kind === 'loss' ? (op.qty * (op.unitCost || 0)) : op.kind === 'expense' ? op.amount : op.amount || 0;
      const detail = op.kind === 'expense' ? `${op.group} · ${op.subgroup}` : (product?.name || op.document || op.description || '');
      const entity = op.kind === 'expense' ? (op.responsible || '') : (op.provider || op.customer || op.responsible || '');
      return `
        <tr>
          <td>${escapeHtml(op.date)}</td>
          <td>${escapeHtml(op.kind === 'expense' ? 'Gasto' : DB.formatRowType(op.kind))}</td>
          <td>${escapeHtml(detail)}</td>
          <td>${escapeHtml(entity)}</td>
          <td class="right">${Number(op.qty || 0).toFixed(2)}</td>
          <td class="right">${money(total)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-edit-op="${op.id}" data-source="${op.source}">✏️</button>
              <button class="icon-btn" data-dup-op="${op.id}" data-source="${op.source}">⧉</button>
              <button class="icon-btn danger" data-del-op="${op.id}" data-source="${op.source}">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="7"><div class="empty-state">Sin movimientos para estos filtros.</div></td></tr>`;
  }


  function renderStatement() {
    const s = DB.statement();
    const rows = [
      ['Ventas', money(s.ventas)],
      ['(-) Devoluciones', money(s.devoluciones)],
      ['Ventas Netas', money(s.ventasNetas)],
      ['Costo de Ventas', money(s.costoVentas)],
      ['Utilidad Bruta', money(s.utilidadBruta)],
      ['Gastos Administrativos', money(s.gastosAdministrativos)],
      ['Gastos de Venta', money(s.gastosVenta)],
      ['Gastos Financieros', money(s.gastosFinancieros)],
      ['Otros Gastos', money(s.otrosGastos)],
      ['Otros Ingresos', money(s.otrosIngresos)],
      ['Utilidad Operativa', money(s.utilidadOperativa)],
      ['Impuestos', money(s.impuestos)],
      ['Utilidad Neta', money(s.utilidadNeta)]
    ];
    elements.statementList.innerHTML = rows.map(([a, b], i) => `
      <div class="statement-row ${i === rows.length - 1 ? 'final' : ''}">
        <span>${a}</span>
        <strong class="${b.includes('-') ? 'negative' : ''}">${b}</strong>
      </div>
    `).join('');
  }

  function renderProductModal(product = null) {
    ui.editingProductId = product?.id || null;
    elements.pCode.value = product?.code || '';
    elements.pName.value = product?.name || '';
    elements.pDescription.value = product?.description || '';
    elements.pUnitDescription.value = product?.unitDescription || '';
    elements.pType.value = product?.type || 'Mercadería';
    elements.pCategory.value = product?.category || product?.type || 'Mercadería';
    elements.pCostUnit.value = product?.costUnit || 0;
    elements.pSaleNoTax.value = product?.salePriceNoTax || 0;
    elements.pSaleWithTax.value = product?.salePriceTax || 0;
    elements.pStock.value = product?.stock || 0;
    elements.pMinStock.value = product?.minStock || 0;
    elements.pMaxStock.value = product?.maxStock || 0;
    elements.pSupplier.value = product?.supplier || '';
    elements.pObs.value = product?.observations || '';
    toggleModal(elements.productModal, true);
  }

  function saveProductFromModal() {
    const data = {
      code: elements.pCode.value.trim(),
      name: elements.pName.value.trim(),
      description: elements.pDescription.value.trim(),
      unitDescription: elements.pUnitDescription.value.trim(),
      type: elements.pType.value,
      category: elements.pCategory.value.trim(),
      costUnit: Number(elements.pCostUnit.value || 0),
      salePriceNoTax: Number(elements.pSaleNoTax.value || 0),
      salePriceTax: Number(elements.pSaleWithTax.value || 0),
      stock: Number(elements.pStock.value || 0),
      minStock: Number(elements.pMinStock.value || 0),
      maxStock: Number(elements.pMaxStock.value || 0),
      supplier: elements.pSupplier.value.trim(),
      observations: elements.pObs.value.trim()
    };
    if (!data.name) {
      showToast('Falta el nombre', 'Escribe un nombre para el producto.', 'warning');
      return;
    }
    try {
      if (ui.editingProductId) DB.updateProduct(ui.editingProductId, data);
      else DB.addProduct(data);
      ui.editingProductId = null;
      toggleModal(elements.productModal, false);
      refresh('Producto guardado');
    } catch (err) {
      showToast('No se pudo guardar', err.message, 'critical');
    }
  }


  function fillOperationForm(op) {
    ui.editingOperationId = op.id;
    ui.editingOperationKind = op.kind;
    const map = {
      purchase: () => {
        elements.buyDate.value = op.date;
        elements.buyType.value = op.purchaseType || 'Mercadería';
        elements.buyProduct.value = op.productId;
        elements.buyProvider.value = op.provider || '';
        elements.buyDocument.value = op.document || '';
        elements.buyQty.value = op.qty || 0;
        elements.buyUnitCost.value = op.unitCost || 0;
        elements.buyTax.value = op.tax || 0;
        elements.buyNote.value = op.note || '';
        goTab('operations');
      },
      sale: () => {
        elements.saleDate.value = op.date;
        elements.saleProduct.value = op.productId;
        elements.saleCustomer.value = op.customer || '';
        elements.saleDocument.value = op.document || '';
        elements.saleQty.value = op.qty || 0;
        elements.saleUnitPrice.value = op.unitPrice || 0;
        elements.saleTax.value = op.tax || 0;
        elements.saleNote.value = op.note || '';
        goTab('operations');
      },
      loss: () => {
        elements.lossDate.value = op.date;
        elements.lossProduct.value = op.productId;
        elements.lossQty.value = op.qty || 0;
        elements.lossReason.value = op.reason || 'Merma';
        elements.lossDescription.value = op.description || '';
        elements.lossResponsible.value = op.responsible || '';
        goTab('operations');
      },
      expense: () => {
        fillExpenseForm(op);
        goTab('operations');
      },
      production: () => {
        const recipe = state().recipes.find(r => r.id === op.recipeId);
        setRecipeFromModal(recipe);
        elements.produceRecipe.value = op.recipeId || '';
        elements.produceQty.value = op.qty || 0;
        elements.produceDate.value = op.date || today;
        elements.produceDocument.value = op.document || '';
        elements.produceNote.value = op.note || '';
        goTab('production');
      }
    };
    (map[op.kind] || (() => {}))();
    showToast('Edición lista', 'Ya puedes modificar el registro y guardarlo.', 'info');
  }

  function fillExpenseForm(exp) {
    ui.editingOperationId = exp.id;
    ui.editingOperationKind = 'expense';
    elements.expDate.value = exp.date;
    elements.expGroup.value = exp.group || 'Administrativos';
    renderExpenseSubgroups();
    elements.expSubgroup.value = exp.subgroup || 'Otros';
    elements.expAmount.value = exp.amount || 0;
    elements.expDocument.value = exp.document || '';
    elements.expDescription.value = exp.description || '';
    elements.expResponsible.value = exp.responsible || '';
    goTab('operations');
  }

  function clearOperationEdit() {
    ui.editingOperationId = null;
    ui.editingOperationKind = null;
  }

  function savePurchase() {
    const productId = elements.buyProduct.value;
    const product = state().products.find(p => p.id === productId);
    if (!product) return showToast('Falta producto', 'Selecciona un producto válido.', 'warning');
    const qty = Number(elements.buyQty.value || 0);
    const unitCost = Number(elements.buyUnitCost.value || 0);
    const payload = {
      kind: 'purchase',
      date: elements.buyDate.value || today,
      document: elements.buyDocument.value.trim(),
      provider: elements.buyProvider.value.trim(),
      productId,
      productName: product.name,
      qty,
      unitCost,
      tax: Number(elements.buyTax.value || 0),
      purchaseType: elements.buyType.value,
      note: elements.buyNote.value.trim()
    };
    if (qty <= 0) return showToast('Cantidad inválida', 'La compra necesita cantidad mayor que cero.', 'warning');
    try {
      if (ui.editingOperationId && ui.editingOperationKind === 'purchase') DB.updateOperation(ui.editingOperationId, payload);
      else DB.addOperation(payload);
      if (elements.buyType.value === 'Materia Prima Indirecta' || elements.buyType.value === 'Material Indirecto') {
        DB.addExpense({
          date: payload.date,
          group: 'CIF',
          subgroup: 'Materia prima indirecta',
          amount: qty * unitCost + payload.tax,
          document: payload.document,
          description: `Compra MI: ${product.name}`,
          responsible: payload.provider,
          productId
        }, false);
      }
      clearOperationEdit();
      refresh('Compra guardada');
      clearPurchaseForm();
    } catch (err) {
      showToast('Error', err.message, 'critical');
    }
  }

  function clearPurchaseForm() {
    elements.buyQty.value = 0;
    elements.buyUnitCost.value = 0;
    elements.buyTax.value = 0;
    elements.buyNote.value = '';
    elements.buyDocument.value = '';
    elements.buyProvider.value = '';
  }

  function saveSale() {
    const productId = elements.saleProduct.value;
    const product = state().products.find(p => p.id === productId);
    if (!product) return showToast('Falta producto', 'Selecciona un producto válido.', 'warning');
    const qty = Number(elements.saleQty.value || 0);
    const unitPrice = Number(elements.saleUnitPrice.value || 0);
    const current = DB.currentBalanceByProduct().products.find(p => p.id === productId);
    const available = Number(current?.currentStock || 0);
    if (qty <= 0) return showToast('Cantidad inválida', 'La venta necesita una cantidad mayor que cero.', 'warning');
    if (qty > available) return showToast('Stock insuficiente', `Solo hay ${available.toFixed(2)} unidades disponibles.`, 'critical');
    const payload = {
      kind: 'sale',
      date: elements.saleDate.value || today,
      document: elements.saleDocument.value.trim(),
      customer: elements.saleCustomer.value.trim(),
      productId,
      productName: product.name,
      qty,
      unitPrice,
      tax: Number(elements.saleTax.value || 0),
      note: elements.saleNote.value.trim()
    };
    try {
      if (ui.editingOperationId && ui.editingOperationKind === 'sale') DB.updateOperation(ui.editingOperationId, payload);
      else DB.addOperation(payload);
      clearOperationEdit();
      refresh('Venta guardada');
      clearSaleForm();
    } catch (err) {
      showToast('Error', err.message, 'critical');
    }
  }

  function clearSaleForm() {
    elements.saleQty.value = 0;
    elements.saleUnitPrice.value = 0;
    elements.saleTax.value = 0;
    elements.saleDocument.value = '';
    elements.saleCustomer.value = '';
    elements.saleNote.value = '';
  }

  function saveLoss() {
    const productId = elements.lossProduct.value;
    const product = state().products.find(p => p.id === productId);
    if (!product) return showToast('Falta producto', 'Selecciona un producto válido.', 'warning');
    const qty = Number(elements.lossQty.value || 0);
    const current = DB.currentBalanceByProduct().products.find(p => p.id === productId);
    const available = Number(current?.currentStock || 0);
    if (qty <= 0) return showToast('Cantidad inválida', 'La pérdida necesita una cantidad mayor que cero.', 'warning');
    if (qty > available) return showToast('Stock insuficiente', `Solo hay ${available.toFixed(2)} unidades disponibles.`, 'critical');
    const payload = {
      kind: 'loss',
      date: elements.lossDate.value || today,
      productId,
      productName: product.name,
      qty,
      reason: elements.lossReason.value,
      description: elements.lossDescription.value.trim(),
      responsible: elements.lossResponsible.value.trim()
    };
    try {
      if (ui.editingOperationId && ui.editingOperationKind === 'loss') DB.updateOperation(ui.editingOperationId, payload);
      else DB.addOperation(payload);
      clearOperationEdit();
      refresh('Pérdida guardada');
      elements.lossQty.value = 0;
      elements.lossDescription.value = '';
      elements.lossResponsible.value = '';
    } catch (err) {
      showToast('Error', err.message, 'critical');
    }
  }


  function saveExpense() {
    const amount = Number(elements.expAmount.value || 0);
    if (amount <= 0) return showToast('Monto inválido', 'El gasto debe ser mayor que cero.', 'warning');
    const payload = {
      date: elements.expDate.value || today,
      group: elements.expGroup.value,
      subgroup: elements.expSubgroup.value,
      amount,
      document: elements.expDocument.value.trim(),
      description: elements.expDescription.value.trim(),
      responsible: elements.expResponsible.value.trim()
    };
    try {
      if (ui.editingOperationId && ui.editingOperationKind === 'expense') {
        DB.updateExpense(ui.editingOperationId, payload);
      } else {
        DB.addExpense(payload);
      }
      clearOperationEdit();
      refresh('Gasto guardado');
      elements.expAmount.value = 0;
      elements.expDescription.value = '';
      elements.expDocument.value = '';
      elements.expResponsible.value = '';
    } catch (err) {
      showToast('Error', err.message, 'critical');
    }
  }

  function saveRecipe() {
    const finishedProductId = elements.recipeProduct.value;
    const name = elements.recipeName.value.trim();
    if (!finishedProductId) return showToast('Falta producto', 'Selecciona un producto terminado.', 'warning');
    const items = readRecipeItems();
    if (!items.length) return showToast('Faltan insumos', 'Agrega materias primas a la receta.', 'warning');
    const payload = {
      finishedProductId,
      name,
      timeEstimated: elements.recipeTime.value.trim(),
      modCost: Number(elements.recipeMod.value || 0),
      cifCost: Number(elements.recipeCif.value || 0),
      notes: elements.recipeNotes.value.trim(),
      items
    };
    try {
      if (ui.editingRecipeId) DB.updateRecipe(ui.editingRecipeId, payload);
      else DB.addRecipe(payload);
      ui.editingRecipeId = null;
      setRecipeFromModal(null);
      refresh('Receta guardada');
    } catch (err) {
      showToast('Error', err.message, 'critical');
    }
  }

  function runProduction() {
    const recipeId = elements.produceRecipe.value;
    const recipe = state().recipes.find(r => r.id === recipeId);
    if (!recipe) return showToast('Falta receta', 'Elige una receta válida.', 'warning');
    const qty = Number(elements.produceQty.value || 0);
    if (qty <= 0) return showToast('Cantidad inválida', 'La producción debe ser mayor que cero.', 'warning');

    const balance = DB.currentBalanceByProduct().products;
    const missing = [];
    for (const item of recipe.items) {
      const prod = balance.find(p => p.id === item.productId);
      const need = Number(item.qtyRequired || 0) * qty;
      const available = Number(prod?.currentStock || 0);
      if (available < need) {
        missing.push(`${prod?.name || 'Producto'}: faltan ${(need - available).toFixed(2)}`);
      }
    }
    if (missing.length) return showToast('No alcanza materia prima', missing[0], 'critical');

    const outputProduct = state().products.find(p => p.id === recipe.finishedProductId);
    if (!outputProduct) return showToast('Producto terminado faltante', 'La receta no tiene un producto terminado válido.', 'critical');

    const totalMaterialCost = recipe.items.reduce((sum, item) => {
      const prod = balance.find(p => p.id === item.productId);
      const avg = Number(prod?.currentAvgCost || prod?.costUnit || 0);
      return sum + (Number(item.qtyRequired || 0) * qty * avg);
    }, 0);
    const totalCost = totalMaterialCost + Number(recipe.modCost || 0) + Number(recipe.cifCost || 0);
    const payload = {
      kind: 'production',
      date: elements.produceDate.value || today,
      document: elements.produceDocument.value.trim(),
      recipeId: recipe.id,
      finishedProductId: recipe.finishedProductId,
      productId: recipe.finishedProductId,
      productName: outputProduct.name,
      qty,
      inputs: recipe.items,
      modCost: Number(recipe.modCost || 0),
      cifCost: Number(recipe.cifCost || 0),
      totalCost,
      note: elements.produceNote.value.trim()
    };
    try {
      if (ui.editingOperationId && ui.editingOperationKind === 'production') DB.updateOperation(ui.editingOperationId, payload);
      else DB.addOperation(payload);
      clearOperationEdit();
      refresh('Producción registrada');
      elements.produceQty.value = 0;
      elements.produceDocument.value = '';
      elements.produceNote.value = '';
    } catch (err) {
      showToast('Error', err.message, 'critical');
    }
  }

  function refresh(reason = '') {
    state().products = state().products.map(p => p); // keep reference stable
    const summary = DB.statement();
    const current = DB.currentBalanceByProduct();
    // persist recalculated snapshots
    current.products.forEach(cp => {
      const idx = state().products.findIndex(p => p.id === cp.id);
      if (idx >= 0) state().products[idx] = { ...state().products[idx], ...cp };
    });
    DB.saveState();

    renderKpis(summary);
    renderDashboard(summary);
    renderProducts();
    renderKardex();
    renderRecipes();
    renderStatement();
    opList();
    productSelectOptions();
    renderExpenseSubgroups();

    if (reason) showToast('ERP Pocket', reason, 'success');
  }

  function goTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === tab));
    DB.setSetting('lastTab', tab);
    state().settings.lastTab = tab;
    if (tab === 'dashboard') refresh();
  }

  function exportCsv(kind = 'current') {
    const rows = [];
    if (kind === 'products') {
      rows.push(['Código','Nombre','Tipo','Unidad','Costo','Precio','Stock','Mínimo','Máximo','Proveedor']);
      productQuery().forEach(p => rows.push([p.code, p.name, p.type, p.unitDescription, p.currentAvgCost, p.salePriceNoTax, p.currentStock, p.minStock, p.maxStock, p.supplier]));
    } else if (kind === 'kardex') {
      rows.push(['Fecha','Movimiento','Documento','Entidad','Entrada','Salida','Costo unitario','Costo promedio','Saldo','Valor saldo']);
      DB.currentBalanceByProduct().kardex.forEach(r => rows.push([r.date, r.movement, r.document, r.provider || r.customer, r.qtyIn, r.qtyOut, r.unitCost, r.avgCost, r.balance, r.valueBalance]));
    } else {
      const s = DB.statement();
      rows.push(['Concepto','Valor']);
      rows.push(['Ventas', s.ventas]);
      rows.push(['Devoluciones', s.devoluciones]);
      rows.push(['Ventas netas', s.ventasNetas]);
      rows.push(['Costo de ventas', s.costoVentas]);
      rows.push(['Utilidad bruta', s.utilidadBruta]);
      rows.push(['Utilidad operativa', s.utilidadOperativa]);
      rows.push(['Utilidad neta', s.utilidadNeta]);
    }
    const csv = rows.map(r => r.map(x => `"${String(x ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    downloadText(csv, `${kind}-${today}.csv`, 'text/csv;charset=utf-8;');
  }

  function exportExcel(kind = 'statement') {
    const html = buildPrintableTable(kind, false);
    downloadText(html, `${kind}-${today}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  }

  function exportPdf(kind = 'statement') {
    const html = buildPrintableTable(kind, true);
    const win = window.open('', '_blank', 'width=1200,height=900');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  function downloadText(content, filename, mime = 'text/plain;charset=utf-8;') {
    const blob = new Blob(['\ufeff' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildPrintableTable(kind, printable = true) {
    const style = printable ? `
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111827}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #d1d5db;padding:8px;font-size:12px}
        h1,h2{margin:0 0 10px}
      </style>` : '';
    let body = '';
    if (kind === 'products') {
      body = `<h2>Inventario</h2><table><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Stock</th><th>Costo</th></tr></thead><tbody>${
        productQuery().map(p => `<tr><td>${escapeHtml(p.code)}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.type)}</td><td>${p.currentStock}</td><td>${money(p.currentAvgCost)}</td></tr>`).join('')
      }</tbody></table>`;
    } else if (kind === 'kardex') {
      const rows = DB.currentBalanceByProduct().kardex;
      body = `<h2>Kardex</h2><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Doc</th><th>Entrada</th><th>Salida</th><th>Saldo</th><th>Valor</th></tr></thead><tbody>${
        rows.map(r => `<tr><td>${r.date}</td><td>${r.movement}</td><td>${escapeHtml(r.document || '')}</td><td>${r.qtyIn}</td><td>${r.qtyOut}</td><td>${r.balance}</td><td>${money(r.valueBalance)}</td></tr>`).join('')
      }</tbody></table>`;
    } else {
      const s = DB.statement();
      body = `<h2>Estado de Resultados</h2><table><tbody>
        <tr><th>Ventas</th><td>${money(s.ventas)}</td></tr>
        <tr><th>Devoluciones</th><td>${money(s.devoluciones)}</td></tr>
        <tr><th>Ventas netas</th><td>${money(s.ventasNetas)}</td></tr>
        <tr><th>Costo de ventas</th><td>${money(s.costoVentas)}</td></tr>
        <tr><th>Utilidad bruta</th><td>${money(s.utilidadBruta)}</td></tr>
        <tr><th>Gastos administrativos</th><td>${money(s.gastosAdministrativos)}</td></tr>
        <tr><th>Gastos de venta</th><td>${money(s.gastosVenta)}</td></tr>
        <tr><th>Gastos financieros</th><td>${money(s.gastosFinancieros)}</td></tr>
        <tr><th>Otros gastos</th><td>${money(s.otrosGastos)}</td></tr>
        <tr><th>Utilidad operativa</th><td>${money(s.utilidadOperativa)}</td></tr>
        <tr><th>Impuestos</th><td>${money(s.impuestos)}</td></tr>
        <tr><th>Utilidad neta</th><td>${money(s.utilidadNeta)}</td></tr>
      </tbody></table>`;
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${kind}</title>${style}</head><body><h1>ERP Pocket v2.0</h1>${body}</body></html>`;
  }

  function openHelp() {
    toggleModal(elements.helpModal, true);
  }

  function renderCalendar() {
    const d = ui.calendarDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1);
    const start = first.getDay() || 7;
    const days = new Date(year, month + 1, 0).getDate();
    const names = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    elements.calendarTitle.textContent = `${d.toLocaleString('es-PE', { month: 'long', year: 'numeric' })}`;
    const cells = [];
    names.forEach(n => cells.push(`<div class="cal-head">${n}</div>`));
    for (let i = 1; i < start; i++) cells.push('<div class="cal-cell blank"></div>');
    for (let day = 1; day <= days; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const active = iso === today;
      cells.push(`<button class="cal-cell ${active ? 'today' : ''}" data-cal-day="${iso}">${day}</button>`);
    }
    elements.calendarGrid.innerHTML = cells.join('');
  }

  function openCalculator() {
    toggleModal(elements.calcModal, true);
  }

  function calcPress(value) {
    const display = elements.calcDisplay;
    if (value === 'C') display.value = '';
    else if (value === '⌫') display.value = display.value.slice(0, -1);
    else if (value === '=') {
      try {
        // eslint-disable-next-line no-new-func
        display.value = Function(`"use strict"; return (${display.value || '0'})`)();
      } catch {
        display.value = 'Error';
      }
    } else display.value += value;
  }

  function seedDemo() {
    if (state().products.length || state().operations.length || state().expenses.length) {
      if (!confirm('Ya existen datos. ¿Sobrescribir con la demo?')) return;
      DB.resetState();
    }
    const data = [
      { code: 'AGUA-001', name: 'Agua tratada', type: 'Materia Prima Directa', unitDescription: 'litro', costUnit: 0.15, salePriceNoTax: 0.3, salePriceTax: 0.354, stock: 15000, minStock: 3000, maxStock: 25000, supplier: 'Aguas del Norte SAC', description: 'Agua base para producción' },
      { code: 'CO2-001', name: 'CO₂ alimentario', type: 'Materia Prima Directa', unitDescription: 'kg', costUnit: 2.8, salePriceNoTax: 4.2, salePriceTax: 4.956, stock: 1200, minStock: 250, maxStock: 1800, supplier: 'Gas Industrial SAC', description: 'Gas para carbonatación' },
      { code: 'JAR-001', name: 'Jarabe concentrado', type: 'Materia Prima Directa', unitDescription: 'litro', costUnit: 3.5, salePriceNoTax: 5.2, salePriceTax: 6.136, stock: 800, minStock: 200, maxStock: 1200, supplier: 'Syrup Labs', description: 'Base del sabor cola' },
      { code: 'BOT-001', name: 'Botella PET 500ml', type: 'Materia Prima Indirecta', unitDescription: 'und', costUnit: 0.22, salePriceNoTax: 0.4, salePriceTax: 0.472, stock: 12000, minStock: 2500, maxStock: 20000, supplier: 'Empaques Perú', description: 'Envase plástico' },
      { code: 'TAP-001', name: 'Tapa rosca', type: 'Materia Prima Indirecta', unitDescription: 'und', costUnit: 0.05, salePriceNoTax: 0.1, salePriceTax: 0.118, stock: 12000, minStock: 2500, maxStock: 20000, supplier: 'Empaques Perú', description: 'Tapa de seguridad' },
      { code: 'ETQ-001', name: 'Etiqueta cola', type: 'Materia Prima Indirecta', unitDescription: 'und', costUnit: 0.04, salePriceNoTax: 0.08, salePriceTax: 0.094, stock: 12000, minStock: 2500, maxStock: 20000, supplier: 'Gráficas Lima', description: 'Etiqueta frontal' },
      { code: 'CAJ-001', name: 'Caja cartón x 12', type: 'Materia Prima Indirecta', unitDescription: 'und', costUnit: 0.6, salePriceNoTax: 1.0, salePriceTax: 1.18, stock: 1000, minStock: 200, maxStock: 2000, supplier: 'Cartones Perú', description: 'Caja para despacho' },
      { code: 'FCO-001', name: 'Gaseosa cola 500ml', type: 'Producto Terminado', unitDescription: 'und', costUnit: 1.1, salePriceNoTax: 2.2, salePriceTax: 2.596, stock: 5000, minStock: 1000, maxStock: 10000, supplier: 'Planta principal', description: 'Producto final' },
      { code: 'FCO-002', name: 'Gaseosa cola 1.5L', type: 'Producto Terminado', unitDescription: 'und', costUnit: 1.9, salePriceNoTax: 4.8, salePriceTax: 5.664, stock: 3000, minStock: 600, maxStock: 7000, supplier: 'Planta principal', description: 'Producto final grande' }
    ];
    data.forEach(p => DB.addProduct(p, false));
    DB.addRecipe({
      finishedProductId: state().products.find(p => p.code === 'FCO-001')?.id || state().products[7]?.id,
      name: 'Receta Gaseosa cola 500ml',
      timeEstimated: '1.5 horas por lote',
      modCost: 0.28,
      cifCost: 0.19,
      notes: 'Lote estándar de embotellado',
      items: [
        { productId: state().products.find(p => p.code === 'AGUA-001')?.id, qtyRequired: 0.45 },
        { productId: state().products.find(p => p.code === 'CO2-001')?.id, qtyRequired: 0.03 },
        { productId: state().products.find(p => p.code === 'JAR-001')?.id, qtyRequired: 0.05 },
        { productId: state().products.find(p => p.code === 'BOT-001')?.id, qtyRequired: 1 },
        { productId: state().products.find(p => p.code === 'TAP-001')?.id, qtyRequired: 1 },
        { productId: state().products.find(p => p.code === 'ETQ-001')?.id, qtyRequired: 1 }
      ]
    });
    DB.addRecipe({
      finishedProductId: state().products.find(p => p.code === 'FCO-002')?.id || state().products[8]?.id,
      name: 'Receta Gaseosa cola 1.5L',
      timeEstimated: '2 horas por lote',
      modCost: 0.42,
      cifCost: 0.31,
      notes: 'Lote de presentación familiar',
      items: [
        { productId: state().products.find(p => p.code === 'AGUA-001')?.id, qtyRequired: 1.1 },
        { productId: state().products.find(p => p.code === 'CO2-001')?.id, qtyRequired: 0.07 },
        { productId: state().products.find(p => p.code === 'JAR-001')?.id, qtyRequired: 0.12 },
        { productId: state().products.find(p => p.code === 'BOT-001')?.id, qtyRequired: 1 },
        { productId: state().products.find(p => p.code === 'TAP-001')?.id, qtyRequired: 1 },
        { productId: state().products.find(p => p.code === 'ETQ-001')?.id, qtyRequired: 1 },
        { productId: state().products.find(p => p.code === 'CAJ-001')?.id, qtyRequired: 0.08 }
      ]
    });

    const d1 = new Date();
    const d2 = new Date(Date.now() - 86400000 * 20);
    const d3 = new Date(Date.now() - 86400000 * 14);
    const d4 = new Date(Date.now() - 86400000 * 7);
    const d5 = new Date(Date.now() - 86400000 * 2);

    const pAgua = state().products.find(p => p.code === 'AGUA-001')?.id;
    const pCo2 = state().products.find(p => p.code === 'CO2-001')?.id;
    const pJar = state().products.find(p => p.code === 'JAR-001')?.id;
    const pBot = state().products.find(p => p.code === 'BOT-001')?.id;
    const pTap = state().products.find(p => p.code === 'TAP-001')?.id;
    const pEtq = state().products.find(p => p.code === 'ETQ-001')?.id;
    const pCaj = state().products.find(p => p.code === 'CAJ-001')?.id;
    const pF1 = state().products.find(p => p.code === 'FCO-001')?.id;
    const pF2 = state().products.find(p => p.code === 'FCO-002')?.id;

    [
      { kind: 'purchase', date: d2.toISOString().slice(0, 10), document: 'F001-1001', provider: 'Aguas del Norte SAC', productId: pAgua, productName: 'Agua tratada', qty: 12000, unitCost: 0.14, tax: 302.4, purchaseType: 'Material Directo', note: 'Compra principal' },
      { kind: 'purchase', date: d2.toISOString().slice(0, 10), document: 'F001-1002', provider: 'Gas Industrial SAC', productId: pCo2, productName: 'CO₂ alimentario', qty: 900, unitCost: 2.75, tax: 445.5, purchaseType: 'Material Directo', note: 'Gas para carbonatación' },
      { kind: 'purchase', date: d3.toISOString().slice(0, 10), document: 'F001-1003', provider: 'Syrup Labs', productId: pJar, productName: 'Jarabe concentrado', qty: 500, unitCost: 3.4, tax: 306, purchaseType: 'Material Directo', note: 'Jarabe base' },
      { kind: 'purchase', date: d3.toISOString().slice(0, 10), document: 'F001-1004', provider: 'Empaques Perú', productId: pBot, productName: 'Botella PET 500ml', qty: 9000, unitCost: 0.21, tax: 340.2, purchaseType: 'Materia Prima Indirecta', note: 'Envases' },
      { kind: 'purchase', date: d3.toISOString().slice(0, 10), document: 'F001-1005', provider: 'Empaques Perú', productId: pTap, productName: 'Tapa rosca', qty: 9000, unitCost: 0.046, tax: 70.6, purchaseType: 'Materia Prima Indirecta', note: 'Tapas' },
      { kind: 'purchase', date: d3.toISOString().slice(0, 10), document: 'F001-1006', provider: 'Gráficas Lima', productId: pEtq, productName: 'Etiqueta cola', qty: 9000, unitCost: 0.038, tax: 61.4, purchaseType: 'Materia Prima Indirecta', note: 'Etiquetas' },
      { kind: 'purchase', date: d3.toISOString().slice(0, 10), document: 'F001-1007', provider: 'Cartones Perú', productId: pCaj, productName: 'Caja cartón x12', qty: 600, unitCost: 0.56, tax: 60.5, purchaseType: 'Materia Prima Indirecta', note: 'Cajas' },
      { kind: 'production', date: d4.toISOString().slice(0, 10), document: 'OP-2001', recipeId: state().recipes[0].id, finishedProductId: pF1, productId: pF1, qty: 2600, inputs: state().recipes[0].items, modCost: 728, cifCost: 494, totalCost: 0, note: 'Lote de 500ml' },
      { kind: 'production', date: d4.toISOString().slice(0, 10), document: 'OP-2002', recipeId: state().recipes[1].id, finishedProductId: pF2, productId: pF2, qty: 1500, inputs: state().recipes[1].items, modCost: 630, cifCost: 465, totalCost: 0, note: 'Lote de 1.5L' },
      { kind: 'sale', date: d5.toISOString().slice(0, 10), document: 'B001-3001', customer: 'Supermercados Central', productId: pF1, productName: 'Gaseosa cola 500ml', qty: 900, unitPrice: 2.2, tax: 356.4, note: 'Venta mayorista' },
      { kind: 'sale', date: d5.toISOString().slice(0, 10), document: 'B001-3002', customer: 'Distribuidora Sur', productId: pF2, productName: 'Gaseosa cola 1.5L', qty: 450, unitPrice: 4.8, tax: 388.8, note: 'Venta mayorista' },
      { kind: 'loss', date: d1.toISOString().slice(0, 10), productId: pF1, productName: 'Gaseosa cola 500ml', qty: 35, reason: 'Merma', description: 'Botellas dañadas en despacho', responsible: 'Almacén' },
      { kind: 'expense', date: d4.toISOString().slice(0, 10), group: 'MOD', subgroup: 'Sueldos de producción', amount: 4200, document: 'PLAN-01', description: 'Planilla de planta', responsible: 'RRHH' },
      { kind: 'expense', date: d4.toISOString().slice(0, 10), group: 'CIF', subgroup: 'Energía', amount: 1350, document: 'LUZ-01', description: 'Consumo eléctrico', responsible: 'Contabilidad' },
      { kind: 'expense', date: d4.toISOString().slice(0, 10), group: 'CIF', subgroup: 'Agua', amount: 220, document: 'AG-01', description: 'Consumo de agua', responsible: 'Contabilidad' },
      { kind: 'expense', date: d3.toISOString().slice(0, 10), group: 'Ventas', subgroup: 'Publicidad', amount: 1800, document: 'PUB-01', description: 'Campaña digital', responsible: 'Marketing' },
      { kind: 'expense', date: d3.toISOString().slice(0, 10), group: 'Administrativos', subgroup: 'Alquiler', amount: 2500, document: 'ALQ-01', description: 'Alquiler de oficina', responsible: 'Administración' },
      { kind: 'expense', date: d3.toISOString().slice(0, 10), group: 'Financieros', subgroup: 'Intereses', amount: 480, document: 'BNK-01', description: 'Intereses por financiamiento', responsible: 'Finanzas' },
      { kind: 'expense', date: d1.toISOString().slice(0, 10), group: 'Tributos', subgroup: 'Arbitrios', amount: 160, document: 'MUNI-01', description: 'Arbitrios municipales', responsible: 'Contabilidad' }
    ].forEach(op => DB.addOperation(op, false) || null);

    refresh('Empresa demo cargada');
  }

  function bindEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => goTab(btn.dataset.tab)));
    document.querySelectorAll('[data-modal-open]').forEach(btn => btn.addEventListener('click', () => {
      const target = btn.dataset.modalOpen;
      toggleModal($(target), true);
    }));

    elements.themeToggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      showToast('Tema', `Se activó el modo ${next === 'dark' ? 'oscuro' : 'claro'}.`, 'info');
    });

    elements.btnDemo.addEventListener('click', seedDemo);
    elements.btnUndo.addEventListener('click', () => {
      if (DB.undo()) {
        state(); // refresh reference
        refresh('Última acción deshecha');
      } else showToast('Sin cambios', 'No hay acciones para deshacer.', 'warning');
    });
    elements.btnHelp.addEventListener('click', openHelp);
    elements.btnCalculator.addEventListener('click', openCalculator);
    elements.btnCalendar.addEventListener('click', () => toggleModal(elements.calendarModal, true));
    elements.btnQuick.addEventListener('click', () => elements.fabMenu.classList.toggle('open'));
    elements.btnInstall.addEventListener('click', async () => {
      if (!ui.installPrompt) return;
      ui.installPrompt.prompt();
      await ui.installPrompt.userChoice;
      ui.installPrompt = null;
      elements.btnInstall.style.display = 'none';
    });
    elements.btnClearFilters.addEventListener('click', () => {
      elements.globalSearch.value = '';
      elements.dateFrom.value = '';
      elements.dateTo.value = '';
      elements.categoryFilter.value = '';
      elements.productSearch.value = '';
      elements.productCategory.value = '';
      refresh();
    });

    elements.globalSearch.addEventListener('input', refresh);
    elements.dateFrom.addEventListener('change', refresh);
    elements.dateTo.addEventListener('change', refresh);
    elements.categoryFilter.addEventListener('change', () => {
      elements.productCategory.value = elements.categoryFilter.value;
      refresh();
    });

    elements.productSearch.addEventListener('input', renderProducts);
    elements.productCategory.addEventListener('change', renderProducts);
    elements.btnNewProduct.addEventListener('click', () => renderProductModal(null));
    elements.btnExportProducts.addEventListener('click', () => exportCsv('products'));
    elements.btnExportKardex.addEventListener('click', () => exportCsv('kardex'));
    elements.btnRefreshKardex.addEventListener('click', renderKardex);

    elements.kardexProduct.addEventListener('change', renderKardex);
    elements.kardexFrom.addEventListener('change', renderKardex);
    elements.kardexTo.addEventListener('change', renderKardex);

    elements.expGroup.addEventListener('change', renderExpenseSubgroups);

    elements.btnSaveProduct.addEventListener('click', saveProductFromModal);
    elements.btnCancelProduct.addEventListener('click', () => toggleModal(elements.productModal, false));

    elements.btnSaveBuy.addEventListener('click', savePurchase);
    elements.btnSaveSale.addEventListener('click', saveSale);
    elements.btnSaveLoss.addEventListener('click', saveLoss);
    elements.btnSaveExpense.addEventListener('click', saveExpense);
    elements.btnAddRecipeItem.addEventListener('click', () => {
      ui.recipeItems.push({ productId: state().products[0]?.id || '', qtyRequired: 1 });
      renderRecipeItems();
    });
    elements.btnSaveRecipe.addEventListener('click', saveRecipe);
    elements.btnRunProduction.addEventListener('click', runProduction);

    elements.recipeItems.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove-ing]');
      if (rm) {
        const idx = Number(rm.dataset.removeIng);
        ui.recipeItems.splice(idx, 1);
        if (!ui.recipeItems.length) ui.recipeItems.push({ productId: state().products[0]?.id || '', qtyRequired: 1 });
        renderRecipeItems();
      }
    });
    elements.recipeItems.addEventListener('change', (e) => {
      const p = e.target.closest('[data-ing-product]');
      const q = e.target.closest('[data-ing-qty]');
      if (p) {
        ui.recipeItems[Number(p.dataset.ingProduct)].productId = p.value;
      }
      if (q) {
        ui.recipeItems[Number(q.dataset.ingQty)].qtyRequired = Number(q.value || 0);
      }
    });

    elements.btnExportCSV.addEventListener('click', () => exportCsv('statement'));
    elements.btnExportXLS.addEventListener('click', () => exportExcel('statement'));
    elements.btnExportPDF.addEventListener('click', () => exportPdf('statement'));

    elements.btnCloseOp.addEventListener('click', () => toggleModal(elements.opModal, false));
    elements.btnCancelOp.addEventListener('click', () => toggleModal(elements.opModal, false));
    elements.btnSaveOp.addEventListener('click', () => {
      const form = elements.opModalBody.querySelector('[data-op-kind]');
      const kind = form?.dataset.opKind;
      if (!kind) return;
      const data = readOperationModal(kind);
      try {
        if (ui.editingOperationId) DB.updateOperation(ui.editingOperationId, data);
        else DB.addOperation(data);
        ui.editingOperationId = null;
        ui.editingOperationKind = null;
        toggleModal(elements.opModal, false);
        refresh('Movimiento guardado');
      } catch (err) {
        showToast('Error', err.message, 'critical');
      }
    });

    elements.opModalBody.addEventListener('change', (e) => {
      if (e.target.matches('[data-op-kind-select]')) {
        renderOpEditor(e.target.value);
      }
    });

    document.body.addEventListener('click', (e) => {
      const editProduct = e.target.closest('[data-edit-product]');
      const dupProduct = e.target.closest('[data-dup-product]');
      const delProduct = e.target.closest('[data-del-product]');
      const editRecipe = e.target.closest('[data-edit-recipe]');
      const dupRecipe = e.target.closest('[data-dup-recipe]');
      const delRecipe = e.target.closest('[data-del-recipe]');
      const editOp = e.target.closest('[data-edit-op]');
      const dupOp = e.target.closest('[data-dup-op]');
      const delOp = e.target.closest('[data-del-op]');
      const calDay = e.target.closest('[data-cal-day]');
      const fabAction = e.target.closest('[data-fab-action]');

      if (editProduct) renderProductModal(state().products.find(p => p.id === editProduct.dataset.editProduct));
      if (dupProduct) { DB.duplicateProduct(dupProduct.dataset.dupProduct); refresh('Producto duplicado'); }
      if (delProduct) confirmDelete('producto', () => { DB.removeProduct(delProduct.dataset.delProduct); refresh('Producto eliminado'); });

      if (editRecipe) {
        const recipe = state().recipes.find(r => r.id === editRecipe.dataset.editRecipe);
        if (recipe) {
          setRecipeFromModal(recipe);
          elements.recipeName.focus();
          goTab('production');
        }
      }
      if (dupRecipe) {
        const recipe = state().recipes.find(r => r.id === dupRecipe.dataset.dupRecipe);
        if (recipe) {
          DB.addRecipe({ ...recipe, id: undefined, name: `${recipe.name} (copia)` });
          refresh('Receta duplicada');
        }
      }
      if (delRecipe) confirmDelete('receta', () => { DB.removeRecipe(delRecipe.dataset.delRecipe); refresh('Receta eliminada'); });

      if (editOp) {
        const op = state().operations.find(o => o.id === editOp.dataset.editOp);
        if (op) {
          fillOperationForm(op);
        } else {
          const exp = state().expenses.find(e => e.id === editOp.dataset.editOp);
          if (exp) fillExpenseForm(exp);
        }
      }
      if (dupOp) {
        const isExpense = dupOp.dataset.source === 'expense';
        if (isExpense) {
          const exp = state().expenses.find(e => e.id === dupOp.dataset.dupOp);
          if (exp) {
            DB.addExpense({ ...exp, id: undefined, amount: exp.amount, description: `${exp.description} (copia)` });
            refresh('Gasto duplicado');
          }
        } else {
          DB.duplicateOperation(dupOp.dataset.dupOp);
          refresh('Movimiento duplicado');
        }
      }
      if (delOp) {
        const isExpense = delOp.dataset.source === 'expense';
        if (isExpense) confirmDelete('gasto', () => { DB.removeExpense(delOp.dataset.delOp); refresh('Gasto eliminado'); });
        else confirmDelete('movimiento', () => { DB.removeOperation(delOp.dataset.delOp); refresh('Movimiento eliminado'); });
      }

      if (calDay) showToast('Fecha', calDay.dataset.calDay, 'info');
      if (fabAction) {
        const act = fabAction.dataset.fabAction;
        if (act === 'product') renderProductModal(null);
        if (act === 'demo') seedDemo();
        if (act === 'calc') openCalculator();
        if (act === 'calendar') toggleModal(elements.calendarModal, true);
        elements.fabMenu.classList.remove('open');
      }
    });

    elements.btnCalcClose.addEventListener('click', () => toggleModal(elements.calcModal, false));
    elements.btnCalClose.addEventListener('click', () => toggleModal(elements.calendarModal, false));
    elements.btnHelpClose.addEventListener('click', () => toggleModal(elements.helpModal, false));

    elements.btnPrevMonth.addEventListener('click', () => { ui.calendarDate.setMonth(ui.calendarDate.getMonth() - 1); renderCalendar(); });
    elements.btnNextMonth.addEventListener('click', () => { ui.calendarDate.setMonth(ui.calendarDate.getMonth() + 1); renderCalendar(); });

    elements.calcKeys.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-key]');
      if (btn) calcPress(btn.dataset.key);
    });
  }

  function confirmDelete(label, onYes) {
    if (confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) onYes();
  }

  function renderOpEditor(kind = 'purchase') {
    const productOptions = state().products.map(p => `<option value="${p.id}">${escapeHtml(p.code || '')} — ${escapeHtml(p.name)}</option>`).join('');
    const recipeOptions = state().recipes.map(r => {
      const fp = state().products.find(p => p.id === r.finishedProductId);
      return `<option value="${r.id}">${escapeHtml(r.name || fp?.name || 'Receta')}</option>`;
    }).join('');
    elements.opModalBody.innerHTML = `
      <div class="op-editor" data-op-kind="${kind}">
        <div class="field">
          <label>Tipo de movimiento</label>
          <select data-op-kind-select>
            <option value="purchase" ${kind === 'purchase' ? 'selected' : ''}>Compra</option>
            <option value="sale" ${kind === 'sale' ? 'selected' : ''}>Venta</option>
            <option value="loss" ${kind === 'loss' ? 'selected' : ''}>Pérdida</option>
            <option value="expense" ${kind === 'expense' ? 'selected' : ''}>Gasto</option>
            <option value="production" ${kind === 'production' ? 'selected' : ''}>Producción</option>
          </select>
        </div>
        <div class="grid two">
          <div class="field"><label>Fecha</label><input data-op-field="date" type="date" value="${today}"></div>
          <div class="field"><label>Documento</label><input data-op-field="document" type="text" placeholder="F001-0001"></div>
        </div>
        <div class="op-block purchase-block ${kind === 'purchase' ? '' : 'hide'}">
          <div class="grid two">
            <div class="field"><label>Proveedor</label><input data-op-field="provider" type="text"></div>
            <div class="field"><label>Producto</label><select data-op-field="productId">${productOptions}</select></div>
          </div>
          <div class="grid three">
            <div class="field"><label>Cantidad</label><input data-op-field="qty" type="number" step="0.01"></div>
            <div class="field"><label>Costo unitario</label><input data-op-field="unitCost" type="number" step="0.01"></div>
            <div class="field"><label>IGV</label><input data-op-field="tax" type="number" step="0.01"></div>
          </div>
          <div class="field"><label>Tipo de compra</label>
            <select data-op-field="purchaseType">
              <option>Mercadería</option><option>Material Directo</option><option>Material Indirecto</option><option>Servicios</option><option>Activo fijo</option>
            </select>
          </div>
        </div>
        <div class="op-block sale-block ${kind === 'sale' ? '' : 'hide'}">
          <div class="grid two">
            <div class="field"><label>Cliente</label><input data-op-field="customer" type="text"></div>
            <div class="field"><label>Producto</label><select data-op-field="productId">${productOptions}</select></div>
          </div>
          <div class="grid three">
            <div class="field"><label>Cantidad</label><input data-op-field="qty" type="number" step="0.01"></div>
            <div class="field"><label>Precio unitario</label><input data-op-field="unitPrice" type="number" step="0.01"></div>
            <div class="field"><label>IGV</label><input data-op-field="tax" type="number" step="0.01"></div>
          </div>
        </div>
        <div class="op-block loss-block ${kind === 'loss' ? '' : 'hide'}">
          <div class="grid two">
            <div class="field"><label>Producto</label><select data-op-field="productId">${productOptions}</select></div>
            <div class="field"><label>Responsable</label><input data-op-field="responsible" type="text"></div>
          </div>
          <div class="grid two">
            <div class="field"><label>Cantidad</label><input data-op-field="qty" type="number" step="0.01"></div>
            <div class="field"><label>Motivo</label>
              <select data-op-field="reason">
                <option>Merma</option><option>Robo</option><option>Vencimiento</option><option>Daño</option><option>Producción defectuosa</option><option>Error humano</option><option>Desastre</option><option>Otro</option>
              </select>
            </div>
          </div>
          <div class="field"><label>Descripción</label><textarea data-op-field="description" rows="3"></textarea></div>
        </div>
        <div class="op-block expense-block ${kind === 'expense' ? '' : 'hide'}">
          <div class="grid two">
            <div class="field"><label>Grupo</label>
              <select data-op-field="group">
                ${Object.keys(DB.EXPENSE_GROUPS).map(g => `<option>${escapeHtml(g)}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Subgrupo</label><select data-op-field="subgroup"></select></div>
          </div>
          <div class="grid two">
            <div class="field"><label>Monto</label><input data-op-field="amount" type="number" step="0.01"></div>
            <div class="field"><label>Responsable</label><input data-op-field="responsible" type="text"></div>
          </div>
          <div class="field"><label>Descripción</label><textarea data-op-field="description" rows="3"></textarea></div>
        </div>
        <div class="op-block production-block ${kind === 'production' ? '' : 'hide'}">
          <div class="grid two">
            <div class="field"><label>Receta</label><select data-op-field="recipeId">${recipeOptions}</select></div>
            <div class="field"><label>Producto terminado</label><select data-op-field="finishedProductId">${productOptions}</select></div>
          </div>
          <div class="grid three">
            <div class="field"><label>Cantidad a producir</label><input data-op-field="qty" type="number" step="0.01"></div>
            <div class="field"><label>MOD</label><input data-op-field="modCost" type="number" step="0.01"></div>
            <div class="field"><label>CIF</label><input data-op-field="cifCost" type="number" step="0.01"></div>
          </div>
          <div class="field"><label>Notas</label><textarea data-op-field="note" rows="3"></textarea></div>
        </div>
      </div>
    `;
    const groupField = elements.opModalBody.querySelector('[data-op-field="group"]');
    if (groupField) {
      groupField.addEventListener('change', () => {
        const subgroup = elements.opModalBody.querySelector('[data-op-field="subgroup"]');
        subgroup.innerHTML = (DB.EXPENSE_GROUPS[groupField.value] || ['Otros']).map(x => `<option>${escapeHtml(x)}</option>`).join('');
      });
      groupField.dispatchEvent(new Event('change'));
    }
    toggleModal(elements.opModal, true);
  }

  function readOperationModal(kind) {
    const data = { kind };
    const read = (name) => elements.opModalBody.querySelector(`[data-op-field="${name}"]`)?.value || '';
    data.date = read('date') || today;
    data.document = read('document');
    if (kind === 'purchase') {
      data.provider = read('provider');
      data.productId = read('productId');
      data.productName = state().products.find(p => p.id === data.productId)?.name || '';
      data.qty = Number(read('qty') || 0);
      data.unitCost = Number(read('unitCost') || 0);
      data.tax = Number(read('tax') || 0);
      data.purchaseType = read('purchaseType');
    } else if (kind === 'sale') {
      data.customer = read('customer');
      data.productId = read('productId');
      data.productName = state().products.find(p => p.id === data.productId)?.name || '';
      data.qty = Number(read('qty') || 0);
      data.unitPrice = Number(read('unitPrice') || 0);
      data.tax = Number(read('tax') || 0);
    } else if (kind === 'loss') {
      data.productId = read('productId');
      data.productName = state().products.find(p => p.id === data.productId)?.name || '';
      data.qty = Number(read('qty') || 0);
      data.reason = read('reason');
      data.description = read('description');
      data.responsible = read('responsible');
    } else if (kind === 'expense') {
      data.group = read('group');
      data.subgroup = read('subgroup');
      data.amount = Number(read('amount') || 0);
      data.description = read('description');
      data.responsible = read('responsible');
      data.document = read('document');
    } else if (kind === 'production') {
      data.recipeId = read('recipeId');
      data.finishedProductId = read('finishedProductId');
      data.productId = data.finishedProductId;
      data.qty = Number(read('qty') || 0);
      data.modCost = Number(read('modCost') || 0);
      data.cifCost = Number(read('cifCost') || 0);
      data.totalCost = (data.modCost + data.cifCost);
      data.note = read('note');
    }
    return data;
  }

  function init() {
    setTheme(state().settings.theme || 'dark');
    elements.companyName.textContent = state().settings.companyName || 'ERP Pocket Demo SAC';

    const lastTab = state().settings.lastTab || 'dashboard';
    goTab(lastTab);

    elements.buyDate.value = today;
    elements.saleDate.value = today;
    elements.lossDate.value = today;
    elements.expDate.value = today;
    elements.kardexFrom.value = '';
    elements.kardexTo.value = '';

    productSelectOptions();
    renderExpenseSubgroups();
    setRecipeFromModal(null);
    renderCalendar();
    refresh();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      ui.installPrompt = e;
      elements.btnInstall.style.display = 'inline-flex';
    });

    window.addEventListener('resize', () => refresh());
    setTimeout(() => toggleModal(elements.splash, false), 1400);

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.closeModal;
        toggleModal($(target), false);
      });
    });
  }

  init();
  bindEvents();
})();

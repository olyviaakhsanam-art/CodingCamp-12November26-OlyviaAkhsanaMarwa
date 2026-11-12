// Expense & Budget Visualizer - vanilla JS, data saved in Local Storage
// Optional challenges: 1) custom categories  2) monthly summary  3) sort transactions
const KEY = 'expense-visualizer-v2';
const COLORS = ['#16a34a', '#2563eb', '#ea580c', '#9333ea', '#db2777', '#0891b2', '#ca8a04', '#64748b'];
const DEFAULT_CATS = ['Food', 'Transport', 'Fun']; // cannot be deleted
const NEW_CAT = '__new__'; // special option inside the category dropdown
const $ = (id) => document.getElementById(id);

let state = { tx: [], cats: ['Food', 'Transport', 'Fun'], sort: 'newest' };
let chart = null;

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const money = (n) => rupiah.format(n);
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) state = { ...state, ...saved };
  } catch (e) { /* ignore broken data */ }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
}

function renderCategories() {
  const select = $('category');
  const current = select.value;
  select.innerHTML = '';
  state.cats.forEach((c) => select.add(new Option(c, c)));
  select.add(new Option('+ Add new category...', NEW_CAT));
  if (state.cats.includes(current) || current === NEW_CAT) select.value = current;
  updateCatTools();
}

// Show the "new category" box or the "delete category" button depending on the selected option
function updateCatTools() {
  const v = $('category').value;
  const custom = state.cats.includes(v) && !DEFAULT_CATS.includes(v);
  $('newCatRow').hidden = v !== NEW_CAT;
  $('delCatRow').hidden = !custom;
  if (custom) $('delCat').textContent = 'Delete category "' + v + '"';
}

// ---- Sort (challenge 3) ----
function sortedTx() {
  const list = [...state.tx];
  const by = {
    newest: (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    amountDesc: (a, b) => b.amount - a.amount,
    amountAsc: (a, b) => a.amount - b.amount,
    category: (a, b) => a.category.localeCompare(b.category) || b.id - a.id
  };
  return list.sort(by[state.sort] || by.newest);
}

function renderList() {
  const list = $('list');
  list.innerHTML = '';
  if (!state.tx.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No transactions yet.';
    list.appendChild(li);
    return;
  }
  sortedTx().forEach((t) => {
    const li = document.createElement('li');
    li.className = 'item';
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = t.name;
    const val = document.createElement('span');
    val.className = 'val';
    val.textContent = money(t.amount);
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = t.category;
    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = t.date;
    info.append(name, val, tag, date);
    const del = document.createElement('button');
    del.className = 'del';
    del.type = 'button';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', 'Delete ' + t.name);
    del.addEventListener('click', () => {
      state.tx = state.tx.filter((x) => x.id !== t.id);
      save(); render();
    });
    li.append(info, del);
    list.appendChild(li);
  });
}

function renderTotal() {
  $('total').textContent = money(state.tx.reduce((sum, t) => sum + t.amount, 0));
}

// ---- Monthly summary (challenge 2) ----
function renderMonths() {
  const box = $('months');
  box.innerHTML = '';
  if (!state.tx.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'Monthly totals will appear here.';
    box.appendChild(li);
    return;
  }
  const months = {};
  state.tx.forEach((t) => {
    const key = t.date.slice(0, 7); // YYYY-MM
    months[key] = months[key] || { total: 0, cats: {} };
    months[key].total += t.amount;
    months[key].cats[t.category] = (months[key].cats[t.category] || 0) + t.amount;
  });
  Object.keys(months).sort().reverse().forEach((key) => {
    const [y, m] = key.split('-');
    const label = new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const li = document.createElement('li');
    li.className = 'month';
    const head = document.createElement('div');
    head.className = 'head';
    const a = document.createElement('span');
    a.textContent = label;
    const b = document.createElement('span');
    b.textContent = money(months[key].total);
    head.append(a, b);
    const cats = document.createElement('p');
    cats.className = 'cats';
    cats.textContent = Object.entries(months[key].cats).map(([c, v]) => c + ' ' + money(v)).join(', ');
    li.append(head, cats);
    box.appendChild(li);
  });
}

function renderChart() {
  // Only categories that already have spending are shown (no empty legend entries)
  const items = state.cats
    .map((c, i) => ({
      name: c,
      color: COLORS[i % COLORS.length],
      total: state.tx.filter((t) => t.category === c).reduce((s, t) => s + t.amount, 0)
    }))
    .filter((x) => x.total > 0);
  const has = items.length > 0;
  $('noChart').hidden = has;
  $('chart').parentElement.hidden = !has;
  if (typeof Chart === 'undefined') return;
  if (!chart) {
    chart = new Chart($('chart'), {
      type: 'pie',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 1 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }
  chart.data.labels = items.map((x) => x.name);
  chart.data.datasets[0].data = items.map((x) => x.total);
  chart.data.datasets[0].backgroundColor = items.map((x) => x.color);
  chart.update();
}

function render() { renderTotal(); renderList(); renderMonths(); renderChart(); }

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('name').value.trim();
  const amount = Math.round(parseFloat($('amount').value));
  const category = $('category').value;
  const date = $('date').value;
  if (!name || isNaN(amount) || !category || !date) {
    $('error').textContent = 'Fill in item name, amount, category, and date.';
    return;
  }
  if (category === NEW_CAT) {
    $('error').textContent = 'Add the new category first, or pick an existing one.';
    return;
  }
  if (amount <= 0) {
    $('error').textContent = 'Amount must be greater than 0.';
    return;
  }
  $('error').textContent = '';
  state.tx.push({ id: Date.now(), name, amount, category, date });
  save(); render();
  $('form').reset();
  $('category').value = category;
  $('date').value = date;
  $('name').focus();
});

// ---- Custom categories (challenge 1): "+ Add new category..." lives inside the dropdown ----
function addCategory() {
  const c = $('newCat').value.trim();
  if (!c) {
    $('error').textContent = 'Type a category name first.';
    return;
  }
  if (state.cats.some((x) => x.toLowerCase() === c.toLowerCase())) {
    $('error').textContent = 'That category already exists.';
    return;
  }
  $('error').textContent = '';
  state.cats.push(c);
  $('newCat').value = '';
  save(); renderCategories();
  $('category').value = c;
  updateCatTools();
  render();
}

$('category').addEventListener('change', () => {
  updateCatTools();
  $('error').textContent = '';
  if ($('category').value === NEW_CAT) $('newCat').focus();
});
$('delCat').addEventListener('click', () => {
  const c = $('category').value;
  if (DEFAULT_CATS.includes(c) || !state.cats.includes(c)) return;
  const used = state.tx.filter((t) => t.category === c).length;
  if (used && !confirm('Delete category "' + c + '" and its ' + used + ' transaction(s)?')) return;
  state.cats = state.cats.filter((x) => x !== c);
  state.tx = state.tx.filter((t) => t.category !== c);
  save(); renderCategories(); render();
});
$('addCat').addEventListener('click', addCategory);
$('newCat').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
});

$('sort').addEventListener('change', () => {
  state.sort = $('sort').value;
  save(); renderList();
});

window.addEventListener('DOMContentLoaded', () => {
  load();
  state.tx.forEach((t) => { if (!t.date) t.date = today(); });
  $('date').value = today();
  $('sort').value = state.sort;
  renderCategories(); render();
});
// Chart.js loads deferred; draw the chart again once everything is ready
window.addEventListener('load', renderChart);
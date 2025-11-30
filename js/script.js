// Modern calculator script: parser, UI bindings, memory, history, keyboard
(() => {
  const inputEl = document.getElementById('input');
  const resultEl = document.getElementById('result');
  const historyListEl = document.getElementById('historyList');
  const historyItemsEl = historyListEl && historyListEl.querySelector('.history-items');
  const sciPanel = document.getElementById('scientificPanel');
  const darkToggle = document.getElementById('darkToggle');
  const modeToggle = document.getElementById('modeToggle');
  const THEME_KEY = 'calc_theme_v1';

  let memory = 0;
  let history = []; // array of {expr, value}
  const HISTORY_KEY = 'calc_history_v1';
  let expr = '';
  let lastResult = null;

  // Show/hide scientific
  function updateScientific() {
    const calc = document.querySelector('.calculator');
    // On larger screens, expand the panel outside the main area; on small screens keep inline
    const large = window.innerWidth > 720;
    if(modeToggle.checked){
      sciPanel.style.display = 'grid';
      if(large){
        calc.classList.add('expanded-scientific');
        // position the panel near the calculator and keep it within viewport
        const calcRect = calc.getBoundingClientRect();
        const panelWidth = 260;
        // compute left so panel is adjacent to calculator, but not off-screen
        let left = Math.min(calcRect.right + 8, window.innerWidth - panelWidth - 8);
        // if calculator is too close to right edge, position it to the left of calculator
        if(left + panelWidth > window.innerWidth - 8) left = Math.max(8, calcRect.left - panelWidth - 8);
        // top aligned with calculator top + small offset
        let top = Math.max(8, calcRect.top + 8);
        sciPanel.style.position = 'fixed';
        sciPanel.style.left = left + 'px';
        sciPanel.style.top = top + 'px';
        sciPanel.style.maxHeight = (window.innerHeight - 24) + 'px';
      } else {
        calc.classList.remove('expanded-scientific');
        sciPanel.style.position = '';
        sciPanel.style.left = '';
        sciPanel.style.top = '';
        sciPanel.style.maxHeight = '';
      }
    } else {
      calc.classList.remove('expanded-scientific');
      sciPanel.style.display = 'none';
      sciPanel.style.position = '';
      sciPanel.style.left = '';
      sciPanel.style.top = '';
      sciPanel.style.maxHeight = '';
    }
  }

  // Persist and load history from localStorage
  function saveHistory(){
    try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }catch(e){ /* ignore */ }
  }
  function loadHistory(){
    try{
      const raw = localStorage.getItem(HISTORY_KEY);
      if(raw){ const parsed = JSON.parse(raw); if(Array.isArray(parsed)) history = parsed; }
    }catch(e){ history = []; }
    renderHistory();
  }

  // Theme persistence: load saved preference (if any), and persist on change
  function loadTheme(){
    try{
      const t = localStorage.getItem(THEME_KEY);
      if(t === 'dark') { darkToggle.checked = true; document.body.classList.add('dark'); }
      else if(t === 'light'){ darkToggle.checked = false; document.body.classList.remove('dark'); }
      else { /* no saved pref - respect system? keep current */ }
    }catch(e){}
  }
  loadTheme();

  darkToggle.addEventListener('change', e => {
    const isDark = !!e.target.checked;
    document.body.classList.toggle('dark', isDark);
    try{ localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); }catch(err){}
  });
  modeToggle.addEventListener('change', updateScientific);
  // Recompute layout on window resize so expanded state adapts
  window.addEventListener('resize', () => {
    // only update class when panel is open
    if(modeToggle.checked) updateScientific();
  });
  updateScientific();

  function setInput(v){ expr = String(v); inputEl.textContent = expr || '0'; }
  function appendInput(v){ expr = (expr || '') + v; inputEl.textContent = expr || '0'; }

  // Tokenizer + Shunting-yard Parser -> RPN evaluator
  function tokenize(s){
    const tokens = [];
    const re = /\s*([0-9]*\.?[0-9]+|pi|e|[A-Za-z]+|\^|\*|\/|\+|\-|\%|\(|\)|\!|\.)/g;
    let m; while((m=re.exec(s))){ tokens.push(m[1]); }
    return tokens;
  }

  const ops = {
    '+':{prec:2,assoc:'L',fn:(a,b)=>a+b},
    '-':{prec:2,assoc:'L',fn:(a,b)=>a-b},
    '*':{prec:3,assoc:'L',fn:(a,b)=>a*b},
    '/':{prec:3,assoc:'L',fn:(a,b)=>a/b},
    '%':{prec:3,assoc:'L',fn:(a,b)=>a*b/100},
    '^':{prec:4,assoc:'R',fn:(a,b)=>Math.pow(a,b)}
  };

  const functions = {
    'sqrt': v => Math.sqrt(v),
    'sin': v => Math.sin(v),
    'cos': v => Math.cos(v),
    'tan': v => Math.tan(v),
    'log': v => Math.log10(v),
    'ln': v => Math.log(v),
    'asin': v => Math.asin(v),
    'acos': v => Math.acos(v),
    'atan': v => Math.atan(v),
    'sinh': v => Math.sinh(v),
    'cosh': v => Math.cosh(v),
    'tanh': v => Math.tanh(v),
    'exp': v => Math.exp(v)
  };

  function factorial(n){ if(n<0) return NaN; if(n===0) return 1; let r=1; for(let i=1;i<=Math.floor(n);i++) r*=i; return r; }

  function toRPN(tokens){
    const out=[]; const stack=[];
    for(let i=0;i<tokens.length;i++){
      const t = tokens[i];
      if(!isNaN(t)) { out.push(Number(t)); continue; }
      if(t==='pi'){ out.push(Math.PI); continue; }
      if(t==='e'){ out.push(Math.E); continue; }
      if(functions[t]){ stack.push(t); continue; }
      if(t==='!'){ out.push('!'); continue; }
      if(t in ops){
        const o1 = t;
        while(stack.length){
          const o2 = stack[stack.length-1];
          if((o2 in ops) && ((ops[o2].prec > ops[o1].prec) || (ops[o2].prec===ops[o1].prec && ops[o1].assoc==='L'))){
            out.push(stack.pop());
          } else break;
        }
        stack.push(o1);
        continue;
      }
      if(t==='('){ stack.push(t); continue; }
      if(t===')'){
        while(stack.length && stack[stack.length-1] !== '(') out.push(stack.pop());
        if(stack.length && stack[stack.length-1]==='(') stack.pop();
        if(stack.length && functions[stack[stack.length-1]]) out.push(stack.pop());
        continue;
      }
      // unknown token
      throw new Error('Unknown token: '+t);
    }
    while(stack.length) out.push(stack.pop());
    return out;
  }

  function evalRPN(rpn){
    const st=[];
    for(const t of rpn){
      if(typeof t === 'number') { st.push(t); continue; }
      if(t === '!'){
        const a = st.pop(); st.push(factorial(a)); continue;
      }
      if(functions[t]){
        const a = st.pop(); st.push(functions[t](a)); continue;
      }
      if(t in ops){
        const b = st.pop(); const a = st.pop(); if(a===undefined||b===undefined) throw new Error('Invalid expression');
        if((t==='/' || t==='*' || t==='%') && b===0 && t==='/'){
          // division by zero handled below
        }
        st.push(ops[t].fn(a,b)); continue;
      }
      throw new Error('Unexpected RPN token: '+t);
    }
    if(st.length!==1) throw new Error('Invalid expression');
    return st[0];
  }

  function safeEvaluate(exprStr){
    try{
      if(!exprStr || exprStr.trim()==='') return 0;
      // Normalize visual operators and whitespace
      let normalized = exprStr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi');

      // Handle unary minus (leading or after open paren): replace '(-' with '(0-'
      normalized = normalized.replace(/(^|\()\-/g, '$1 0-');

      // Implicit multiplication: between number and '(', number and constant/function, or ')' and number/function
      normalized = normalized.replace(/(\d)\s*\(/g, '$1*(');
      normalized = normalized.replace(/(\d)\s*(?=[a-zA-Z])/g, '$1*');
      normalized = normalized.replace(/\)(?=\d|[a-zA-Z])/g, ')*');

      const tokens = tokenize(normalized);
      const rpn = toRPN(tokens);
      const val = evalRPN(rpn);
      if(!isFinite(val)) throw new Error('Math error');
      return val;
    }catch(err){ throw err; }
  }

  // UI actions
  document.querySelectorAll('[data-value]').forEach(btn => {
    btn.addEventListener('click', () => { appendInput(btn.dataset.value); });
  });
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action));
  });

  function handleAction(action){
    if(action==='clear'){ expr=''; setInput(''); resultEl.textContent=''; }
    else if(action==='back'){ expr = expr.slice(0,-1); setInput(expr); }
    else if(action==='equals'){
        try{
          const value = safeEvaluate(expr);
          resultEl.textContent = value;
          lastResult = value;
          history.unshift({expr: expr, value: value});
          if(history.length>50) history.pop();
          saveHistory();
          renderHistory();
        }catch(e){ resultEl.textContent = 'Error'; }
    }
    else if(action==='percent'){
      // Convert last number to percentage (divide by 100)
      const m = expr.match(/(\d*\.?\d+)\s*$/);
      if(m){ const num = parseFloat(m[1]); const start = m.index; expr = expr.slice(0,start) + String(num/100); setInput(expr); }
      else { appendInput('%'); }
    }
    else if(action==='negate'){
      // Toggle sign of last number or entire expression
      const m = expr.match(/(\d*\.?\d+)\s*$/);
      if(m){ const num = parseFloat(m[1]); const start = m.index; const neg = String(-num); expr = expr.slice(0,start) + neg; setInput(expr); }
      else { if(expr.startsWith('-')) expr = expr.slice(1); else expr = '-' + expr; setInput(expr); }
    }
    else if(action==='recip'){
      // reciprocal of last number or of whole expression/last result
      const m = expr.match(/(\d*\.?\d+|pi|e)\s*$/);
      if(m){ const num = (m[1]==='pi'?Math.PI:(m[1]==='e'?Math.E:parseFloat(m[1])));
        const start = m.index; const val = 1/num; expr = expr.slice(0,start) + String(val); setInput(expr); resultEl.textContent = val; lastResult = val; saveHistory(); }
      else if(lastResult!==null){ const val = 1/Number(lastResult); setInput(String(val)); resultEl.textContent = val; lastResult = val; saveHistory(); }
    }
    else if(action==='square'){
      const m = expr.match(/(\d*\.?\d+|pi|e)\s*$/);
      if(m){ const num = (m[1]==='pi'?Math.PI:(m[1]==='e'?Math.E:parseFloat(m[1]))); const start = m.index; const val = num*num; expr = expr.slice(0,start) + String(val); setInput(expr); resultEl.textContent = val; lastResult = val; saveHistory(); }
      else if(lastResult!==null){ const val = Number(lastResult)*Number(lastResult); setInput(String(val)); resultEl.textContent = val; lastResult = val; saveHistory(); }
    }
    else if(action==='ans'){
      if(lastResult!==null) appendInput(String(lastResult));
    }
    else if(action==='mc'){ memory = 0; }
    else if(action==='mr'){ setInput(String(memory)); resultEl.textContent=''; }
    else if(action==='mplus'){ try{ memory = Number((safeEvaluate(expr) || 0) + memory); }catch(e){} }
    else if(action==='mminus'){ try{ memory = Number(memory - (safeEvaluate(expr) || 0)); }catch(e){} }
    else if(action==='copy'){ if(lastResult!==null) navigator.clipboard?.writeText(String(lastResult)); }
    else if(action==='clearHistory'){ history = []; saveHistory(); renderHistory(); }
  }

  function renderHistory(){
    if(!historyItemsEl) return;
    historyItemsEl.innerHTML = '';
    history.forEach((h, idx) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.title = h.expr + ' = ' + h.value;

      const exprSpan = document.createElement('span'); exprSpan.className = 'expr'; exprSpan.textContent = h.expr;
      const valSpan = document.createElement('small'); valSpan.className = 'val'; valSpan.textContent = h.value;
      const actions = document.createElement('div'); actions.className = 'actions';

      const btnCopy = document.createElement('button'); btnCopy.type='button'; btnCopy.className='history-action'; btnCopy.title='Copy result'; btnCopy.textContent='Copy';
      btnCopy.addEventListener('click', (ev)=>{ ev.stopPropagation(); navigator.clipboard?.writeText(String(h.value)); });

      const btnInsert = document.createElement('button'); btnInsert.type='button'; btnInsert.className='history-action'; btnInsert.title='Insert expression'; btnInsert.textContent='Use';
      btnInsert.addEventListener('click', (ev)=>{ ev.stopPropagation(); setInput(h.expr); resultEl.textContent = h.value; lastResult = h.value; });

      const btnDelete = document.createElement('button'); btnDelete.type='button'; btnDelete.className='history-action'; btnDelete.title='Delete'; btnDelete.textContent='Del';
      btnDelete.addEventListener('click', (ev)=>{ ev.stopPropagation(); history.splice(idx,1); saveHistory(); renderHistory(); });

      actions.appendChild(btnCopy); actions.appendChild(btnInsert); actions.appendChild(btnDelete);

      item.appendChild(exprSpan);
      item.appendChild(valSpan);
      item.appendChild(actions);

      // clicking the row inserts the expression
      item.addEventListener('click', ()=>{ setInput(h.expr); resultEl.textContent = h.value; lastResult = h.value; });
      historyItemsEl.appendChild(item);
    });
  }

  function escapeHtml(str){
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // keyboard
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if((/^[0-9.]$/.test(key))){ appendInput(key); e.preventDefault(); return; }
    if(key==='Enter'){ handleAction('equals'); e.preventDefault(); return; }
    if(key==='Backspace'){ handleAction('back'); e.preventDefault(); return; }
    if(key.toLowerCase()==='c'){ handleAction('clear'); }
    const map = {'+':'+','-':'-','*':'*','/':'/','%':'percent','^':'^','(':'(',')':')','p':'pi'};
    const mapped = map[key];
    if(mapped){
      if(mapped === 'percent' || mapped === 'equals' || mapped === 'negate'){ handleAction(mapped); }
      else { appendInput(mapped); }
      e.preventDefault();
    }
  });

  // init
  setInput('');
  loadHistory();
})();

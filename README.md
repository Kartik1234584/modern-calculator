# Modern Calculator

A responsive, modern calculator built with HTML, CSS and JavaScript.

Features
- Basic operations: + − × ÷
- Advanced: %, ^, √, factorial
- Scientific functions: sin, cos, tan, log, ln, π, e
- Memory: M+, M-, MR, MC
- Keyboard support, copy result, history
- Dark mode and scientific mode toggles
- Degrees/radians toggle for trig

How to run
- Open `index.html` in your browser (double-click or `Start-Process 'index.html'` in PowerShell).
- Or serve with Python: `python -m http.server 8000` then open `http://localhost:8000`.

Notes
- Trigonometric functions default to degrees when `Deg` toggle is on.
- The calculator uses a custom parser for safe evaluations.

Files
- `index.html` — UI
- `css/styles.css` — styles and animations
- `js/script.js` — calculator logic and parser

Accessibility
- Buttons have clear labels and the display uses `aria-live` for updates.
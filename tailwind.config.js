/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      // Únicos breakpoints de la app (antes solo en admin-layout.component.css): el sidebar
      // pasa a modo off-canvas por debajo de 900px, y el padding se ajusta de nuevo en 480px.
      // Se nombran acá (en vez de repetir `max-[900px]:` suelto varias veces en el template)
      // porque son el mismo valor de marca reutilizado en varias reglas de una misma pantalla.
      screens: {
        'max-900': { max: '900px' },
        'max-480': { max: '480px' },
      },
      // Todos los colores apuntan a las custom properties de src/styles.css (:root),
      // que ya resuelven light/dark vía `@media (prefers-color-scheme: dark)`. Por eso
      // no usamos la variante `dark:` de Tailwind en ningún lado: el theming sigue
      // ocurriendo enteramente en CSS, Tailwind solo referencia esas variables.
      colors: {
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',
        border: 'var(--color-border)',
        foreground: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
      },
      // 10px se repite en cards/paneles de toda la app (dashboard, campos, usuarios,
      // sistema, alertas) y no coincide con ningún paso por defecto de Tailwind
      // (rounded-lg=8px, rounded-xl=12px) — token de marca real, no un valor arbitrario.
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: 'var(--shadow-sm)',
      },
      // Ancho fijo del sidebar (admin-layout), también un token de marca repetido.
      width: {
        sidebar: 'var(--sidebar-width)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

# Diseño

YunitzTech ayuda a mipymes a desarrollar una primera versión útil de sus productos digitales. La acción principal es iniciar una conversación sobre una idea. Los textos y servicios editables proceden del panel; no se incorporan las métricas, testimonios ni casos de éxito de ejemplo del mock sin evidencia.

## Dirección visual

La dirección visual se adapta de `/Users/user/Projects/IA/OpenCode/DeepSeek4.1_Flash/YunitzTech` y su mock `YunitzTech-Mock.png`:

- **Paleta y tokens:** Fondos crema (`#fefaf7`), melocotón (`#feebda`) y rubor (`#fcf2ee`), tinta azul oscuro (`#0d1038`), texto secundario (`#71768c`), acento ciruela (`#302063` y `#221545`), rosa (`#9c244b` / `#fbe5e5`) y lila (`#6d5bd0` / `#edeafb`).
- **Tipografía:** Plus Jakarta Sans Variable para titulares y marca, Inter Variable para cuerpo de texto y navegación, ambas autoalojadas con Fontsource.
- **Hero:** Portada de dos columnas con máscara orgánica (`#hero-photo-clip`), tarjetas de valor auténtico (sin métricas inventadas), tres píldoras de características y botones principal y secundario.
- **Tira de enfoque / tecnología:** Delimitada por bordes sutiles (`#f1e7e1`), destacando tipos de negocios y tecnologías clave.
- **Servicios:** Fondo rubor (`blush-wash`), encabezado con gradiente rosa (`text-gradient-rose`), y tarjetas `ServiceCard` que utilizan el componente shadcn `Card` en servidor. La asociación entre servicios e imágenes se realiza mediante resolución semántica por palabras clave multilingüe (`resolveServiceMeta`), garantizando la correspondencia exacta ante reordenaciones o ediciones en los cinco idiomas, con respaldo determinista para nuevos servicios.
- **Explicación MVP:** Superficie melocotón (`peach-wash`), lista de comprobación con iconos circulares y enlace al artículo educativo.
- **Proceso:** Tres pasos secuenciales con insignias circulares numeradas, conectores con flecha en pantallas grandes y tipografía distintiva.
- **Blog:** Tres artículos recientes con tarjeta moderna, etiqueta de categoría, extracto y enlace con flecha interactiva.
- **Contacto:** Banner `cta-mesh` en ciruela profundo con curvas orgánicas decorativas, mensaje de tranquilidad ("Sin compromiso. Te respondemos en menos de 24 horas"), y formulario accesible con campos estilizados, anillo de foco lila y contraste conforme a WCAG 2.2 AA.
- **Cabecera y pie:** Cabecera adhesiva con efecto de desenfoque (`backdrop-blur`), isotipo SVG estilizado de marca, navegación principal y selector de idiomas accesible con banderas para los cinco idiomas (ES, EN, FR, DE, PT). Pie de página con enlaces, créditos y mensaje localizado.

## Activos y derechos

- Las seis imágenes de servicios proceden del directorio `public/images` del proyecto de referencia (Unsplash). Sus identificadores y licencias se documentan en [IMAGES.md](IMAGES.md).
- Antes de publicar en producción, se recomienda sustituir las fotografías de demostración por fotografía propia o licenciada para la marca.

## Accesibilidad y compatibilidad

- Conformidad verificada con WCAG 2.2 AA (cero violaciones en Axe).
- Navegación por teclado completa: enlace "Saltar al contenido" funcional (`#main`), foco visible, indicadores de estado de formulario en regiones vivas (`aria-live="polite"`).
- Diseño responsive probado a 320×568, 390×844, 768×1024 y 1440×900 sin desbordamiento horizontal (`scrollWidth === clientWidth`).
- Renderizado completo en servidor (Astro SSR con Node), sin hidratación de cliente innecesaria para componentes estáticos.

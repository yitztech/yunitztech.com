# language: es
@api @analitica
Característica: Analítica de visitas sin cookies

  Esquema del escenario: Se registran visitas a rutas públicas (<ruta>) #<n>
    Cuando envío POST a "/api/view" con el JSON:
      """
      {"path":"<ruta>","referrer":""}
      """
    Entonces la respuesta tiene el estado 201

    Ejemplos:
      | n | ruta          |
      | 1 | /             |
      | 2 | /en/          |
      | 3 | /fr/blog      |
      | 4 | /de/blog/mi-post-1 |
      | 5 | /pt/blog/     |

  Esquema del escenario: Se rechazan rutas no públicas o mal formadas (<ruta>) #<n>
    Cuando envío POST a "/api/view" con el JSON:
      """
      {"path":"<ruta>","referrer":""}
      """
    Entonces la respuesta tiene el estado 400

    Ejemplos:
      | n | ruta               |
      | 1 | /admin             |
      | 2 | /en/admin          |
      | 3 | //evil.example     |
      | 4 | /blog/Mayusculas   |
      | 5 | /it/               |
      | 6 | x                  |

  Escenario: Un referrer de más de 2048 caracteres se rechaza
    Cuando envío POST a "/api/view" con el JSON:
      """
      {"path":"/","referrer":"https://example.test/@repeat(a,2100)"}
      """
    Entonces la respuesta tiene el estado 400

  Escenario: Un referrer que no es URL se registra como directo
    Cuando envío POST a "/api/view" con el JSON:
      """
      {"path":"/","referrer":"no es una url"}
      """
    Entonces la respuesta tiene el estado 201

  Escenario: Faltan campos obligatorios
    Cuando envío POST a "/api/view" con el JSON:
      """
      {"path":"/"}
      """
    Entonces la respuesta tiene el estado 400

  Escenario: El administrador ve las métricas agregadas
    Entonces el panel del administrador expone las métricas de visitas

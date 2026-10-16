# language: es
@api @salud
Característica: Salud y comportamiento base de la API

  Escenario: El servicio informa que está sano
    Cuando hago GET a "/api/health"
    Entonces la respuesta tiene el estado 200
    Y el campo "ok" del cuerpo es "true"

  Escenario: Las respuestas de la API no se almacenan en caché
    Cuando hago GET a "/api/health"
    Entonces la cabecera "cache-control" de la respuesta contiene "no-store"

  Escenario: Una ruta inexistente responde 404
    Cuando hago GET a "/api/no-existe"
    Entonces la respuesta tiene el estado 404

  Esquema del escenario: La configuración pública existe para cada idioma <idioma> #<n>
    Cuando hago GET a "/api/site/<idioma>"
    Entonces la respuesta tiene el estado 200
    Y la configuración pública tiene titular, descripción, imagen y al menos un servicio

    Ejemplos:
      | n | idioma |
      | 1 | es     |
      | 2 | en     |
      | 3 | fr     |
      | 4 | de     |
      | 5 | pt     |

  Esquema del escenario: Un idioma no soportado se rechaza (<idioma>) #<n>
    Cuando hago GET a "/api/site/<idioma>"
    Entonces la respuesta tiene el estado 400
    Cuando hago GET a "/api/posts/<idioma>"
    Entonces la respuesta tiene el estado 400

    Ejemplos:
      | n | idioma |
      | 1 | it     |
      | 2 | ES     |
      | 3 | xx     |
      | 4 | es-ES  |

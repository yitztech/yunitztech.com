# language: es
@api @contactos @ciclo
Característica: Ciclo de vida de una solicitud de contacto
  Registro, seguimiento, cierre y baja de una solicitud, de punta a punta.

  Escenario: Una solicitud recorre todo su ciclo
    Dado que un visitante envió una solicitud de contacto válida
    Y que soy administrador autenticado
    Entonces el contacto aparece en la bandeja del administrador con estado "new"
    Cuando cambio el estado del contacto a "in-progress"
    Entonces la respuesta tiene el estado 200
    Y el contacto aparece en la bandeja del administrador con estado "in-progress"
    Cuando cambio el estado del contacto a "closed"
    Entonces la respuesta tiene el estado 200
    Y el contacto aparece en la bandeja del administrador con estado "closed"
    Cuando cambio el estado del contacto a "new"
    Entonces el contacto aparece en la bandeja del administrador con estado "new"
    Cuando elimino el contacto
    Entonces la respuesta tiene el estado 200
    Y el contacto no aparece en la bandeja del administrador

  Esquema del escenario: Un estado inválido (<estado>) se rechaza y no cambia el contacto #<n>
    Dado que un visitante envió una solicitud de contacto válida
    Y que soy administrador autenticado
    Y el contacto aparece en la bandeja del administrador con estado "new"
    Cuando cambio el estado del contacto a "<estado>"
    Entonces la respuesta tiene el estado 400
    Y el contacto aparece en la bandeja del administrador con estado "new"

    Ejemplos:
      | n | estado    |
      | 1 | cancelled |
      | 2 | done      |
      | 3 | NEW       |
      | 4 | closed;-- |
      | 5 | @empty    |

  Esquema del escenario: Un identificador inválido (<id>) se rechaza #<n>
    Dado que soy administrador autenticado
    Cuando envío PUT a "/api/admin/contact/<id>" con el JSON:
      """
      {"status":"closed"}
      """
    Entonces la respuesta tiene el estado 400
    Cuando hago DELETE a "/api/admin/contact/<id>"
    Entonces la respuesta tiene el estado 400

    Ejemplos:
      | n | id         |
      | 1 | 0          |
      | 2 | -1         |
      | 3 | abc        |
      | 4 | 1.5        |
      | 5 | 2147483648 |
      | 6 | 99999999999999999999 |

  Escenario: El cuerpo del cambio de estado debe ser un objeto con estado
    Dado que soy administrador autenticado
    Cuando envío PUT a "/api/admin/contact/1" con el JSON:
      """
      {}
      """
    Entonces la respuesta tiene el estado 400

# language: es
@api @settings @configuracion
Característica: Configuración editable del sitio

  Escenario: El administrador actualiza el titular y los servicios y lo restaura
    Dado que soy administrador autenticado
    Cuando guardo la configuración original de "es"
    Y actualizo la configuración de "es" con titular "Titular de prueba de QA" y 3 servicios
    Entonces la respuesta tiene el estado 200
    Y la configuración pública de "es" tiene el titular "Titular de prueba de QA"
    Cuando restauro la configuración original
    Entonces la respuesta tiene el estado 200
    Y la configuración pública de "es" no cambió

  Esquema del escenario: Valores en el límite se aceptan (<descripción>) #<n>
    Dado que soy administrador autenticado
    Cuando guardo la configuración original de "en"
    Y actualizo la configuración de "en" con titular "<titular>" y <servicios> servicios
    Entonces la respuesta tiene el estado 200
    Cuando restauro la configuración original
    Entonces la configuración pública de "en" no cambió

    Ejemplos:
      | n | descripción         | titular                 | servicios |
      | 1 | un servicio         | Titular válido de QA    | 1         |
      | 2 | doce servicios      | Titular válido de QA    | 12        |

  Esquema del escenario: Valores inválidos se rechazan y no cambian nada (<descripción>) #<n>
    Dado que soy administrador autenticado
    Cuando guardo la configuración original de "fr"
    Y actualizo la configuración de "fr" con titular "<titular>" y <servicios> servicios
    Entonces la respuesta tiene el estado 400
    Y la configuración pública de "fr" no cambió

    Ejemplos:
      | n | descripción      | titular         | servicios |
      | 1 | sin servicios    | Titular de QA ok | 0         |
      | 2 | trece servicios  | Titular de QA ok | 13        |
      | 3 | titular corto    | corto           | 1         |

  Escenario: Titular demasiado largo
    Dado que soy administrador autenticado
    Cuando guardo la configuración original de "de"
    Y actualizo la configuración de "de" con el titular de 181 caracteres
    Entonces la respuesta tiene el estado 400
    Y la configuración pública de "de" no cambió

  Escenario: Descripción demasiado larga
    Dado que soy administrador autenticado
    Cuando guardo la configuración original de "pt"
    Y actualizo la configuración de "pt" con la descripción de 401 caracteres
    Entonces la respuesta tiene el estado 400
    Y la configuración pública de "pt" no cambió

  Escenario: Una imagen externa se rechaza
    Dado que soy administrador autenticado
    Cuando guardo la configuración original de "es"
    Y actualizo la configuración de "es" con la imagen "https://evil.example/a.webp"
    Entonces la respuesta tiene el estado 400
    Y la configuración pública de "es" no cambió

  Escenario: Un idioma no soportado se rechaza al actualizar
    Dado que soy administrador autenticado
    Cuando envío PUT a "/api/admin/site/it" con el JSON:
      """
      {}
      """
    Entonces la respuesta tiene el estado 400

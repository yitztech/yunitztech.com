# language: es
@web @contacto
Característica: Formulario de contacto del sitio

  Escenario: Un visitante envía su idea en español
    Dado que abro la portada en "es"
    Cuando completo el formulario de contacto con datos válidos
    Y acepto la política de privacidad
    Y envío el formulario
    Entonces el formulario confirma el envío en "es"
    Y el contacto enviado figura en la bandeja del administrador

  Esquema del escenario: El formulario funciona en <idioma> #<n>
    Dado que abro la portada en "<idioma>"
    Cuando completo el formulario de contacto con datos válidos
    Y acepto la política de privacidad
    Y envío el formulario
    Entonces el formulario confirma el envío en "<idioma>"
    Y el contacto enviado figura en la bandeja del administrador

    Ejemplos:
      | n | idioma |
      | 1 | en     |
      | 2 | fr     |
      | 3 | de     |
      | 4 | pt     |

  Esquema del escenario: El navegador impide enviar datos incompletos (<campo>=<valor>) #<n>
    Dado que abro la portada en "es"
    Cuando completo el formulario de contacto con el campo "<campo>" igual a "<valor>"
    Y acepto la política de privacidad
    Y envío el formulario
    Entonces el formulario no es válido para el navegador
    Y no se envía ninguna petición al servidor

    Ejemplos:
      | n | campo   | valor            |
      | 1 | name    | A                |
      | 2 | name    |                  |
      | 3 | email   | no-es-un-correo  |
      | 4 | email   |                  |
      | 5 | message | demasiado corto  |
      | 6 | message |                  |

  Escenario: Sin aceptar la política de privacidad no se envía
    Dado que abro la portada en "es"
    Cuando completo el formulario de contacto con datos válidos
    Y envío el formulario
    Entonces el formulario no es válido para el navegador
    Y no se envía ninguna petición al servidor

  Esquema del escenario: El servidor rechaza lo que el navegador deja pasar (<campo>=<valor>) #<n>
    Dado que abro la portada en "es"
    Cuando completo el formulario de contacto con el campo "<campo>" igual a "<valor>"
    Y acepto la política de privacidad
    Y envío el formulario
    Entonces el formulario muestra el error de envío en "es"
    Y el contacto enviado no figura en la bandeja del administrador

    Ejemplos:
      | n | campo   | valor                       |
      | 1 | name    | Ana123                      |
      | 2 | name    | <script>alert(1)</script>   |
      | 3 | company | <b>Acme</b>                 |

  Esquema del escenario: El campo <campo> declara los mismos límites que el backend #<n>
    Dado que abro la portada en "es"
    Entonces el campo "<campo>" de "#contact-form" respeta los límites del backend

    Ejemplos:
      | n | campo   |
      | 1 | name    |
      | 2 | email   |
      | 3 | company |
      | 4 | message |

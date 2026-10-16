# language: es
@web @admin
Característica: Panel de administración

  Escenario: Acceso correcto y cierre de sesión
    Dado que abro el panel de administración
    Cuando inicio sesión con las credenciales de administrador
    Entonces veo el panel de administración
    Cuando cierro sesión desde el panel
    Entonces vuelvo al formulario de acceso
    Y recargar el panel no restablece la sesión

  Escenario: Una contraseña incorrecta no da acceso
    Dado que abro el panel de administración
    Cuando inicio sesión con una contraseña incorrecta
    Entonces sigo viendo el formulario de acceso con un error

  Escenario: Ciclo completo de una solicitud desde el panel
    Dado que un visitante envió una solicitud de contacto válida
    Y que inicié sesión en el panel
    Cuando abro la pestaña "Contactos"
    Entonces la solicitud aparece en la bandeja del panel
    Cuando cambio el estado de la solicitud a "in-progress" en el panel
    Entonces la solicitud tiene el estado "in-progress" en el servidor
    Cuando cambio el estado de la solicitud a "closed" en el panel
    Entonces la solicitud tiene el estado "closed" en el servidor
    Cuando elimino la solicitud desde el panel
    Entonces la solicitud ya no existe en el servidor

  Escenario: Cancelar la confirmación conserva la solicitud
    Dado que un visitante envió una solicitud de contacto válida
    Y que inicié sesión en el panel
    Cuando abro la pestaña "Contactos"
    Y elimino la solicitud pero cancelo la confirmación
    Entonces la solicitud sigue existiendo en el servidor

  Esquema del escenario: El editor de artículos declara los mismos límites que el backend (<campo>) #<n>
    Dado que inicié sesión en el panel
    Cuando abro la pestaña "Artículos"
    Entonces el campo "<campo>" de "#post-form" respeta los límites del backend

    Ejemplos:
      | n | campo           |
      | 1 | translation_key |
      | 2 | slug            |
      | 3 | title           |
      | 4 | excerpt         |
      | 5 | body            |
      | 6 | image_alt       |

  Esquema del escenario: El editor de portada declara los mismos límites que el backend (<campo>) #<n>
    Dado que inicié sesión en el panel
    Cuando abro la pestaña "Sitio e imágenes"
    Entonces el campo "<campo>" de "#site-form" respeta los límites del backend

    Ejemplos:
      | n | campo       |
      | 1 | headline    |
      | 2 | description |

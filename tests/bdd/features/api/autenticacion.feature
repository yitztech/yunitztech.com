# language: es
@api @auth
Característica: Autenticación y acceso al panel de administración

  Escenario: Inicio de sesión correcto
    Cuando inicio sesión con las credenciales correctas
    Entonces la respuesta tiene el estado 201
    Y la cookie de sesión es HttpOnly, SameSite=Strict y limitada a la ruta de la API
    Y el panel responde con el estado 200

  Escenario: El correo del administrador no distingue mayúsculas
    Cuando inicio sesión con las credenciales correctas en mayúsculas
    Entonces la respuesta tiene el estado 201

  Escenario: Contraseña incorrecta
    Cuando inicio sesión con el correo "ci@example.test" y la contraseña "contraseña-incorrecta"
    Entonces la respuesta tiene el estado 401
    Y no se establece ninguna cookie de sesión
    Y el panel responde con el estado 401

  Escenario: Usuario inexistente da el mismo error que contraseña incorrecta
    Cuando inicio sesión con el correo "no-existe@example.test" y la contraseña "cualquier-cosa-1234"
    Entonces la respuesta tiene el estado 401
    Y el mensaje de error es el mismo que con un usuario inexistente

  Esquema del escenario: Credenciales mal formadas se rechazan (<campo>=<valor>) #<n>
    Cuando inicio sesión con el campo "<campo>" igual a "<valor>"
    Entonces la respuesta tiene el estado 400
    Y no se establece ninguna cookie de sesión

    Ejemplos:
      | n | campo    | valor            |
      | 1 | email    | no-es-correo     |
      | 2 | email    | @empty           |
      | 3 | email    | @missing         |
      | 4 | password | @empty           |
      | 5 | password | @missing         |
      | 6 | password | @repeat(a,201)   |

  Escenario: Una cookie de sesión falsa no da acceso
    Cuando consulto el panel con una cookie de sesión falsa
    Entonces la respuesta tiene el estado 401

  Escenario: Cerrar sesión invalida el token en el servidor
    Cuando inicio sesión con las credenciales correctas
    Y cierro sesión
    Y consulto el panel con el token de sesión anterior
    Entonces la respuesta tiene el estado 401

  Escenario: Tras 5 intentos fallidos el sexto se bloquea
    Cuando intento iniciar sesión 6 veces con una contraseña incorrecta
    Entonces la última respuesta fue rechazada por límite de tasa

  Escenario: El inicio de sesión desde otro origen se rechaza
    Cuando envío POST a "/api/login" desde el origen "https://evil.example" con el JSON:
      """
      {"email":"ci@example.test","password":"x"}
      """
    Entonces la respuesta tiene el estado 403

  Esquema del escenario: Sin sesión, <método> <ruta> exige autenticación #<n>
    Dado que no he iniciado sesión
    Cuando envío <método> a "<ruta>" con el JSON:
      """
      {}
      """
    Entonces la respuesta tiene el estado 401

    Ejemplos:
      | n | método | ruta                  |
      | 1 | PUT    | /api/admin/contact/1  |
      | 2 | DELETE | /api/admin/contact/1  |
      | 3 | POST   | /api/admin/posts      |
      | 4 | PUT    | /api/admin/posts/1    |
      | 5 | PUT    | /api/admin/site/es    |

  Escenario: Sin sesión no se pueden leer los datos del panel
    Cuando hago GET a "/api/admin/data"
    Entonces la respuesta tiene el estado 401

  Escenario: Sin sesión no se pueden subir imágenes
    Cuando subo una imagen PNG sin sesión
    Entonces la respuesta tiene el estado 401

# language: es
@api @contacto
Característica: Registro de solicitudes de contacto
  Un visitante envía su idea; el equipo la recibe validada y sin datos peligrosos.

  Escenario: Un visitante envía una solicitud válida
    Cuando envío una solicitud de contacto válida
    Entonces la respuesta tiene el estado 201
    Y el contacto aparece en la bandeja del administrador con estado "new"

  Escenario: El nombre y el correo se normalizan al guardarse
    Cuando envío una solicitud de contacto con el campo "name" igual a "  Ana María  "
    Entonces la respuesta tiene el estado 201
    Y el contacto guardado conserva el nombre "Ana María"

  Escenario: El correo se guarda en minúsculas y sin espacios
    Cuando envío una solicitud de contacto con el campo "email" igual a "  QA-Normalizado@Example.TEST "
    Entonces la respuesta tiene el estado 201
    Y existe en la bandeja un contacto con el correo "qa-normalizado@example.test"

  Escenario: El campo trampa para bots se acepta en silencio pero no se guarda
    Cuando envío una solicitud de contacto con el campo "website" igual a "http://spam.test"
    Entonces la respuesta tiene el estado 201
    Y el contacto no aparece en la bandeja del administrador

  Esquema del escenario: Se acepta el idioma <idioma> #<n>
    Cuando envío una solicitud de contacto con el campo "locale" igual a "<idioma>"
    Entonces la respuesta tiene el estado 201

    Ejemplos:
      | n | idioma |
      | 1 | es     |
      | 2 | en     |
      | 3 | fr     |
      | 4 | de     |
      | 5 | pt     |

  Esquema del escenario: Valores en el límite se aceptan (<campo>) #<n>
    Cuando envío una solicitud de contacto con el campo "<campo>" igual a "<valor>"
    Entonces la respuesta tiene el estado 201

    Ejemplos: nombres, empresa, servicio y mensaje
      | n | campo   | valor                      |
      | 1 | name    | @repeat(a,2)               |
      | 2 | name    | @repeat(a,100)             |
      | 3 | name    | José Ángel Núñez-Peña      |
      | 4 | name    | 李小龍                     |
      | 5 | name    | Мария Иванова              |
      | 6 | name    | D’Artagnan O'Brien         |
      | 7 | name    | Dr. Smith                  |
      | 8 | company | @empty                     |
      | 9 | company | @repeat(a,150)             |
      | 10 | company | Acme & Sons, S.L.          |
      | 11 | service | @repeat(a,2)               |
      | 12 | service | @repeat(a,100)             |
      | 13 | message | @repeat(a,20)              |
      | 14 | message | @repeat(a,5000)            |

  Esquema del escenario: Valores inválidos se rechazan señalando el campo (<campo>) #<n>
    Cuando envío una solicitud de contacto con el campo "<campo>" igual a "<valor>"
    Entonces la respuesta tiene el estado 400
    Y el error señala el campo "<campo>"
    Y el contacto no aparece en la bandeja del administrador

    Ejemplos: longitud
      | n | campo   | valor            |
      | 1 | name    | A                |
      | 2 | name    | @repeat(a,101)   |
      | 3 | name    | @empty           |
      | 4 | name    | @missing         |
      | 5 | email   | @repeat(a,250)@example.com |
      | 6 | company | @repeat(a,151)   |
      | 7 | service | A                |
      | 8 | service | @repeat(a,101)   |
      | 9 | service | @missing         |
      | 10 | message | @repeat(a,19)    |
      | 11 | message | @repeat(a,5001)  |
      | 12 | message | @missing         |

    Ejemplos: tipo de caracteres
      | n | campo   | valor                                      |
      | 13 | name    | Ana1                                       |
      | 14 | name    | R2-D2                                      |
      | 15 | name    | <script>alert(1)</script>                  |
      | 16 | name    | Ana; DROP TABLE contacts                   |
      | 17 | name    | Ana@Example                                |
      | 18 | name    | Ana@newlinePérez                           |
      | 19 | name    | Ana@nulPérez                               |
      | 20 | company | <b>Acme</b>                                |
      | 21 | company | Acme@nulSL                                 |
      | 22 | service | <img src=x onerror=alert(1)>               |
      | 23 | message | Mensaje válido y largo con NUL@nul dentro  |

    Ejemplos: correo, consentimiento e idioma
      | n | campo   | valor                  |
      | 24 | email   | no-es-un-correo        |
      | 25 | email   | a@                     |
      | 26 | email   | @example.com           |
      | 27 | email   | a b@example.com        |
      | 28 | email   | @missing               |
      | 29 | consent | @false                 |
      | 30 | consent | @missing               |
      | 31 | consent | si                     |
      | 32 | locale  | it                     |
      | 33 | locale  | ES                     |
      | 34 | locale  | @missing               |

  Escenario: Un campo desconocido se rechaza (el esquema es estricto)
    Cuando envío una solicitud de contacto con el campo desconocido "is_admin"
    Entonces la respuesta tiene el estado 400
    Y el contacto no aparece en la bandeja del administrador

  Escenario: Un cuerpo vacío se rechaza
    Cuando envío POST a "/api/contact" con el JSON:
      """
      {}
      """
    Entonces la respuesta tiene el estado 400

  Escenario: JSON malformado se rechaza
    Cuando envío POST a "/api/contact" con el texto crudo "{no es json"
    Entonces la respuesta tiene el estado 400

  Escenario: Un cuerpo de más de 100 KB se rechaza
    Cuando envío POST a "/api/contact" con el texto crudo "@repeat(x,100001)"
    Entonces la respuesta tiene el estado 413

  Escenario: Un origen distinto al del sitio se rechaza (protección CSRF)
    Cuando envío POST a "/api/contact" desde el origen "https://evil.example" con el JSON:
      """
      {"name":"Ana","email":"ana@example.com","company":"","service":"MVP","message":"Mensaje suficientemente largo para validar","locale":"es","consent":true}
      """
    Entonces la respuesta tiene el estado 403

  Escenario: Se limita a 5 solicitudes por hora desde la misma IP
    Cuando envío 6 solicitudes de contacto válidas
    Entonces la última de ellas fue rechazada por límite de tasa

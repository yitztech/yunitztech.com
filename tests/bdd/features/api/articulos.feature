# language: es
@api @posts @articulos
Característica: Gestión de artículos del blog (CMS)

  Escenario: Un borrador no es público hasta que se publica
    Dado que soy administrador autenticado
    Cuando creo un artículo borrador válido
    Entonces la respuesta tiene el estado 201
    Y el cuerpo incluye el campo "id"
    Y el artículo "es" no es visible públicamente
    Y el artículo no aparece en el listado público de "es"
    Cuando publico el artículo
    Entonces la respuesta tiene el estado 200
    Y el artículo "es" es visible públicamente
    Y el artículo aparece en el listado público de "es"
    Cuando despublico el artículo
    Entonces el artículo "es" no es visible públicamente
    Y el artículo no aparece en el listado público de "es"

  Escenario: Editar un artículo publicado actualiza su título
    Dado que soy administrador autenticado
    Cuando creo un artículo borrador válido
    Y publico el artículo
    Y cambio el título del artículo a "Título editado por QA"
    Entonces la respuesta tiene el estado 200
    Y el artículo público tiene el título "Título editado por QA"

  Escenario: Las traducciones publicadas se enlazan entre sí
    Dado que soy administrador autenticado
    Cuando creo un artículo borrador válido
    Y publico el artículo
    Y creo la traducción "en" del artículo
    Y creo la traducción "fr" del artículo
    Entonces el artículo "es" es visible públicamente
    Y el artículo público enlaza sus traducciones "es,en,fr"

  Escenario: Un slug repetido en el mismo idioma da conflicto
    Dado que soy administrador autenticado
    Cuando creo un artículo borrador válido
    Y creo otro artículo con el mismo slug
    Entonces la respuesta tiene el estado 409

  Escenario: El listado público no expone el cuerpo
    Entonces el listado público no expone el cuerpo ni los borradores

  Esquema del escenario: Valores en el límite se aceptan (<campo>) #<n>
    Dado que soy administrador autenticado
    Cuando creo un artículo con el campo "<campo>" igual a "<valor>"
    Entonces la respuesta tiene el estado 201

    Ejemplos:
      | n | campo           | valor                 |
      | 1 | title           | @repeat(a,5)          |
      | 2 | title           | @repeat(a,180)        |
      | 3 | excerpt         | @repeat(a,20)         |
      | 4 | excerpt         | @repeat(a,320)        |
      | 5 | body            | @repeat(a,80)         |
      | 6 | body            | línea 1@newlinelínea 2 @repeat(b,80) |
      | 7 | image_alt       | @empty                |
      | 8 | image_alt       | @repeat(a,200)        |
      | 9 | image           | /images/mvp-studio.webp |
      | 10 | image           | /images/business-collaboration.webp |

  Esquema del escenario: Valores inválidos se rechazan señalando el campo (<campo>) #<n>
    Dado que soy administrador autenticado
    Cuando creo un artículo con el campo "<campo>" igual a "<valor>"
    Entonces la respuesta tiene el estado 400
    Y el error señala el campo "<campo>"

    Ejemplos: longitud
      | n | campo           | valor            |
      | 1 | title           | abcd             |
      | 2 | title           | @repeat(a,181)   |
      | 3 | excerpt         | @repeat(a,19)    |
      | 4 | excerpt         | @repeat(a,321)   |
      | 5 | body            | @repeat(a,79)    |
      | 6 | body            | @repeat(a,60001) |
      | 7 | slug            | @empty           |
      | 8 | slug            | @repeat(a,151)   |
      | 9 | translation_key | @empty           |
      | 10 | translation_key | @repeat(a,101)   |
      | 11 | image_alt       | @repeat(a,201)   |

    Ejemplos: formato y tipo
      | n | campo           | valor                         |
      | 12 | slug            | Mayusculas                    |
      | 13 | slug            | con espacios                  |
      | 14 | slug            | con_guion_bajo                |
      | 15 | slug            | ../etc/passwd                 |
      | 16 | translation_key | Clave_Invalida                |
      | 17 | locale          | it                            |
      | 18 | locale          | @missing                      |
      | 19 | published       | yes                           |
      | 20 | published       | @missing                      |
      | 21 | image           | https://evil.example/x.webp   |
      | 22 | image           | /images/../secreto.webp       |
      | 23 | image           | /images/x.svg                 |
      | 24 | image           | javascript:alert(1)           |
      | 25 | image           | @missing                      |
      | 26 | title           | Título con NUL@nul            |
      | 27 | body            | @repeat(a,100)@nul            |

  Escenario: Un campo desconocido al crear un artículo se rechaza
    Dado que soy administrador autenticado
    Cuando creo un artículo con un campo desconocido "id"
    Entonces la respuesta tiene el estado 400

  Escenario: Actualizar con datos inválidos no modifica el artículo
    Dado que soy administrador autenticado
    Cuando creo un artículo borrador válido
    Y publico el artículo
    Y actualizo el artículo con el campo "title" igual a "x"
    Entonces la respuesta tiene el estado 400
    Y el artículo "es" es visible públicamente

  Esquema del escenario: Identificador inválido al editar (<id>) #<n>
    Dado que soy administrador autenticado
    Cuando envío PUT a "/api/admin/posts/<id>" con el JSON:
      """
      {}
      """
    Entonces la respuesta tiene el estado 400

    Ejemplos:
      | n | id         |
      | 1 | 0          |
      | 2 | abc        |
      | 3 | 2147483648 |

  Escenario: Pedir un artículo inexistente responde 404
    Cuando hago GET a "/api/post/es/no-existe-qa"
    Entonces la respuesta tiene el estado 404

  Escenario: Pedir el artículo con un idioma inválido responde 400
    Cuando hago GET a "/api/post/it/lo-que-sea"
    Entonces la respuesta tiene el estado 400

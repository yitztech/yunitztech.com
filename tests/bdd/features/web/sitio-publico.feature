# language: es
@web @publico
Característica: Sitio público multilingüe

  Esquema del escenario: La portada carga correctamente en <idioma> #<n>
    Dado que abro la portada en "<idioma>"
    Entonces la página declara el idioma "<idioma>"
    Y la página tiene un encabezado principal y el formulario de contacto
    Y la página enlaza versiones alternativas para los 5 idiomas

    Ejemplos:
      | n | idioma |
      | 1 | es     |
      | 2 | en     |
      | 3 | fr     |
      | 4 | de     |
      | 5 | pt     |

  Esquema del escenario: El blog lista artículos y se pueden abrir en <idioma> #<n>
    Dado que abro el blog en "<idioma>"
    Entonces el blog lista al menos un artículo
    Cuando abro el primer artículo del blog
    Entonces el artículo muestra título y contenido

    Ejemplos:
      | n | idioma |
      | 1 | es     |
      | 2 | en     |
      | 3 | fr     |
      | 4 | de     |
      | 5 | pt     |

  Esquema del escenario: Rutas inexistentes responden 404 (<ruta>) #<n>
    Cuando abro la ruta "<ruta>"
    Entonces el navegador recibe el estado 404

    Ejemplos:
      | n | ruta                 |
      | 1 | /no-existe           |
      | 2 | /blog/no-existe-qa   |
      | 3 | /en/blog/no-existe-qa |
      | 4 | /it/                 |
      | 5 | /en/no-existe        |

  Escenario: La página 404 ofrece volver al inicio
    Cuando abro la ruta "/no-existe"
    Entonces la página muestra el encabezado "Esta página no está aquí"

# language: es
@api @media @imagenes
Característica: Subida y entrega de imágenes

  Escenario: Una imagen válida se convierte a WebP y se sirve
    Dado que soy administrador autenticado
    Cuando subo una imagen PNG válida
    Entonces la respuesta tiene el estado 201
    Y la imagen subida se sirve como WebP

  Escenario: Un SVG se rechaza
    Dado que soy administrador autenticado
    Cuando subo un archivo SVG
    Entonces la respuesta tiene el estado 400

  Escenario: Un PDF se rechaza
    Dado que soy administrador autenticado
    Cuando subo un PDF
    Entonces la respuesta tiene el estado 400

  Escenario: Un archivo que dice ser PNG pero no lo es se rechaza
    Dado que soy administrador autenticado
    Cuando subo un archivo con tipo PNG pero contenido que no es una imagen
    Entonces la respuesta tiene el estado 400

  Escenario: Una subida con campos de texto en lugar de archivo se rechaza
    Dado que soy administrador autenticado
    Cuando envío una subida sin archivo
    Entonces la respuesta tiene el estado 413

  Escenario: Un archivo mayor de 5 MB se rechaza
    Dado que soy administrador autenticado
    Cuando subo un archivo de 5 MB con tipo PNG
    Entonces la respuesta tiene el estado 413

  Esquema del escenario: Nombres de medio inválidos responden 404 (<nombre>) #<n>
    Cuando hago GET a "/api/media/<nombre>"
    Entonces la respuesta tiene el estado 404

    Ejemplos:
      | n | nombre                                  |
      | 1 | no-existe.webp                          |
      | 2 | 00000000000000000000000000000000.webp   |
      | 3 | 00000000000000000000000000000000.png    |
      | 4 | ..%2F..%2Fetc%2Fpasswd                  |
      | 5 | %2e%2e%2f%2e%2e%2fetc%2fpasswd          |

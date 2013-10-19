//Recibe un origen (LatLng) y un destino (LatLng). Usa el algoritmo de Haversine.
//Devuelve la distancia en KM
function calcularDistancia(cordOrigen, cordDestino) {
//    var x1 = origen.lng();
//    var y1 = origen.lat();
//    var x2 = destino.lng();
//    var y2 = destino.lat();
//    var cateto1 = x2 - x1;
//    var cateto2 = y2 - y1;
//    var distancia = Math.sqrt(Math.pow(cateto1, 2) + Math.pow(cateto2, 2));

    var lat1 = cordOrigen.lat(), lon1 = cordOrigen.lng(),
            lat2 = cordDestino.lat(), lon2 = cordDestino.lng(),
            dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1),
            R = 6371, a, c, distancia;
    a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distancia = R * c;
    return distancia;
}

//Convierte coordenada numérica a radianes
function toRad(value) {
    return value * Math.PI / 180;
}

//Recibe un origen (LatLng) y un array de destinos LatLng
//Devuelve el destino más próximo al origen (Objeto con coordenada, distancia y posicion en del array)
function calcularMenorDistancia(cordOrigen, arraydestino) {
    var distancia = 9999, latlng, indice = 0, distanciaTemp;
    $.each(arraydestino, function(index, item) {
        distanciaTemp = calcularDistancia(cordOrigen, item);
        if (distanciaTemp < distancia) {
            latlng = item;
            distancia = distanciaTemp;
            indice = index;
        }
    });
    return {'latlng': latlng, 'distancia': distancia, 'indice': indice};
}

//Recibe un array de puntos que definen una polilínea (LatLng) 
//Devuelve la distancia total en KM
function calcularDistanciaPolilinea(arrayPuntos) {
    var distanciaTotal = 0, cantPuntos = (arrayPuntos.length - 1);
    for (var i = 0; i < cantPuntos; i++) {
        distanciaTotal += calcularDistancia(arrayPuntos[i], arrayPuntos[i + 1]);
    }
    return redondear(distanciaTotal, 2);
}

//Recibe una polilinea
//Devuelve un array de LatLng acotado entre paradaOrigen y paradaDestino
function acotarPolilinea(polilinea) {
    var recorrido = polilinea.getPath().getArray(), recorridoAcotado = [],
//Devuelve el punto (LatLng) del recorrido más cercano a la parada
            ptoOrigen = calcularMenorDistancia(lineaActual.paradaOrigen, recorrido),
            ptoDestino = calcularMenorDistancia(lineaActual.paradaDestino, recorrido);

// //Funciones para ver si están bien los límites, ibujandolos en el mapa
//    insertarMarcador(ptoOrigen.latlng, 'ParadaOrigen', 'origen.png', mapa);
//    insertarMarcador(ptoDestino.latlng, 'ParadaDestino', 'destino.png', mapa);

//Si el ptoOrigen es más grande que el destino
    if (ptoOrigen.indice > ptoDestino.indice) {
        mostrarModal("Importante: El colectivo tiene que dar toda la vuelta para llegar a destino. Quizás le convenga otra línea.");
        var parte1 = recorrido.slice(ptoOrigen.indice); //corto hasta el final
        var parte2 = recorrido.slice(0, ptoDestino.indice); //corto desde el principio
        recorridoAcotado = parte1.concat(parte2);
    }
    else {
        recorridoAcotado = recorrido.slice(ptoOrigen.indice, ptoDestino.indice);
    }
    return recorridoAcotado;
}

//Recibe el valor a redondear y la cantidad de decimales
function redondear(valor, decimales) {
    var cantidad = Math.pow(10, decimales);
    return Math.round(valor * cantidad) / cantidad;
}

//Recibe un objeto {lat,lng} y lo convierte a un LatLng
function convertirLatLng(objeto) {
    return new google.maps.LatLng(objeto.lat, objeto.lng);
}


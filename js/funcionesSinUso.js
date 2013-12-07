//$('#map_canvas').height($(window).height() - ( $('[data-role=header]').height() - $('[data-role=footer]').height()));

//Muestra el mapa que está escondido en un div
/*function mostrarMapa(activar) {
 if (activar === true)
 {
 $('#contenedor_origen').css("display", "none");
 $('#contenedor_mapa').css("display", "block");
 cargarMapa();
 }
 else if (activar === false)
 {
 $('#contenedor_mapa').css("display", "none");
 $('#contenedor_origen').css("display", "block");
 }
 }
 */

//Genera un subArray del recorrido, a partir de la parada de origen y destino
//Devuelve muchos arrays de 8 Waypoints
/*        app.generarWaypoints = function(recorrido) {
 var subArray = [];
 var arrayLatLng = [];
 var arrayWaypoints = [];
 //Devuelve el punto (LatLng) del recorrido más cercano a la parada
 var ptoOrigen = calcularMenorDistancia(paradaOrigen, recorrido);
 var ptoDestino = calcularMenorDistancia(paradaDestino, recorrido);
 
 console.log(ptoOrigen.indice + ' ' + ptoDestino.indice);
 subArray = recorrido.slice(ptoOrigen.indice, ptoDestino.indice);
 //Transformo cada elemento del array en un waypoint
 console.log(subArray.length);
 //Cada 10 latLng, genero un array y lo inserto en arrayLatLng
 //Esto es por la limitación de googleDirections a 8 waypoints
 var multiplo = 0;
 for (var i = 0; i < subArray.length / 10; i++) {
 var array = [];
 for (var j = 0; j < 10; j++) {
 var recorrido = subArray[j + multiplo];
 if (recorrido)
 array.push(new google.maps.LatLng(recorrido.lat, recorrido.lng));
 else
 break;
 }
 arrayLatLng.push(array);
 multiplo += 8;
 }
 
 $.each(arrayLatLng, function(index, data) {
 var primero = data[0];
 var cordOrigen = new google.maps.LatLng(primero.lat, primero.lng);
 var ultimo = data[data.length - 1];
 var cordDestino = new google.maps.LatLng(ultimo.lat, ultimo.lng);
 var waypoints = [];
 for (var i = 1; i < data.length - 2; i++) {
 waypoints.push({
 location: new google.maps.LatLng(data[i].lat, data[i].lng),
 stopover: false
 });
 }
 arrayWaypoints.push({'origen': cordOrigen,
 'destino': cordDestino,
 'wp': waypoints});
 });
 
 return arrayWaypoints;
 };*/



//Recibe un array de waypoints y devuelve un objeto Ruta
/*function calcularRutaConWaypoints(cordOrigen, cordDestino, waypoints) {
 
 var request = {
 origin: cordOrigen,
 destination: cordDestino,
 waypoints: waypoints,
 travelMode: google.maps.TravelMode.DRIVING,
 region: "AR"
 };
 directionsService.route(request, function(response, status) {
 if (status == google.maps.DirectionsStatus.OK) {
 var distanciaTotal = 0;
 var route = response.routes[0];
 for (var i = 0; i < route.legs.length; i++) {
 distanciaTotal += route.legs[i].distance.value;
 }
 console.log(distanciaTotal);
 }
 });
 
 }*/




//Recibe un array de paradas y compara el origen contra cada parada
//Devuelve la distancia a la parada más cercana
/*function calcularDistanciaMatrix(paradas)
 {
 var service = new google.maps.DistanceMatrixService();
 console.log('cantidad de paradas: ' + paradas.length);
 
 service.getDistanceMatrix(
 {
 origins: [origen.position],
 destinations: paradas,
 travelMode: google.maps.TravelMode.DRIVING,
 avoidHighways: false,
 avoidTolls: false
 }, callback);
 
 function callback(response, status) {
 if (status == google.maps.DistanceMatrixStatus.OK) {
 var origenes = response.originAddresses;
 var destinos = response.destinationAddresses;
 var paradaCercana = 999999;
 
 for (var i = 0; i < origenes.length; i++) {
 var results = response.rows[i].elements;
 for (var j = 0; j < results.length; j++) {
 var element = results[j];
 var distancia = element.distance.value;
 //var duration = element.duration.text;
 var from = origenes[i];
 var to = destinos[j];
 console.log(from + ' ' + to);
 if (distancia < paradaCercana)
 paradaCercana = distancia;
 }
 }
 alert(paradaCercana);
 }
 }
 }*/


//Autocompleta los campos origen y destino.
/*function autocompletarCampos() {
 var origenDiv = document.getElementById('origen');
 var destinoDiv = document.getElementById('destino');
 var options = {
 types: ['geocode'],
 componentRestrictions: {country: 'ar'}
 };
 acOrigen = new google.maps.places.Autocomplete(origenDiv, options);
 acDestino = new google.maps.places.Autocomplete(destinoDiv, options);
 
 //Carga los marcadores origen y destino
 google.maps.event.addListener(acOrigen, 'place_changed', function() {
 var posicion = obtenerCoordenadasAutoComplete(acOrigen);
 insertarOrigen(posicion, origenDiv.value);
 });
 google.maps.event.addListener(acDestino, 'place_changed', function() {
 var posicion = obtenerCoordenadasAutoComplete(acDestino);
 insertarDestino(posicion, destinoDiv.value);
 });
 }
 
 //Recibe un objeto Autocomplete y devuelve sus coordenadas
 function obtenerCoordenadasAutoComplete(autocomplete) {
 var place = autocomplete.getPlace();
 if (!place.geometry) {
 mostrarModal('No se encontró el lugar indicado.');
 return;
 }
 return place.geometry.location;
 }*/

//validar Objeto vacío
//Object.keys(nombre).length === 0


//Lee la url actual y devuelve la cadena que le sigue al '='
/*app.getAtributosUrl = function() {
 var url = window.location.hash;
 return url.split("=")[1];
 };*/

//Lee un archivo json y genera un listView
/*$.getJSON("json/grupos.json", function(arrayGrupos) {
 var cantidad = arrayGrupos.length;
 $.each(arrayGrupos, function(index, data) {
 html += li.replace(/NOMBRE/g, data.nombre).replace(/NUMERO/g, data.numero).replace(/CANTIDAD/g, data.cantLineas).replace(/ID/g, data.grupo_id);
 if (index === cantidad - 1)
 $('#grupoList').html(html).listview('refresh');
 });
 });
 
 $.getJSON("json/" + idGrupo + "/lineas.json", function(arrayLineas) {
 var cantidad = arrayLineas.length;
 $.each(arrayLineas, function(index, data) {
 html += li.replace(/NOMBRE/g, data.nombre).replace(/NUMERO/g, data.numero).replace(/GRUPO/g, idGrupo).replace(/LINEA/g, data.linea_id);
 if (index === cantidad - 1)
 $('#lineasList').html(html).listview('refresh');
 });
 });
 **/

//Recibe las coordenadas de origen y destino y busca en la DB las paradas que pasen por ambos
//Genera un array de Lineas listo para mostrar en el listView y se lo pasa a app.crearListadoRecorridos()
/*    app.listarLineasCercanas = function(cordOrigen, cordDestino) {
 app.cargarLoader(true);
 app.getJSONremoto(controlador + "controladorParada.php",
 {
 Olat: cordOrigen.lat(),
 Olng: cordOrigen.lng(),
 Dlat: cordDestino.lat(),
 Dlng: cordDestino.lng()
 }, function(data) {
 if (data.status === 'SinOrigen')
 app.mostrarModal('No hay paradas cerca del Origen', 'Información');
 else if (data.status === 'SinDestino')
 app.mostrarModal('No hay paradas cerca del Destino', 'Información');
 else
 app.crearListadoRecorridos(data.lineas);
 });
 };*/

/*Recibe un archivo JSON (grupo_id/linea_id) y dibuja el recorrido y paradas en el mapa
 //Guarda la polilínea y las paradas en las variable global lineaActual
 app.dibujarRecorrido = function(nombreArchivo) {
 var parada = null, recorrido = [], arrayParadas = [], latlng = null;
 //Si está en la caché, no vuelvo a dibujar el recorrido
 if (nombreArchivo !== cache.recorrido) {
 cache.recorrido = nombreArchivo;
 $.getJSON("json/" + nombreArchivo + ".json", function(data) {
 //Guardo las varibles globales y Escribo la línea del colectivo en el Header del Mapa
 lineaActual.nombre = data.nombre;
 lineaActual.numero = data.numero;
 lineaActual.grupo_numero = data.grupo_numero;
 lineaActual.grupo_nombre = data.grupo_nombre;
 $('#headMapa').html(data.numero + ' ' + data.nombre);
 
 $.each(data.recorrido, function(index, item) {
 recorrido.push(app.convertirLatLng(item));
 // app.insertarMarcador(new google.maps.LatLng(item.lat, item.lng),'', "accesdenied.png",mapa);
 });
 var trazaRuta = {
 path: recorrido,
 strokeColor: "red",
 stokeOpacity: 1,
 strokeWeight: 4,
 clickable: false
 };
 app.vaciarRecorridos();
 lineaActual.recorrido = new google.maps.Polyline(trazaRuta);
 lineaActual.recorrido.setMap(mapa);
 //Inserto los marcadores de las paradas
 $.each(data.paradas, function(index, item) {
 latlng = app.convertirLatLng(item);
 arrayParadas.push(latlng);
 parada = app.insertarMarcador(latlng, '', "busstop.png", mapa);
 parada.clickable = false;
 lineaActual.paradas.push(parada);
 });
 //Si todavía no definen el origen, centro el mapa en alguna parada
 if (!origen)
 mapa.setCenter(parada.position);
 //Si está definido el origen, centro el mapa ahí y hago rebotar las paradas cercanas
 else
 {
 mapa.setCenter(origen.position);
 app.generarParadasCercanas(arrayParadas);
 }
 });
 }
 else
 app.cargarLoader(false);
 };*/
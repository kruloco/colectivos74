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
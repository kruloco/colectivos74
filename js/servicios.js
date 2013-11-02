//Objeto para usar el Servicio Autocomplete
var autocompleteService = new google.maps.places.AutocompleteService();
//Objeto para usar el Servicio Directions
var directionsService = new google.maps.DirectionsService();
//Objeto para usar el Servicio Geocoding
var geocoder = new google.maps.Geocoder();
var plazaIndependencia = new google.maps.LatLng(-32.88852486014176, -68.8447093963623);


//Recibe un origen y destino (LatLng) y usa Directions WALKING
//Devuelve un objeto Ruta a través de callback
function calcularRuta(cordOrigen, cordDestino, callback) {
    var instrucciones = '', request = {origin: cordOrigen,
        destination: cordDestino,
        travelMode: google.maps.TravelMode.WALKING,
        region: "AR"
    };
    directionsService.route(request, function(result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            var myRoute = result.routes[0].legs[0], ruta = {};
            for (var i = 0, max = myRoute.steps.length; i < max; i++) {
                instrucciones += myRoute.steps[i].instructions + '<br>';
            }
            //Elimino la cadena <div style="font-size:0.9em">El destino está a la ...</div>
            instrucciones = instrucciones.replace(/<div(.*)div>/, '');
            var ruta = {instrucciones: instrucciones,
                distancia: redondear(myRoute.distance.value / 1000, 2), //KILOMETROS
                origen: myRoute.start_address.split(',')[0],
                destino: myRoute.end_address.split(',')[0],
                duracion: Math.round(myRoute.duration.value / 60) //MINUTOS
            };
            callback(ruta);
        }
        else {
            callback(null);
        }

    });
}

//Recibe el par id:valor (JQUERY) de un input y el ID del listView donde se mostrarán las sugerecias
//Hace la petición al servidor de google y manda la respuesta por callback
function generarPredicciones(id, valor, listview) {
//Hago la petición cuando el usuario ingrese más de 3 caracteres
    if (valor.length > 2) {
        autocompleteService.getPlacePredictions({
            input: valor,
            location: plazaIndependencia,
            radius: 5000, //metros
            types: ['geocode'],
            componentRestrictions: {country: 'ar'}
        },
        function(predictions, status) {
            callbackAutocomplete(predictions, status, id, listview);
        });
    }
//Cuando el usuario borra y deja menos de 3 caracteres, vacío el listview
    else {
        $(listview).html('').listview('refresh');
    }
}

//Callback para el Origen y Destino. 
//Recibe el array de predicciones, el status del request, el ID del input y el listview
//Genera el listado desplegable con las sugerencias del autocomplete
function callbackAutocomplete(predictions, status, id, listview) {
    if (status !== google.maps.places.PlacesServiceStatus.OK) {
        console.log(status);
        return;
    }
    var direccion, html = '', li = "<li data-mini='true'><a href='#' onclick=\"cambiarValorAC('DIR','ID','LIST')\">DIR</a></li>";
    for (var i = 0, max = predictions.length; i < max; i++) {
//        direccion = predictions[i].description.replace(/AR-M,/g, '');
        direccion = predictions[i].description;
        html += li.replace(/DIR/g, direccion).replace(/ID/g, id).replace(/LIST/g, listview);
    }
    $(listview).html(html).listview('refresh');
}

//Recibe el id del input, del listview y la sugerencia (string)
//Al seleccionar un ítem del listview, cambia el valor del input y vacía el listview
function cambiarValorAC(direccion, id, listview) {
    $(id).val(direccion);
    $(listview).html('');
}

////Detecta la ubicación del usuario a través de W3C
//Si el booleano recibido es TRUE: buscar por GPS. Sino busca por datos móviles
//Si la encuentra, la escribe en el campo ORIGEN
//Si no la encuentra, escribe en el campo origen la Plaza independencia
function detectarUbicacion(gps) {
    var browserSupportFlag = new Boolean();
    if (navigator.geolocation) {
        browserSupportFlag = true;
        navigator.geolocation.getCurrentPosition(onSuccess, onError,
                {enableHighAccuracy: gps, //timeout: 60000
                });
    } else {
        browserSupportFlag = false;
        errorNoGeolocation(browserSupportFlag);
    }

    function onSuccess(position)
    {
        var ubicacionActual = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        myGeocoderInverso(ubicacionActual, function(direccion) {
            $('#origen').val(direccion);
        });
    }
    function onError(error)
    {
        //Si el GPS está desactivado
        if (error.code === 2) {
            mostrarModal('El GPS está descativado. Habilítelo o la búsqueda se realizará con menos presición', 'GPS Desactivado')
            detectarUbicacion(false);
        }
        else {
            errorNoGeolocation(browserSupportFlag);
        }
    }

//Si no puede geolocalizar, escribe la plaza independencia
    function errorNoGeolocation(browserSupportFlag) {
        if (browserSupportFlag === true) {
            mostrarModal("<p>Falló el servicio de Geolocalización.</p>\n\
            <p>Activa los servicios de Ubicación en tu dispositivo o el GPS para mayor precisión.</p>\n\
            <p>Te ubicamos en Mendoza/Plaza Independencia.</p>");
        } else {
            mostrarModal("Tu navegador no soporta Geolocalización. Te ubicamos en Mendoza/Plaza Independencia.");
        }
        $('#origen').val('Plaza Independencia, Mendoza, Argentina');
        //      insertarOrigen(plazaIndependencia, 'Plaza Independencia');
    }
}

//Recibe una dirección en formato texto y devuelve las coordenadas a la funcion de callback
function myGeocoder(posicion, callback) {
    geocoder.geocode({'address': posicion, 'region': 'AR'}, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            callback(results[0].geometry.location);
        } else {
            mostrarModal("No encontramos la dirección: " + posicion);
            callback(null);
        }
    });
}

//Recibe (LatLng) y devuelve la ubicacion en Modo Texto a traves de callback
function myGeocoderInverso(posicion, callback) {
    geocoder.geocode({'latLng': posicion}, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            if (results[0]) {
                alert("geocoder");
                callback(results[0].formatted_address);
            }
        } else {
            callback('');
            mostrarModal("No lo podemos localizar. Intente nuevamente: " + status);
        }
    });
}

//Mapa, Origen y Destino - ambos Objeto Marker
var mapa = null,
        origen = null,
        destino = null,
//Infowindow para Origen y destino
        infoOrigen = new google.maps.InfoWindow(), infoDestino = new google.maps.InfoWindow(),
//Almacena el string grupo_id/parada_id del último recorrido consultado
        cache = {recorrido: '', indicaciones: '', sesion: false, grupoId: ''},
//Objeto con los datos de la línea actual en uso.
//recorrido es un objeto Polyline. paradas es un array de Marker's.
//paradaDestino y paradaOrigen son objetos LatLng de las paradas más cercanas al origen y destino
lineaActual = {nombre: '', numero: '', grupo_nombre: '', grupo_numero: '',
    recorrido: null, paradas: null, paradaOrigen: null, paradaDestino: null};

//Recibe el origen y destino que escribió el usuario y los busca en el mapa
//Si todo es correcto, redirige al mapa; si no va a la pantalla de Origen/Destino
function buscarOrigenDestino(valorOrigen, valorDestino) {
    myGeocoder(valorOrigen, function(cordOrigen) {
        if (cordOrigen !== null) {
            myGeocoder(valorDestino, function(cordDestino) {
                if (cordDestino !== null) {
                    listarLineasCercanas(cordOrigen, cordDestino);
//                    console.log(cordOrigen + ' ' + cordDestino);
                    insertarOrigen(cordOrigen, valorOrigen);
                    insertarDestino(cordDestino, valorDestino);
                }
            });
        }
    });
}

//Si NO existe el mapa: genera un objeto de configuración y lo instancia.
function cargarMapa() {
    //cargarLoader(true);
    var opcionesMapa = {
        zoomControl: true,
        panControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.SMALL,
            position: google.maps.ControlPosition.LEFT_TOP
        },
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
//        mapTypeControlOptions: {style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
//        mapTypeControlOptions: {style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
//            position: google.maps.ControlPosition.LEFT_CENTER},
//        panControlOptions: {
//            position: google.maps.ControlPosition.LEFT_CENTER
//        },
    };
    mapa = new google.maps.Map(document.getElementById("map_canvas"), opcionesMapa);
    //Agrego control personalizado de MapType
    var typeControlDiv = document.createElement('div');
    new MapTypeControl(typeControlDiv);
    mapa.controls[google.maps.ControlPosition.TOP_LEFT].push(typeControlDiv);
    //google.maps.event.trigger(mapa, 'resize');
    //Cuando el mapa está cargado, saca el Loader bounds_changed
    google.maps.event.addListener(mapa, 'projection_changed', function() {
        cargarLoader(true);
    });
    google.maps.event.addListener(mapa, 'tilesloaded', function() {
        cargarLoader(false);
    });
//        google.maps.event.addListener(mapa, 'idle', function() {
//            cargarLoader(false);
//        });
    //Si está seteado el Origen y Destino, los muestro en el mapa
    if (origen && destino) {
        origen.setMap(mapa);
        destino.setMap(mapa);
    }
}
;

//Si existe el mapa: inserta el marcador de ORIGEN y centra el mapa ahí
//Si no existe el mapa: crea el marcador origen sin mapa
function insertarOrigen(ubicacion, nombre) {
    infoOrigen.setContent(nombre);
    if (!origen) {
        origen = insertarMarcador(ubicacion, 'Origen', 'origen.png', mapa);
        //Abre infowindows sobre origen cuando le hago clic
        google.maps.event.addListener(origen, 'click', function(event) {
            infoOrigen.open(mapa, origen);
        });
    }
    else {
        origen.setPosition(ubicacion);
        origen.setMap(mapa);
    }
    if (mapa) {
        mapa.setCenter(ubicacion);
    }
}

//Inserta el marcador de DESTINO y el infowindow
function insertarDestino(ubicacion, nombre) {
    infoDestino.setContent(nombre);
    if (!destino) {
        destino = insertarMarcador(ubicacion, 'Destino', 'destino.png', mapa);
        google.maps.event.addListener(destino, 'click', function(event) {
            infoDestino.open(mapa, destino);
        });
    }
    else {
        destino.setPosition(ubicacion);
        destino.setMap(mapa);
    }
}

//Recibe una coordenada, titulo, icono, mapa y dibuja un marcador
//Devuelve el objeto Marker
function insertarMarcador(ubicacion, titulo, icono, map) {
    var marc = new google.maps.Marker({
        position: ubicacion,
        map: map,
        title: titulo,
        icon: 'images/mapa/' + icono
    });
    return marc;
}

//Recibe un archivo JSON (grupo_id/linea_id) y dibuja el recorrido y paradas en el mapa
//Guarda la polilínea y las paradas en las variable global lineaActual
function dibujarRecorrido(nombreArchivo) {
    var parada = null, recorrido = [], arrayParadas = [], latlng = null;
    //Si está en la caché, no vuelvo a dibujar el recorrido
    if (nombreArchivo !== cache.recorrido) {
        cache.recorrido = nombreArchivo;
        $.getJSON("json/" + nombreArchivo + ".json", function(data) {
            //Guardo las varibles globales y Escribo la línea del colectivo en el Header del Mapa
            lineaActual.nombre = data.nombre;
            lineaActual.numero = data.numero;
            lineaActual.grupo_numero = data.grupo_numero;
            lineaActual.grupo_numero = data.grupo_nombre;
            $('#headMapa').html(data.numero + ' ' + data.nombre);

            $.each(data.recorrido, function(index, item) {
                recorrido.push(convertirLatLng(item));
                // insertarMarcador(new google.maps.LatLng(item.lat, item.lng),'', "accesdenied.png",mapa);
            });
            var trazaRuta = {
                path: recorrido,
                strokeColor: "red",
                stokeOpacity: 1,
                strokeWeight: 4,
                clickable: false
            };
            vaciarRecorridos();
            lineaActual.recorrido = new google.maps.Polyline(trazaRuta);
            lineaActual.recorrido.setMap(mapa);
            //Inserto los marcadores de las paradas
            $.each(data.paradas, function(index, item) {
                latlng = convertirLatLng(item);
                arrayParadas.push(latlng);
                parada = insertarMarcador(latlng, '', "busstop.png", mapa);
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
                generarParadasCercanas(arrayParadas);
            }
        });
    }
    else
        cargarLoader(false);
}

//Vaciar el array de linea.paradas y linea.recorrido
function vaciarRecorridos() {
    if (lineaActual.recorrido)
        lineaActual.recorrido.setMap(null);
    if (lineaActual.paradas)
        $.each(lineaActual.paradas, function(index, item) {
            item.setMap(null);
        });
    lineaActual.paradas = [];
}

//Recibe las coordenadas de origen y destino y busca en la DB las paradas que pasen por ambos
//Genera un array de Lineas listo para mostrar en el listView y se lo pasa a crearListado()
function listarLineasCercanas(cordOrigen, cordDestino) {
    cargarLoader(true);
    getJSONremoto(controlador + "controladorParada.php",
            {
                Olat: cordOrigen.lat(),
                Olng: cordOrigen.lng(),
                Dlat: cordDestino.lat(),
                Dlng: cordDestino.lng()
            }, function(data) {
        if (data.status === 'SinOrigen')
            mostrarModal('No hay paradas cerca del Origen');
        else if (data.status === 'SinDestino')
            mostrarModal('No hay paradas cerca del Destino');
        else
            crearListado(data.lineas);
    });
}

//Recibe un array de lineas [json: {numero,nombre,grupo,etc}]
//Genera un listView dinámico
function crearListado(arrayLineas) {
    var html = '', li = "<li><a href='#mapaPage?g=GRUPO-LINEA'><div id='cuadradito'>NUMERO</div>NOMBRE</a></li>";
    $.mobile.changePage("#lineasPage");
    $.each(arrayLineas, function(index, data) {
        html += li.replace(/NOMBRE/g, data.nombre).replace(/NUMERO/g, data.numero).replace(/GRUPO/g, data.grupo_id).replace(/LINEA/g, data.linea_id);
    });
    $('#lineasList').html(html).listview('refresh');
}


//Recibe un array de paradas [json{lat,lng}] 
//Llena las variables globales: paradaOrigen, paradaDestino y las hace rebotar
function generarParadasCercanas(paradas) {
//Devuelve la parada (LatLng) más cercana al origen y al destino
    var puntoOrigen = calcularMenorDistancia(origen.position, paradas),
            puntoDestino = calcularMenorDistancia(destino.position, paradas);
    lineaActual.paradaOrigen = puntoOrigen.latlng;
    lineaActual.paradaDestino = puntoDestino.latlng;
    //Hago rebotar las paradas cercanas al Origen y Destino
    (lineaActual.paradas[puntoOrigen.indice]).setAnimation(google.maps.Animation.BOUNCE);
    (lineaActual.paradas[puntoDestino.indice]).setAnimation(google.maps.Animation.BOUNCE);
}

//Control personalizado para MapType y listeners para alternar entre los dos tipos
function MapTypeControl(controlDiv) {
    controlDiv.style.padding = '20px 5px 5px 5px';
    controlDiv.index = 1;

    var controlUI = document.createElement('div');
    controlUI.setAttribute('class', 'icono_shuffle');
    controlUI.title = 'Clic para cambiar el tipo de mapa';
    controlDiv.appendChild(controlUI);

    google.maps.event.addDomListener(controlUI, 'click', function() {
        var tipo = mapa.getMapTypeId();
        mapa.setMapTypeId((tipo === 'roadmap') ? 'satellite' : 'roadmap');
    });
}

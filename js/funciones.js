$(function() {
// Objeto para encapsular las funciones
    var Colectivos = {};
    //funcion autoejecutable
    (function(app) {
        //VARIABLES GLOBALES ---------------------------------------------------------------------------------------------
        var celular = {'estado': true, 'conexion': '', 'plataforma': ''}, //CAMBIAR ESTADO:TRUE PARA DESHABILITAR PHONEGAP
        mapa = null, origen = null, destino = null, colectivo = null,
                //Infowindow para Origen y destino
                infoOrigen = new google.maps.InfoWindow(), infoDestino = new google.maps.InfoWindow(),
                //Almacena el string grupo_id/parada_id del último recorrido consultado
                cache = {recorrido: '', indicaciones: '', sesion: false, grupoId: ''},
        //Objeto con los datos de la línea actual en uso.
        //recorrido es un objeto Polyline. paradas es un array de Marker's.
        //paradaDestino y paradaOrigen son objetos LatLng de las paradas más cercanas al origen y destino
        lineaActual = {nombre: '', numero: '', grupo_nombre: '', grupo_numero: '',
            recorrido: null, paradas: null, paradaOrigen: null, paradaDestino: null},
        //Objeto para usar el Servicio Autocomplete
        autocompleteService = new google.maps.places.AutocompleteService(),
                //Objeto para usar el Servicio Directions
                directionsService = new google.maps.DirectionsService(),
                //Objeto para usar el Servicio Geocoding
                geocoder = new google.maps.Geocoder(),
                plazaIndependencia = new google.maps.LatLng(-32.88852486014176, -68.8447093963623),
                //URL donde hacer las peticiones remotas                
                controlador = "http://colectivo.site90.net/";
        //controlador = "http://localhost/colectivosServer/controladores/";

        // Función principal
        app.init = function() {
            document.addEventListener('deviceready', app.bindingsPG, false);
            app.bindings();
        };

        //Inicializa todos los EVENTOS de la página ---------------------------------------------------------------------
        app.bindings = function() {
            //Cuando se carga la página para seleccionar origen/detino
            $("#origenPage").on('pageshow', function() {
                app.deshabilitarBtnMostrar();
                app.limpiarAutocomplete();
            });
            $("#grupoPage").on('pagebeforeshow', function() {
                app.crearListadoGrupos();
            });
            //Cuando hago clic en un grupo, guardo ese id en data-grupo para capturarlo desde otro página
            $("#grupoList").on('click', ".grupo", function() {
                sessionStorage.grupoSeleccionado = $(this).attr("data-grupo");
            });
            //Cuando hago clic en una linea, guardo ese id en data-linea para capturarlo desde otro página
            $("#lineasList").on('click', ".linea", function() {
                sessionStorage.lineaSeleccionada = $(this).attr("data-linea");
                sessionStorage.grupoSeleccionado = $(this).attr("data-grupo");

            });
            //Cuando se carga el listado de lineas
            $("#lineasPage").on("pagebeforeshow", function(e, data) {
//                var grupoId = $('#grupoSeleccionado').attr('data-grupo');
                var grupoId = sessionStorage.grupoSeleccionado;
                var paginaAnterior = data.prevPage.attr('id');
                //Si vengo de la página mapaPage, es porque toqué el botón 'back' entonces no tengo que redibujar las líneas
                if (grupoId && paginaAnterior !== 'mapaPage')
                    app.crearListadoLineas(grupoId);
            });
            //Carga el mapa sólo una vez y quita el handler
            $("#mapaPage").one("pageshow", function() {
                app.cargarMapa();
            });
            //Cuando se carga el mapa, dibuja el recorrido
            $("#mapaPage").on({
                "pagebeforeshow": function(e) {
                    app.modificarNavBar();
                },
                "pageshow": function(e) {
                    var archivo = sessionStorage.grupoSeleccionado + "/" + sessionStorage.lineaSeleccionada;
                    app.dibujarRecorrido(archivo);
                }
            });
            //Cuando se carga la página de Indicaciones
            $("#indicacionesPage").on('pagebeforeshow', function() {
                var archivo = sessionStorage.grupoSeleccionado + "/" + sessionStorage.lineaSeleccionada;
                app.generarIndicaciones(archivo);
            });
            //Cuando hago clic sobre el header del mapa, se abre un modal con los datos
            $('#headMapa').on('click', function() {
//                app.mostrarModal(this.innerHTML, 'Información de la Línea');
                var html = '<strong>Nombre: </strong>' + lineaActual.nombre;
                html += '<br><strong>Número: </strong>' + lineaActual.numero;
                html += '<br><br><strong>Grupo: </strong>' + lineaActual.grupo_nombre;
                html += '<br><strong>Número Grupo: </strong>' + lineaActual.grupo_numero;

                $('#panelLinea p').html(html);
                $('#panelLinea').panel('open');
            });
            //Capturador de eventos
//            $(document).on("pagebeforeload pageload pageloadfailed pagebeforechange pagechange pagechangefailed pagebeforeshow pagebeforehide pageshow pagehide pagebeforecreate pagecreate pageinit pageremove updatelayout", function(e) {
//                console.log(e.type);
//            });
            //Clic en el botón Buscar
            $("#btnBuscarRecorridos").on('click', function() {
                var origenDiv = $('#origen').val(), destinoDiv = $('#destino').val();
                if (celular.estado === false) {
                    app.mostrarModal("No hay acceso a Internet. \n\
                    Habilite la conexión de datos o WiFi para proceder", "Error");
                }
                else {
                    app.buscarOrigenDestino(origenDiv, destinoDiv);
                }
                //app.listarLineasCercanas(origen.position, destino.position);
            });
            //Listeners para autocompletar los campos origen y destino.
            $('#origen').on('keyup', function() {
                app.deshabilitarBtnMostrar();
                app.generarPredicciones('#' + this.id, this.value, '#ulOrigen');
            });
            $('#destino').on('keydown', function() {
                var posicion = $(this).position().top + 300;
                $.mobile.silentScroll(posicion);
                app.deshabilitarBtnMostrar();
                app.generarPredicciones('#' + this.id, this.value, '#ulDestino');
            });
            //Clic en el botón ¿Donde estoy?
            $('#origenAutomatico').on('click', function() {
                app.detectarUbicacion(true);
            });
            //Clic en el botón 'Intercambiar Destino'
            $('#intercambiarOrigen').on('click', function() {
                var origenVal = $('#origen').val();
                var destinoVal = $('#destino').val();
                $('#origen').val(destinoVal);
                $('#destino').val(origenVal);
            });
            //Clic en el botón 'Borrar Datos'
            $("#btnBorrarOrigen").on('click', function() {
                $("#origen").val('');
                $("#destino").val('');
                app.limpiarAutocomplete();
                app.deshabilitarBtnMostrar();
            });
            //Clic en alguna predicción del menú desplegable autocomplete
            $("#origenPage").on('click', '.prediccion', function() {
                //Recibe el id del input, del listview y la sugerencia (string)
                //Al seleccionar un ítem del listview, cambia el valor del input y vacía el listview
                var listview = $(this).attr("data-listview");
                var id = $(this).attr("data-input-id");
                var direccion = $(this).attr("data-direccion");
                $(id).val(direccion);
                $(listview).html('');
            });
            //Clien en el botón 'Rastrear' del mapa
            $(".btnRastrear").on('click', function() {
                //Obtengo el id de la línea actual y hago una petición remota para colocar en el mapa el colectivo más cercano
                app.cargarLoader(true);
                app.getJSONremoto(controlador + "controladorTiempoReal.php",
                        {
                            linea: sessionStorage.lineaSeleccionada,
                        }, function(data) {
                    if (data.status === 'SinColectivo') {
                        app.cargarLoader(false);
                        app.mostrarModal('No hay colectivos en este momento', 'Información');
                    }
                    else {
                        app.cargarLoader(false);
                        app.dibujarColectivo(data.colectivos);
                    }
                });
            });
            //Al tocar el botón SALIR
            $("#btnSalir").on('click', function() {
                app.cerrarAplicacion();
            });
        };

//Manejador de eventos de PhoneGap ---------------------------------------------------------------------------------------
        app.bindingsPG = function()
        {
            navigator.splashscreen.show();

            celular.conexion = app.getConexion();
            if ((celular.conexion !== 'Ninguna') && (celular.conexion !== 'Desconocida')) {
                celular.estado = true;
            }
            celular.plataforma = device.platform;
            if ((celular.plataforma === "Android") || (celular.plataforma === "3.0.0.100")) {
                document.addEventListener("online", app.isOnline, false);
                document.addEventListener("offline", app.isOffline, false);
                document.addEventListener("menubutton", app.onMenuButton, false);
                document.addEventListener("searchbutton", app.onSearchButton, false);
            }
//            document.addEventListener("pause", app.cerrarAplicacion, false);

        };

        app.onMenuButton = function() {
            alert('botón desactivado');
        };
        app.onSearchButton = function() {
            alert('botón desactivado');
        };
        app.isOnline = function() {
            celular.estado = true;
        };
        app.isOffline = function() {
            celular.estado = false;
        };

        //Devuelve el tipo de conexion del dispositivo
        app.getConexion = function() {
            var estadoRed = navigator.connection.type;

            var estados = {};
            estados[Connection.UNKNOWN] = 'Desconocida';
            estados[Connection.ETHERNET] = 'Ethernet';
            estados[Connection.WIFI] = 'WiFi';
            estados[Connection.CELL_2G] = '2G';
            estados[Connection.CELL_3G] = '3G';
            estados[Connection.CELL_4G] = '4G';
            estados[Connection.NONE] = 'Ninguna';

            return estados[estadoRed];
        };

        app.cerrarAplicacion = function() {
            navigator.app.exitApp();
        };

// FUNCIONES GENERALES -------------------------------------------------------------------------------------------------
//Cambia las navBar dependiendo si hay Origen o no
        app.modificarNavBar = function() {
            if (origen) {
                $('#navbarMapa').hide();
                $('#navbarMapaOrigen').show();
                //$('#navbarMapaOrigen').navbar();
            }
            else {
                $('#navbarMapaOrigen').hide();
                $('#navbarMapa').show();
                //$('#navbarMapa').navbar();
            }
        };

        //Limpia el autocomplete de origen y destino
        app.limpiarAutocomplete = function() {
            $("#ulOrigen").html('').listview('refresh');
            $("#ulDestino").html('').listview('refresh');
        };

        //Deshabilita/Habilita el botón 'Mostrar Mapa' dependiendo del input
        app.deshabilitarBtnMostrar = function() {
            var origen = $('#origen').val(), destino = $('#destino').val();
            if (origen === '' || destino === '')
                $('#btnBuscarRecorridos').button('disable'); //$('#btnBuscarRecorridos').addClass('ui-disabled');
            else
                $('#btnBuscarRecorridos').button('enable');
        };

        //Genera un listView dinámico de TODOS los Grupos/Recorridos
        app.crearListadoGrupos = function() {
            if (cache.sesion === false) {
                cache.sesion = true;
                var html = '', li = "<li class='grupo' data-grupo='ID'><a href='#lineasPage'><div id='cuadradito'>NUMERO</div>NOMBRE</a><span class='ui-li-count'>CANTIDAD</span></li>";
                //Obtengo el array de grupos
                $.getJSON("json/grupos.json", function(arrayGrupos) {
                    var cantidad = arrayGrupos.length;
                    $.each(arrayGrupos, function(index, data) {
                        html += li.replace(/NOMBRE/g, data.nombre).replace(/NUMERO/g, data.numero).replace(/CANTIDAD/g, data.cantLineas).replace(/ID/g, data.grupo_id);
                        if (index === cantidad - 1)
                            $('#grupoList').html(html).listview('refresh');
                    });
                });
            }
        };

        //Recibe ID de Grupo y Genera un listView dinámico de sus lineas
        app.crearListadoLineas = function(idGrupo) {
            if (cache.grupoId !== idGrupo) {
                cache.grupoId = idGrupo;
                var html = '', li = "<li class='linea' data-linea='LINEA' data-grupo='GRUPO'><a href='#mapaPage'><div id='cuadradito'>NUMERO</div>NOMBRE</a></li>";
                $.getJSON("json/" + idGrupo + "/lineas.json", function(arrayLineas) {
                    var cantidad = arrayLineas.length;
                    $.each(arrayLineas, function(index, data) {
                        html += li.replace(/NOMBRE/g, data.nombre).replace(/NUMERO/g, data.numero).replace(/GRUPO/g, idGrupo).replace(/LINEA/g, data.linea_id);
                        if (index === cantidad - 1)
                            $('#lineasList').html(html).listview('refresh');
                    });
                });
            }
        };

        //Recibe un array de los mejores recorridos [json: {numero,nombre,grupo,etc}] y genera un listView dinámico
        app.crearListadoRecorridos = function(arrayLineas) {
            var html = '', li = "<li class='linea' data-linea='LINEA' data-grupo='GRUPO'><a href='#mapaPage'><div id='cuadradito'>NUMERO</div>NOMBRE</a></li>";
            $.mobile.changePage("#lineasPage");
            $.each(arrayLineas, function(index, data) {
                html += li.replace(/NOMBRE/g, data.nombre).replace(/NUMERO/g, data.numero).replace(/GRUPO/g, data.grupo_id).replace(/LINEA/g, data.linea_id);
            });
            $('#lineasList').html(html).listview('refresh');
        };

        //Dibuja el ListView de Indicaciones. Hace todos los cálculos necesarios.
        app.generarIndicaciones = function(nombreArchivo) {
            if (nombreArchivo !== cache.indicaciones) {
                app.cargarLoader(true);
                cache.indicaciones = nombreArchivo;

                //Corta la Polilinea desde la paradaOrigen hasta paradaDestino
                var recorridoAcotado = app.acotarPolilinea(lineaActual.recorrido),
                        //Calcula la distancia en KM de la polilínea acotada
                        distanciaColectivo = (app.calcularDistanciaPolilinea(recorridoAcotado)),
                        //Calcula el tiempo de recorrido del colectivo sobre esa polilínea a 50km/h
                        tiempoColectivo = Math.round((distanciaColectivo * 60) / 50),
                        distanciaTotal = '', tiempoTotal = '';

                //Usa Directions para calcular la ruta desde origen->paradaOrigen; paradaDestino->destino
                app.calcularRuta(origen.position, lineaActual.paradaOrigen, function(ruta) {
                    $('#LDindicaciones1').html('Camina hasta ' + ruta.destino + '.<br>Distancia: ' + ruta.distancia + ' km. Tiempo: ' + ruta.duracion + ' min.');
                    $('#indicaciones1').html(ruta.instrucciones);
                    app.calcularRuta(lineaActual.paradaDestino, destino.position, function(ruta2) {
                        $('#LDindicaciones2').html('Tramo en Colectivo. Distancia: ' + distanciaColectivo + ' km. Tiempo: ' + tiempoColectivo + ' min');
                        $('#indicaciones2').html('Toma el colectivo ' + lineaActual.numero + ' - ' + lineaActual.nombre + ' y baja en ' + ruta2.origen);
                        $('#LDindicaciones3').html('Caminar desde ' + ruta2.origen + ' hasta el destino.<br>Distancia: ' + ruta2.distancia + ' km. Tiempo: ' + ruta2.duracion + ' min.');
                        $('#indicaciones3').html(ruta2.instrucciones);
                        distanciaTotal = ruta.distancia + ruta2.distancia + distanciaColectivo;
                        tiempoTotal = ruta.duracion + ruta2.duracion + tiempoColectivo;
                        $('#indicacionesTotal').html('Distancia Total: ' + app.redondear(distanciaTotal, 2) + ' km. Tiempo Total: ' + tiempoTotal + ' min.');
                        app.cargarLoader(false);
                    });
                });
                //directionsDisplay.setPanel(document.getElementById("indicacionesPanel"));
            }
        };

        //Carga el Widget de la ruedita girando, si recibe TRUE
        app.cargarLoader = function(activar) {
            var accion = activar ? 'show' : 'hide';
            $.mobile.loading(accion);
        };

        //Recibe una cadena de teto y la muestra en un Modal de Error
        app.mostrarModal = function(texto, titulo) {
            $("#lnkDialog").click();
            $("#dialogText").html(texto);
            $("#dialogTitle").html(titulo);
        };

        //Petición JSON cross-domain
        app.getJSONremoto = function(url, datos, callback) {
            $.ajax({
                url: url,
                dataType: 'jsonp',
                data: datos,
                success: function(data) {
                    callback(data);
                },
                error: function(data) {
                    app.mostrarModal('Error de conexión', 'Error');
                    console.debug(data);
                }
            });
        };

//FUNCIONES relacionadas con el MAPA -----------------------------------------------------------------------------------

//Recibe el origen y destino que escribió el usuario y los busca en el mapa
//Si todo es correcto, redirige al mapa; si no va a la pantalla de Origen/Destino
        app.buscarOrigenDestino = function(valorOrigen, valorDestino) {
            app.myGeocoder(valorOrigen, function(cordOrigen) {
                if (cordOrigen !== null) {
                    app.myGeocoder(valorDestino, function(cordDestino) {
                        if (cordDestino !== null) {
                            app.listarLineasCercanas(cordOrigen, cordDestino);
//                    console.log(cordOrigen + ' ' + cordDestino);
                            app.insertarOrigen(cordOrigen, valorOrigen);
                            app.insertarDestino(cordDestino, valorDestino);
                        }
                    });
                }
            });
        };

//Si NO existe el mapa: genera un objeto de configuración y lo instancia.
        app.cargarMapa = function() {
            //app.cargarLoader(true);
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
            new app.MapTypeControl(typeControlDiv);
            mapa.controls[google.maps.ControlPosition.TOP_LEFT].push(typeControlDiv);
            //google.maps.event.trigger(mapa, 'resize');
            //Cuando el mapa está cargado, saca el Loader bounds_changed
            google.maps.event.addListener(mapa, 'projection_changed', function() {
                app.cargarLoader(true);
            });
            google.maps.event.addListener(mapa, 'tilesloaded', function() {
                app.cargarLoader(false);
            });
//        google.maps.event.addListener(mapa, 'idle', function() {
//            app.cargarLoader(false);
//        });
            //Si está seteado el Origen y Destino, los muestro en el mapa
            if (origen && destino) {
                origen.setMap(mapa);
                destino.setMap(mapa);
            }
        };

//Si existe el mapa: inserta el marcador de ORIGEN y centra el mapa ahí
//Si no existe el mapa: crea el marcador origen sin mapa
        app.insertarOrigen = function(ubicacion, nombre) {
            infoOrigen.setContent(nombre);
            if (!origen) {
                origen = app.insertarMarcador(ubicacion, 'Origen', 'origen.png', mapa);
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
        };

//Inserta el marcador de DESTINO y el infowindow
        app.insertarDestino = function(ubicacion, nombre) {
            infoDestino.setContent(nombre);
            if (!destino) {
                destino = app.insertarMarcador(ubicacion, 'Destino', 'destino.png', mapa);
                google.maps.event.addListener(destino, 'click', function(event) {
                    infoDestino.open(mapa, destino);
                });
            }
            else {
                destino.setPosition(ubicacion);
                destino.setMap(mapa);
            }
        };

//Recibe una coordenada, titulo, icono, mapa y dibuja un marcador
//Devuelve el objeto Marker
        app.insertarMarcador = function(ubicacion, titulo, icono, map) {
            var marc = new google.maps.Marker({
                position: ubicacion,
                map: map,
                title: titulo,
                icon: 'images/mapa/' + icono
            });
            return marc;
        };

//Recibe un archivo JSON (grupo_id/linea_id) y dibuja el recorrido y paradas en el mapa
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
        };

//Vaciar el array de linea.paradas y linea.recorrido
        app.vaciarRecorridos = function() {
            if (lineaActual.recorrido)
                lineaActual.recorrido.setMap(null);
            if (lineaActual.paradas)
                $.each(lineaActual.paradas, function(index, item) {
                    item.setMap(null);
                });
            lineaActual.paradas = [];
        };

//Recibe las coordenadas de origen y destino y busca en la DB las paradas que pasen por ambos
//Genera un array de Lineas listo para mostrar en el listView y se lo pasa a app.crearListadoRecorridos()
        app.listarLineasCercanas = function(cordOrigen, cordDestino) {
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
        };

//Recibe un array de paradas [json{lat,lng}] 
//Llena las variables globales: paradaOrigen, paradaDestino y las hace rebotar
        app.generarParadasCercanas = function(paradas) {
            //Devuelve la parada (LatLng) más cercana al origen y al destino
            var puntoOrigen = app.calcularMenorDistancia(origen.position, paradas),
                    puntoDestino = app.calcularMenorDistancia(destino.position, paradas);
            lineaActual.paradaOrigen = puntoOrigen.latlng;
            lineaActual.paradaDestino = puntoDestino.latlng;
            //Hago rebotar las paradas cercanas al Origen y Destino
            (lineaActual.paradas[puntoOrigen.indice]).setAnimation(google.maps.Animation.BOUNCE);
            (lineaActual.paradas[puntoDestino.indice]).setAnimation(google.maps.Animation.BOUNCE);
        };

//Recibe array de colectivos {JSON{id,pos}}
//Dibuja en el mapa el colectivo más cercano al origen
        app.dibujarColectivo = function(colectivos) {
            //Si todavía no definen el origen, centro el mapa en alguna parada
            if (origen) {
                if (colectivo)
                    colectivo.setMap(null);
                $.each(colectivos, function(index, item) {
                    colectivo = app.insertarMarcador(new google.maps.LatLng(item.lat, item.lng), '', "busGPS.png", mapa);
                });
            }
            else
            {

            }
            //Si todavía no definen el origen, centro el mapa en alguna parada
        };

//Control personalizado para MapType y listeners para alternar entre los dos tipos
        app.MapTypeControl = function(controlDiv) {
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
        };

//FUNCIONES relacionadas con SERVICIOS de GOOGLE ----------------------------------------------------------------------


//Recibe un origen y destino (LatLng) y usa Directions WALKING
//Devuelve un objeto Ruta a través de callback
        app.calcularRuta = function(cordOrigen, cordDestino, callback) {
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
                        distancia: app.redondear(myRoute.distance.value / 1000, 2), //KILOMETROS
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
        };

//Recibe el par id:valor (JQUERY) de un input y el ID del listView donde se mostrarán las sugerecias
//Hace la petición al servidor de google y manda la respuesta por callback
        app.generarPredicciones = function(id, valor, listview) {
            //Hago la petición cuando el usuario ingrese más de 3 caracteres
            if (valor.length > 2) {
                autocompleteService.getPlacePredictions({
                    input: valor,
                    location: plazaIndependencia,
                    radius: 50000, //50 KM
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

            //Callback para el Origen y Destino. 
            //Recibe el array de predicciones, el status del request, el ID del input y el listview
            //Genera el listado desplegable con las sugerencias del autocomplete    
            function callbackAutocomplete(predictions, status, id, listview) {
                if (status !== google.maps.places.PlacesServiceStatus.OK) {
                    console.log(status);
                    return;
                }
                var direccion, html = '', li = "<li class='prediccion' data-direccion='DIR' data-input-id=ID data-listview=LIST data-mini='true'><a href='#'>DIR</a></li>";
                for (var i = 0, max = predictions.length; i < max; i++) {
                    //direccion = predictions[i].description.replace(/AR-M,/g, '');
                    direccion = predictions[i].description;
                    html += li.replace(/DIR/g, direccion).replace(/ID/g, id).replace(/LIST/g, listview);
                }
                $(listview).html(html).listview('refresh');
            }
        };


////Detecta la ubicación del usuario a través de W3C
//Si el booleano recibido es TRUE: buscar por GPS. Sino busca por datos móviles
//Si la encuentra, la escribe en el campo ORIGEN
//Si no la encuentra, escribe en el campo origen la Plaza independencia
        app.detectarUbicacion = function(gps) {
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
                app.myGeocoderInverso(ubicacionActual, function(direccion) {
                    $('#origen').val(direccion);
                    app.deshabilitarBtnMostrar();
                });
            }
            function onError(error)
            {
                //Si el GPS está desactivado
                if (error.code === 2) {
                    app.mostrarModal('El GPS está descativado. Habilítelo o la búsqueda se realizará con menos presición', 'GPS Desactivado');
                    app.detectarUbicacion(false);
                }
                else {
                    errorNoGeolocation(browserSupportFlag);
                }
            }

//Si no puede geolocalizar, escribe la plaza independencia
            function errorNoGeolocation(browserSupportFlag) {
                if (browserSupportFlag === true) {
                    app.mostrarModal("<p>Falló el servicio de Geolocalización.</p>\n\
            <p>Activa los servicios de Ubicación en tu dispositivo o el GPS para mayor precisión.</p>\n\
            <p>Te ubicamos en Mendoza/Plaza Independencia.</p>", 'Error');
                } else {
                    app.mostrarModal("Tu navegador no soporta Geolocalización. Te ubicamos en Mendoza/Plaza Independencia.", 'Error');
                }
                $('#origen').val('Plaza Independencia, Mendoza, Argentina');
                app.deshabilitarBtnMostrar();
            }
        };

//Recibe una dirección en formato texto y devuelve las coordenadas a la funcion de callback
        app.myGeocoder = function(posicion, callback) {
            geocoder.geocode({'address': posicion, 'region': 'AR'}, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    callback(results[0].geometry.location);
                } else {
                    app.mostrarModal("No encontramos la dirección: " + posicion + ". Escribela correctamente.", 'Error');
                    callback(null);
                }
            });
        };

//Recibe (LatLng) y devuelve la ubicacion en Modo Texto a traves de callback
        app.myGeocoderInverso = function(posicion, callback) {
            geocoder.geocode({'latLng': posicion}, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    if (results[0]) {
                        callback(results[0].formatted_address);
                    }
                } else {
                    callback('');
                    app.mostrarModal("No lo podemos localizar. Intente nuevamente: " + status);
                }
            });
        };

//FUNCIONES relacionadas con la DISTANCIA ----------------------------------------------------------------------------------


//Recibe un origen (LatLng) y un destino (LatLng). Usa el algoritmo de Haversine.
//Devuelve la distancia en KM
        app.calcularDistancia = function(cordOrigen, cordDestino) {
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

            //Convierte coordenada numérica a radianes        
            function toRad(value) {
                return value * Math.PI / 180;
            }
        };

//Recibe un origen (LatLng) y un array de destinos LatLng
//Devuelve el destino más próximo al origen (Objeto con coordenada, distancia y posicion en del array)
        app.calcularMenorDistancia = function(cordOrigen, arraydestino) {
            var distancia = 9999, latlng, indice = 0, distanciaTemp;
            $.each(arraydestino, function(index, item) {
                distanciaTemp = app.calcularDistancia(cordOrigen, item);
                if (distanciaTemp < distancia) {
                    latlng = item;
                    distancia = distanciaTemp;
                    indice = index;
                }
            });
            return {'latlng': latlng, 'distancia': distancia, 'indice': indice};
        };

//Recibe un array de puntos que definen una polilínea (LatLng) 
//Devuelve la distancia total en KM
        app.calcularDistanciaPolilinea = function(arrayPuntos) {
            var distanciaTotal = 0, cantPuntos = (arrayPuntos.length - 1);
            for (var i = 0; i < cantPuntos; i++) {
                distanciaTotal += app.calcularDistancia(arrayPuntos[i], arrayPuntos[i + 1]);
            }
            return app.redondear(distanciaTotal, 2);
        };

//Recibe una polilinea
//Devuelve un array de LatLng acotado entre paradaOrigen y paradaDestino
        app.acotarPolilinea = function(polilinea) {
            var recorrido = polilinea.getPath().getArray(), recorridoAcotado = [],
                    //Devuelve el punto (LatLng) del recorrido más cercano a la parada
                    ptoOrigen = app.calcularMenorDistancia(lineaActual.paradaOrigen, recorrido),
                    ptoDestino = app.calcularMenorDistancia(lineaActual.paradaDestino, recorrido);

// //Funciones para ver si están bien los límites, dibujandolos en el mapa
//    app.insertarMarcador(ptoOrigen.latlng, 'ParadaOrigen', 'origen.png', mapa);
//    app.insertarMarcador(ptoDestino.latlng, 'ParadaDestino', 'destino.png', mapa);

//Si el ptoOrigen es más grande que el destino
            if (ptoOrigen.indice > ptoDestino.indice) {
                app.mostrarModal("El colectivo tiene que dar toda la vuelta para llegar a destino. Quizás le convenga otra línea.", 'Importante');
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
        app.redondear = function(valor, decimales) {
            var cantidad = Math.pow(10, decimales);
            return Math.round(valor * cantidad) / cantidad;
        };

//Recibe un objeto {lat,lng} y lo convierte a un LatLng
        app.convertirLatLng = function(objeto) {
            return new google.maps.LatLng(objeto.lat, objeto.lng);
        };


        //Ejecuto función principal
        app.init();

    })(Colectivos);
});
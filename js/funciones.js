var celular = {'estado': false, 'conexion': '', 'plataforma': ''};

$(function() {

// Objeto para encapsular las funciones
    var Colectivos = {};
    (function(app) {

        // Función principal autoejecutable
        app.init = function() {
            document.addEventListener('deviceready', app.bindingsPG, false);
            app.bindings();
        };

        //Inicializa todos los EVENTOS de la página
        app.bindings = function() {
            //Cuando se carga la página para seleccionar origen/detino
            $("#origenPage").on('pageshow', function() {
                app.deshabilitarBtnMostrar();
                app.limpiarAutocomplete();
            });
            $("#grupoPage").on('pagebeforeshow', function() {
                app.crearListadoGrupos();
            });
            //Cuando se carga el listado de lineas
            $("#lineasPage").on("pagebeforeshow", function(e) {
                var grupoId = app.getAtributosUrl();
                if (grupoId)
                    app.crearListadoLineas(grupoId);
            });
            //Carga el mapa sólo una vez y quita el handler
            $("#mapaPage").one("pageshow", function() {
                cargarMapa();
            });
            //Cuando se carga el mapa, dibuja el recorrido
            $("#mapaPage").on({
                "pagebeforeshow": function(e) {
                    app.modificarNavBar();
                },
                "pageshow": function(e) {
                    //Dibujo el recorrido que viene por URL
                    var lineaId = app.getAtributosUrl(), archivo = lineaId.replace(/-/g, '/');
                    $('#btnIndicacionesPage').attr("href", "#indicacionesPage?g=" + lineaId);
                    dibujarRecorrido(archivo);
                }
            });
            //Cuando se carga la página de Indicaciones
            $("#indicacionesPage").on('pagebeforeshow', function() {
                var lineaId = app.getAtributosUrl(), archivo = lineaId.replace(/-/g, '/');
                app.generarIndicaciones(archivo);
            });
            //Cuando hago clic sobre el header del mapa, se abre un modal con los datos
            $('#headMapa').on('click', function() {
                mostrarModal(this.innerHTML, 'Información de la Línea');
            });
            //Capturador de eventos
//            $(document).on("pagebeforeload pageload pageloadfailed pagebeforechange pagechange pagechangefailed pagebeforeshow pagebeforehide pageshow pagehide pagebeforecreate pagecreate pageinit pageremove updatelayout", function(e) {
//                console.log(e.type);
//            });
            //Clic en el botón Buscar
            $("#btnBuscarRecorridos").on('click', function() {
                var origenDiv = $('#origen').val(), destinoDiv = $('#destino').val();
                if (celular.estado === false) {
                    mostrarModal("No hay acceso a Internet. \n\
                    Habilite la conexión de datos o WiFi para proceder", "Error");
                }
                else {
                    buscarOrigenDestino(origenDiv, destinoDiv);
                }
                //listarLineasCercanas(origen.position, destino.position);
            });
            //Listeners para autocompletar los campos origen y destino.
            $('#origen').on('keyup', function() {
                app.deshabilitarBtnMostrar();
                generarPredicciones('#' + this.id, this.value, '#ulOrigen');
            });
            $('#destino').on('keydown', function() {
                var posicion = $(this).position().top + 300;
                $.mobile.silentScroll(posicion);
                app.deshabilitarBtnMostrar();
                generarPredicciones('#' + this.id, this.value, '#ulDestino');
            });
            //Clic en el botón ¿Donde estoy?
            $('#origenAutomatico').on('click', function() {
                detectarUbicacion();
                app.deshabilitarBtnMostrar();
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
            //Al tocar el botón SALIR
            $("#btnSalir").on('click', function() {
                app.cerrarAplicacion();
            });
        };

//Manejador de eventos de PhoneGap
        app.bindingsPG = function()
        {
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

        //Lee la url actual y devuelve la cadena que le sigue al '='
        app.getAtributosUrl = function() {
            var url = window.location.hash;
            return url.split("=")[1];
        };

        //Deshabilita/Habilita el botón 'Mostrar Mapa' dependiendo del input
        app.deshabilitarBtnMostrar = function() {
            var origen = $('#origen').val(), destino = $('#destino').val();
            if (origen === '' || destino === '')
                //$('#btnBuscarRecorridos').addClass('ui-disabled');
                $('#btnBuscarRecorridos').button('disable');
            else
                $('#btnBuscarRecorridos').button('enable');
        };

        //Genera un listView dinámico de TODOS los Grupos/Recorridos
        app.crearListadoGrupos = function() {
            if (cache.sesion === false) {
                cache.sesion = true;
                var html = '', li = "<li><a href='#lineasPage?g=ID'><div id='cuadradito'>NUMERO</div>NOMBRE</a><span class='ui-li-count'>CANTIDAD</span></li>";
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
                var html = '', li = "<li><a href='#mapaPage?g=GRUPO-LINEA'><div id='cuadradito'>NUMERO</div>NOMBRE</a></li>";
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

//Dibuja el ListView de Indicaciones. Hace todos los cálculos necesarios.
        app.generarIndicaciones = function(nombreArchivo) {
            if (nombreArchivo !== cache.indicaciones) {
                cargarLoader(true);
                cache.indicaciones = nombreArchivo;

                //Corta la Polilinea desde la paradaOrigen hasta paradaDestino
                var recorridoAcotado = acotarPolilinea(lineaActual.recorrido),
                        //Calcula la distancia en KM de la polilínea acotada
                        distanciaColectivo = (calcularDistanciaPolilinea(recorridoAcotado)),
                        //Calcula el tiempo de recorrido del colectivo sobre esa polilínea a 50km/h
                        tiempoColectivo = Math.round((distanciaColectivo * 60) / 50),
                        distanciaTotal = '', tiempoTotal = '';

                //Usa Directions para calcular la ruta desde origen->paradaOrigen; paradaDestino->destino
                calcularRuta(origen.position, lineaActual.paradaOrigen, function(ruta) {
                    $('#LDindicaciones1').html('Camina hasta ' + ruta.destino + '.<br>Distancia: ' + ruta.distancia + ' km. Tiempo: ' + ruta.duracion + ' min.');
                    $('#indicaciones1').html(ruta.instrucciones);
                    calcularRuta(lineaActual.paradaDestino, destino.position, function(ruta2) {
                        $('#LDindicaciones2').html('Tramo en Colectivo. Distancia: ' + distanciaColectivo + ' km. Tiempo: ' + tiempoColectivo + ' min');
                        $('#indicaciones2').html('Toma el colectivo ' + lineaActual.numero + ' - ' + lineaActual.nombre + ' y baja en ' + ruta2.origen);
                        $('#LDindicaciones3').html('Caminar desde ' + ruta2.origen + ' hasta el destino.<br>Distancia: ' + ruta2.distancia + ' km. Tiempo: ' + ruta2.duracion + ' min.');
                        $('#indicaciones3').html(ruta2.instrucciones);
                        distanciaTotal = ruta.distancia + ruta2.distancia + distanciaColectivo;
                        tiempoTotal = ruta.duracion + ruta2.duracion + tiempoColectivo;
                        $('#indicacionesTotal').html('Distancia Total: ' + redondear(distanciaTotal, 2) + ' km. Tiempo Total: ' + tiempoTotal + ' min.');
                        cargarLoader(false);
                    });
                });
                //directionsDisplay.setPanel(document.getElementById("indicacionesPanel"));
            }
        };

        //Ejecuto función principal
        app.init();

    })(Colectivos);
});


//Carga el Widget de la ruedita girando, si recibe TRUE
function cargarLoader(activar) {
    var accion = activar ? 'show' : 'hide';
    $.mobile.loading(accion);
}

//Recibe una cadena de teto y la muestra en un Modal de Error
function mostrarModal(texto, titulo) {
    $("#lnkDialog").click();
    $("#dialogText").html(texto);
    $("#dialogTitle").html(titulo);
}

//petición cross-domain
function getJSONremoto(url, datos, callback) {
    $.ajax({
        url: url,
        dataType: 'jsonp',
        data: datos,
        success: function(data) {
            callback(data);
        },
        error: function(data) {
            mostrarModal('Error de conexión', 'Error');
            console.debug(data);
        }
    });
}
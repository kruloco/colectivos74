$(function() {
// Objeto para encapsular las funciones
    var Colectivos = {};
    //funcion autoejecutable
    (function(app) {
        //VARIABLES GLOBALES ---------------------------------------------------------------------------------------------
        var celular = {'estado': true, 'conexion': '', 'plataforma': ''}, //CAMBIAR ESTADO:TRUE PARA DESHABILITAR PHONEGAP
        mapa = null, origen = null, destino = null, colectivo = null,
                paradasOrigen = [], paradasDestino = [], mejoresRecorridos = [],
                //Infowindow para Origen y destino
                infoOrigen = new google.maps.InfoWindow(), infoDestino = new google.maps.InfoWindow(),
                //Almacena el string grupo_id/parada_id del último recorrido consultado
                cache = {recorrido: '', indicaciones: '', sesion: false, grupoId: ''}, db = null,
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
//                controlador = "http://colectivo.site90.net/";
        controlador = "http://localhost/colectivosServer/controladores/";

        // Función principal
        app.init = function() {
            document.addEventListener('deviceready', app.deviceReady, false);
            app.bindings();

            //Genero una DB colectivos si no existe
            db = window.openDatabase("colectivosAPP", "1.0", "Colectivos", 1024 * 1024 * 10);
            //Verifica si la DB ya está poblada o si se acaba de crear
            db.transaction(function(tx) {
                tx.executeSql('SELECT * FROM GRUPO', [], function(tx) {
                    console.log('query select OK');
                }, app.sqlDBVacia);
            },
                    app.txError, function() {
                        console.log('trans principal OK');
                    });
        };

        //Inicializa todos los EVENTOS de la página ---------------------------------------------------------------------
        app.bindings = function() {
            //Cuando se carga la página para seleccionar origen/detino
            $("#origenPage").on('pageshow', function() {
                app.deshabilitarBtnMostrar();
                app.limpiarAutocomplete();
            });
            $("#grupoPage").on('pagebeforeshow', function() {
                if (cache.sesion === false) {
                    cache.sesion = true;
                    app.crearListadoGrupos();
                }
            });
            //Cuando hago clic en un grupo, guardo ese id en data-grupo para capturarlo desde otro página
            $("#gruposList").on('click', ".grupo", function() {
                sessionStorage.grupoSeleccionado = $(this).attr("data-grupo");
            });
            //Cuando hago clic en una linea, guardo ese id en data-linea para capturarlo desde otro página
            $("#lineasList").on('click', ".linea", function() {
                sessionStorage.lineaSeleccionada = $(this).attr("data-linea");
                sessionStorage.lineaSeleccionadaIndice = $(this).attr("data-linea-indice");
                lineaActual.nombre = $(this).attr("data-nombre");
                lineaActual.numero = $(this).attr("data-numero");
                ;
            });
            //Cuando se carga el listado de lineas
            $("#lineasPage").on("pagebeforeshow", function(e, data) {
                var grupoId = sessionStorage.grupoSeleccionado;
                var paginaAnterior = data.prevPage.attr('id');
                //Si vengo de la página grupoPage dibujo las líneas del grupo seleccionado
                if (grupoId && paginaAnterior === 'grupoPage') {
                    //CACHE: Si elijo un grupo y luego toco BACK y vuelvo a elegir el mismo grupo, no redibujo las líneas
                    if (cache.grupoId !== grupoId) {
                        cache.grupoId = grupoId;
                        app.crearListadoLineas(grupoId);
                    }
                }
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
                    var linea = sessionStorage.lineaSeleccionada;
                    app.dibujarRecorrido(linea);
                }
            });
            //Cuando se carga la página de Indicaciones
            $("#indicacionesPage").on('pagebeforeshow', function() {
                app.generarIndicaciones(sessionStorage.lineaSeleccionada);
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

// PHONEGAP -------------------------------------------------------------------------------------------------------------
        app.deviceReady = function()
        {
            navigator.splashscreen.show();
            //Setea celular.estado, que sirve para saber durante el transcurso de la aplicación si hay accesso a internet
            celular.conexion = app.getConexion();
            if ((celular.conexion !== 'Ninguna') && (celular.conexion !== 'Desconocida')) {
                celular.estado = true;
            }
            app.bindingsPG();
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

// SQLITE -----------------------------------------------------------------------------------------------------------
        // RollBack Transaccion - Error
        app.txError = function(tx, err) {
            alert("Error de Base de Datos: " + err.code);
        };

        // RollBack Cnsulta - Error
        app.consultaError = function(tx, err) {
            alert("Error de Consulta: " + err.code + err.message);
            return true;
        };

        //Si NO existe la DB
        app.sqlDBVacia = function(tx, err) {
            //Si no existe la tabla entonces poblo la DB con todos los datos
            if (err.code === 5)
            {
                app.cargarLoader(true);
                app.cargarArchivoenDB(tx, 'sqlite/estructura.sql');
                app.cargarArchivoenDB(tx, 'sqlite/datos.sql');
                app.cargarLoader(false);
                return false; //Sin Rollback
            }
            return true; //Rollback
        };

        //Recibe un archivo con consultas SQLite y las ejecuta una por una
        app.cargarArchivoenDB = function(tx, archivo) {
            $.ajax({
                type: "GET",
                url: archivo,
                dataType: "text",
                async: false
            })
                    .done(function(data) {
                        var consulta = data.split(';');
                        var total = consulta.length - 1;
                        for (var i = 0; i < total; i++) {
                            tx.executeSql(consulta[i]);
                        }
                    });
        };

        //Recibe las coordenadas de origen y destino y busca en la DB las paradas que pasen por ambos
//Genera un array de Lineas listo para mostrar en el listView y se lo pasa a app.crearListadoMejoresRecorridos()
        app.listarLineasCercanas = function(cordOrigen, cordDestino) {
            app.cargarLoader(true);

            //Busca las paradas cercanas
            db.transaction(function(tx) {
                app.buscarParadasCercanas(tx, cordOrigen.lat(), cordOrigen.lng(), 'origen');
            }, app.txError, function() {
                console.log('trans query ORIGEN OK');
                //Si hay paradas en el origen, busco en el destino
                if (paradasOrigen)
                {
                    db.transaction(function(tx) {
                        app.buscarParadasCercanas(tx, cordDestino.lat(), cordDestino.lng(), 'destino');
                    }, app.txError, function() {
                        console.log('trans query DESTINO OK');
                        //Si hay paradas en el destino, hago el algoritmo para encontrar los recorridos
                        if (paradasDestino)
                        {
                            //Busco Lineas en comun entre los dos arrays
                            var hayLineas = app.buscarLineasEnComun(paradasOrigen, paradasDestino);
                            (hayLineas) ? app.ordenarLineasPorTiempo() : app.mostrarModal('No hay Recorridos', 'Información');
                        }
                        else {
                            app.mostrarModal('No hay paradas cerca del Destino', 'Información');
                        }
                    });
                }
                else {
                    app.mostrarModal('No hay paradas cerca del Origen', 'Información');
                }
            });
        };

        app.buscarParadasCercanas = function(tx, lat, lng, lugar) {
            var lng_rad = app.toRad(lng);
            var lat_rad = app.toRad(lat);
            var sen_lat = Math.sin(lat_rad);
            var cos_lat = Math.cos(lat_rad);
            var sen_lng = Math.sin(lng_rad);
            var cos_lng = Math.cos(lng_rad);
            var radio = Math.cos(0.5 / 6378);
            var query = "SELECT linea.linea_id, parada.parada_id, parada.latitud, parada.longitud, \n\
        ( ? * lat_sen + ? * lat_cos* ( ? * lng_cos + ? * lng_sen ) ) AS distancia \n\
        FROM parada JOIN linea_parada USING ( parada_id ) JOIN linea USING ( linea_id ) \n\
        WHERE distancia > ? ORDER BY linea.linea_id ASC, distancia DESC;";

            tx.executeSql(query, [sen_lat, cos_lat, cos_lng, sen_lng, radio],
                    function(tx, resultSet) {
                        app.paradasOk(tx, resultSet, sen_lat, cos_lat, cos_lng, sen_lng, radio, query, lugar);
                    }, app.paradasError);
        };

        app.paradasOk = function(tx, resultSet, sen_lat, cos_lat, cos_lng, sen_lng, radio, query, lugar) {
            var cantidad = resultSet.rows.length, radioNuevo, radioKM = Math.acos(radio) * 6378;
            console.debug('CANTIDAD ' + lugar + ': ' + cantidad);
            //Si no hay resultados, repito la consula con un radio mayor
            console.log('radio KM: ' + radioKM);
            if (cantidad === 0 && radioKM < 1.3)
            {
                //Aumento el radio en 100 metros y luego lo convierto
                radioKM += 0.1;
                radioNuevo = Math.cos(radioKM / 6378);
                tx.executeSql(query, [sen_lat, cos_lat, cos_lng, sen_lng, radioNuevo], function(tx, resultSet) {
                    app.paradasOk(tx, resultSet, sen_lat, cos_lat, cos_lng, sen_lng, radioNuevo, query, lugar);
                }, app.paradasError);
            }
            else
            {
                //Si hay resultados los guardo en arrays globales
                if (cantidad !== 0) {
                    var arrayObjetos = [];
                    //limpio el array para dejar solamente una linea_id con una sola parada_id (la de menor distancia)
                    arrayObjetos.push(resultSet.rows.item(0));
                    for (var i = 1; i < cantidad; i++) {
                        if (resultSet.rows.item(i - 1).linea_id !== resultSet.rows.item(i).linea_id) {
                            arrayObjetos.push(resultSet.rows.item(i));
                        }
                    }
                    console.debug('CANTIDAD LIMPIA ' + lugar + ': ' + arrayObjetos.length);
                    if (lugar === 'origen') {
                        paradasOrigen = arrayObjetos;
                    }
                    else if (lugar === 'destino') {
                        paradasDestino = arrayObjetos;
                    }
                }
                //Si no hay resultados anulo el array
                else {
                    if (lugar === 'origen') {
                        paradasOrigen = null;
                    }
                    else if (lugar === 'destino') {
                        paradasDestino = null;
                    }
                }
            }

        };

        app.paradasError = function(tx, err) {
            console.log("Error de Paradas: " + err.code + err.message);
            return true;
        };

        //Recibe 2 Arrays, busca las líneas que tienen en común y carga el array global mejoresRecorridos con esas líneas
        //Si no econtró lineas en comun devuelve false, sino true.
        app.buscarLineasEnComun = function(arrayOrigen, arrayDestino)
        {
            var encontrada, objetoTemp = {};
            mejoresRecorridos = [];

            for (var i = 0, max = arrayOrigen.length; i < max; i++) {
//                console.log(arrayOrigen[i]);
                encontrada = arrayDestino.busquedaBinaria(arrayOrigen[i].linea_id);
                //Si la línea es común a ambos arrays, la inserta en el nuevo Array
                if (encontrada !== -1) {
                    objetoTemp = {
                        linea_id: arrayOrigen[i].linea_id,
                        paradaOrigen: {
                            id: arrayOrigen[i].parada_id,
                            lat: arrayOrigen[i].latitud,
                            lng: arrayOrigen[i].longitud,
                            distancia: Math.acos(arrayOrigen[i].distancia) * 6378000 //METROS
                        },
                        paradaDestino: {
                            id: arrayDestino[encontrada].parada_id,
                            lat: arrayDestino[encontrada].latitud,
                            lng: arrayDestino[encontrada].longitud,
                            distancia: Math.acos(arrayDestino[encontrada].distancia) * 6378000 //METROS
                        },
                    };
                    mejoresRecorridos.push(objetoTemp);
                }
            }
            console.log('CANTIDAD EN COMUN: ' + mejoresRecorridos.length);

            if (mejoresRecorridos.length > 0)
                return true;
            return false;
        };


//Ordena el array global mejoresRecorridos por tiempo de menor a mayor
        app.ordenarLineasPorTiempo = function() {
            db.transaction(
                    function(tx) {
                        app.traerRecorridoDb(tx, 0);
                    },
                    null, function() {
                        //ORDENO el array por distancia ASC y creo el listview
                        app.metodoBurbujaDistancia(mejoresRecorridos);
                        app.crearListadoMejoresRecorridos(mejoresRecorridos);
                    });

        };

        //Hace una consulta a la DB y crea la polilinea que representa al recorrido
        //También carga en la variable global mejoresRecorridos el nombre y numero de la linea
        app.traerRecorridoDb = function(tx, indice) {
            var recorrido = [], recorridoAcotado = [], distanciaColectivo = 0, tiempoColectivo = 0, row = {},
                    mejorRecorrido = mejoresRecorridos[indice],
                    trazaRuta = {
                        path: null,
                        strokeColor: "red",
                        stokeOpacity: 1,
                        strokeWeight: 4,
                        clickable: false
                    };
//Consulto por linea_id y traigo el nombre y numero de la linea para mostrar en el listview
            tx.executeSql("SELECT nombre, numero, linea_id FROM linea WHERE linea_id=?", [mejorRecorrido.linea_id],
                    function(tx, resultSet) {
                        row = resultSet.rows.item(0);
                        mejorRecorrido.nombre = row.nombre;
                        mejorRecorrido.numero = row.numero;
                    }
            , app.consultaError);

            //Consulto por linea_id y traigo el recorrido para calcular la distancia/tiempo
            tx.executeSql("SELECT latitud AS lat, longitud AS lng FROM recorrido WHERE linea_id=?", [mejorRecorrido.linea_id],
                    function(tx, resultSet) {

                        for (var j = 0, max = resultSet.rows.length; j < max; j++) {
                            row = resultSet.rows.item(j);
                            recorrido.push(app.convertirLatLng(row));
                        }
                        trazaRuta.path = recorrido;
                        recorridoAcotado = app.acotarPolilinea(new google.maps.Polyline(trazaRuta), app.convertirLatLng(mejorRecorrido.paradaOrigen), app.convertirLatLng(mejorRecorrido.paradaDestino));
                        //Calcula la distancia en KM de la polilínea acotada
                        distanciaColectivo = (app.calcularDistanciaPolilinea(recorridoAcotado.recorrido));
                        //Calcula el tiempo de recorrido del colectivo sobre esa polilínea a 50km/h
                        tiempoColectivo = Math.round((distanciaColectivo * 60) / 50);
                        mejorRecorrido.distanciaColectivo = distanciaColectivo;
                        mejorRecorrido.tiempoColectivo = tiempoColectivo;
                        mejorRecorrido.vuelta = recorridoAcotado.vuelta;

                        //Esta es la recursividad para no hacer un FOR con consultas
                        if (mejoresRecorridos.length - 1 > indice) {
                            app.traerRecorridoDb(tx, ++indice);
                        }
                    }, app.consultaError
                    );
        };



//Método de la Burbuja para ordenar un array por distanciaColectivo
        app.metodoBurbujaDistancia = function(array) {
            var cantidad = array.length, temp;
            for (var vuelta = 1; vuelta < cantidad; vuelta++) {
                for (var i = 0; i < (cantidad - vuelta); i++) {
                    if (array[i].distanciaColectivo > array[i + 1].distanciaColectivo) {
                        temp = array[i];
                        array[i] = array[i + 1];
                        array[i + 1] = temp;
                    }
                }
            }
            return array;
        };

        //Búsqueda binaria adaptada para 'linea_id'
        //Devuelve -1 si no encuentra el elemento, sino devuelve la posicion del elemento en el array
        app.binaryIndexOf = function(searchElement) {
            'use strict';
            var minIndex = 0, maxIndex = this.length - 1, currentIndex, currentElement;

            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0;
                currentElement = this[currentIndex]['linea_id'];

                if (currentElement < searchElement) {
                    minIndex = currentIndex + 1;
                }
                else if (currentElement > searchElement) {
                    maxIndex = currentIndex - 1;
                }
                else {
                    return currentIndex;
                }
            }
            return -1;
        };

        Array.prototype.busquedaBinaria = app.binaryIndexOf;

//Manejador de eventos de PhoneGap ---------------------------------------------------------------------------------------
        app.bindingsPG = function()
        {
            celular.plataforma = device.platform;
            //Desactivo los botones BUSCAR y MENU de Android o Blackberry
            if ((celular.plataforma === "Android") || (celular.plataforma === "3.0.0.100")) {
                document.addEventListener("menubutton", function() {
                    alert('botón desactivado');
                }, false);
                document.addEventListener("searchbutton", function() {
                    alert('botón desactivado');
                }, false);
            }
            //Cuando el dispositivo tiene conexión a internet
            document.addEventListener("online", function() {
                celular.estado = true;
            }, false);
            //Cuando el dispositivo pierde la conexión a internet
            document.addEventListener("offline", function() {
                celular.estado = false;
            }, false);
//            document.addEventListener("pause", app.cerrarAplicacion, false);
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
            var html = '', li = "<li class='grupo' data-grupo='ID'><a href='#lineasPage'><div id='cuadradito'>NUMERO</div>NOMBRE</a><span class='ui-li-count'>CANTIDAD</span></li>", row;
            //Hago una consulta y obtengo el array de grupos
            db.transaction(
                    function(tx) {
                        tx.executeSql("SELECT COUNT( * ) AS cantLineas, grupo.* FROM grupo JOIN linea_grupo USING ( grupo_id ) GROUP BY grupo_id", [],
                                function(tx, resultSet) {
                                    for (var i = 0, max = resultSet.rows.length; i < max; i++) {
                                        row = resultSet.rows.item(i);
                                        html += li.replace(/NOMBRE/g, row.nombre).replace(/NUMERO/g, row.numero).replace(/CANTIDAD/g, row.cantLineas).replace(/ID/g, row.grupo_id);
                                    }
                                    $('#gruposList').html(html).listview('refresh');
                                });
                    });
        };

        //Recibe ID de Grupo y Genera un listView dinámico de sus lineas
        app.crearListadoLineas = function(idGrupo) {
            var html = '', li = "<li class='linea' data-linea='LINEA' data-nombre='NOMBRE' data-numero='NUMERO'><a href='#mapaPage'><div id='cuadradito'>NUMERO</div>NOMBRE</a></li>", row;
            db.transaction(
                    function(tx) {
                        tx.executeSql("SELECT * FROM linea JOIN linea_grupo USING ( linea_id ) WHERE grupo_id=?", [idGrupo],
                                function(tx, resultSet) {
                                    for (var i = 0, max = resultSet.rows.length; i < max; i++) {
                                        row = resultSet.rows.item(i);
                                        html += li.replace(/NOMBRE/g, row.nombre).replace(/NUMERO/g, row.numero).replace(/LINEA/g, row.linea_id);
                                    }
                                    $('#lineasList').html(html).listview('refresh');
                                });
                    });
        };

        //Recibe un array de los mejores recorridos y genera un listView dinámico
        app.crearListadoMejoresRecorridos = function(arrayLineas) {
            var html = '', li = "<li class='linea' data-linea='LINEA' data-nombre='NOMBRE' data-numero='NUMERO' data-linea-indice=INDICE><a href='#mapaPage'><div id='cuadradito'>NUMERO</div>NOMBRE</a><span class='ui-li-count'>TIEMPO</span></li>";
            $.each(arrayLineas, function(index, data) {
                html += li.replace(/NOMBRE/g, data.nombre).replace(/NUMERO/g, data.numero).replace(/LINEA/g, data.linea_id).replace(/INDICE/g, index).replace(/TIEMPO/g, app.minAHoras(data.tiempoColectivo));
            });
            $.mobile.changePage("#lineasPage");
            $('#lineasList').html(html).listview('refresh');
        };

        //Dibuja el ListView de Indicaciones. Hace todos los cálculos necesarios.
        app.generarIndicaciones = function(lineaId) {
            if (lineaId !== cache.indicaciones) {
                app.cargarLoader(true);
                cache.indicaciones = lineaId;

                var mejorRecorrido = mejoresRecorridos[sessionStorage.lineaSeleccionadaIndice],
                        distanciaTotal = '', tiempoTotal = '',
                        distanciaColectivo = mejorRecorrido.distanciaColectivo, tiempoColectivo = mejorRecorrido.tiempoColectivo;

                mejorRecorrido.vuelta ? app.mostrarModal("El colectivo tiene que dar toda la vuelta para llegar a destino. Quizás le convenga otra línea.", 'Importante') : null;
                //Usa Directions para calcular la ruta desde origen->paradaOrigen; paradaDestino->destino
                app.calcularRuta(origen.position, lineaActual.paradaOrigen, function(ruta) {
                    $('#LDindicaciones1').html('Camina hasta ' + ruta.destino + '.<br>Distancia: ' + ruta.distancia + ' km. Tiempo: ' + ruta.duracion + ' min.');
                    $('#indicaciones1').html(ruta.instrucciones);
                    app.calcularRuta(lineaActual.paradaDestino, destino.position, function(ruta2) {
                        $('#LDindicaciones2').html('Tramo en Colectivo. Distancia: ' + distanciaColectivo + ' km. Tiempo: ' + tiempoColectivo + ' min');
                        $('#indicaciones2').html('Toma el colectivo <span style="color:#2489ce">' + lineaActual.numero + ' - ' + lineaActual.nombre + '</span> y baja en ' + ruta2.origen);
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

//Recibe un id de linea y dibuja el recorrido y paradas en el mapa
//Guarda la polilínea y las paradas en las variable global lineaActual
        app.dibujarRecorrido = function(lineaId) {
            var parada = null, recorrido = [], arrayParadas = [], latlng = null, row = null, mejorRecorrido = null,
                    trazaRuta = {
                        path: recorrido,
                        strokeColor: "red",
                        stokeOpacity: 1,
                        strokeWeight: 4,
                        clickable: false
                    };
            //Si está en la caché, no vuelvo a dibujar el recorrido
            if (lineaId !== cache.recorrido) {
                cache.recorrido = lineaId;

                //Busca en la DB la polilinea y la guarda en la variable global
                db.transaction(function(tx) {
                    tx.executeSql('SELECT latitud AS lat, longitud AS lng FROM recorrido WHERE linea_id=?', [lineaId], function(tx, resultSet) {
                        for (var i = 0, max = resultSet.rows.length; i < max; i++) {
                            row = resultSet.rows.item(i);
                            recorrido.push(app.convertirLatLng(row));
                            // app.insertarMarcador(new google.maps.LatLng(item.lat, item.lng),'', "accesdenied.png",mapa);
                        }
                    }, app.consultaError);
                    //Traigo el nombre y numero del grupo
                    tx.executeSql('SELECT nombre, numero FROM grupo JOIN linea_grupo USING(grupo_id) WHERE linea_id=?', [lineaId], function(tx, resultSet) {
                        //Si vengo del listado de mejores recorridos, guardo el recorrido en una variable
                        mejorRecorrido = (typeof sessionStorage.lineaSeleccionadaIndice === 'undefined') ? null : mejoresRecorridos[sessionStorage.lineaSeleccionadaIndice];
                        row = resultSet.rows.item(0);
                        //Guardo las varibles globales y Escribo la línea del colectivo en el Header del Mapa
                        lineaActual.grupo_numero = row.numero;
                        lineaActual.grupo_nombre = row.nombre;
                        if (mejorRecorrido) {
                            lineaActual.paradaOrigen = app.convertirLatLng(mejorRecorrido.paradaOrigen);
                            lineaActual.paradaDestino = app.convertirLatLng(mejorRecorrido.paradaDestino);
                        }
                        $('#headMapa').html(lineaActual.numero + ' ' + lineaActual.nombre);

                    }, app.consultaError);
                },
                        app.txError, function() {

                            //Busca en la DB las paradas y las guarda en la variable global
                            db.transaction(function(tx) {
                                trazaRuta.path = recorrido;
                                app.vaciarRecorridos();
                                lineaActual.recorrido = new google.maps.Polyline(trazaRuta);
                                lineaActual.recorrido.setMap(mapa);

                                tx.executeSql('SELECT latitud AS lat, longitud AS lng, parada_id FROM parada JOIN linea_parada USING(parada_id) WHERE linea_id=? ORDER BY posicion ASC', [lineaId], function(tx, resultSet) {
                                    for (var i = 0, max = resultSet.rows.length; i < max; i++) {
                                        row = resultSet.rows.item(i);
                                        latlng = app.convertirLatLng(row);
                                        arrayParadas.push(latlng);
                                        //inserto los marcadores de las paradas
                                        parada = app.insertarMarcador(latlng, i.toString(), "busstop.png", mapa);
                                        parada.clickable = true;
                                        //Si la parada es la de origen o la de destino, la hago rebotar
                                        if (mejorRecorrido && (mejorRecorrido.paradaOrigen.id === row.parada_id || mejorRecorrido.paradaDestino.id === row.parada_id)) {
                                            parada.setAnimation(google.maps.Animation.BOUNCE);
                                        }
                                        lineaActual.paradas.push(parada);
                                    }
                                    //Si todavía no definen el origen centro el mapa en alguna parada; sino lo centro en el origen
                                    var centro = origen ? origen.position : parada.position;
                                    mapa.setCenter(centro);

                                }, app.consultaError);
                            },
                                    app.txError);
                        });
            }
            else
                app.cargarLoader(false);
        };

//Vaciar el array de linea.paradas, linea.recorrido y el colectivo actual GPS
        app.vaciarRecorridos = function() {
            if (lineaActual.recorrido)
                lineaActual.recorrido.setMap(null);
            if (lineaActual.paradas)
                $.each(lineaActual.paradas, function(index, item) {
                    item.setMap(null);
                });
            lineaActual.paradas = [];
            if (colectivo)
                colectivo.setMap(null);
        };

//Recibe array de colectivos {JSON{id,lat,lng}}
//Dibuja en el mapa el colectivo más cercano al origen
        app.dibujarColectivo = function(colectivos) {
            var arrayLatLng = [];
            $.each(colectivos, function(index, item) {
                arrayLatLng.push(app.convertirLatLng(item));
            });
            //Devuelve el colectivo (LatLng) más cercano al origen
            var puntoOrigen = app.calcularMenorDistancia(origen.position, arrayLatLng);
            if (colectivo)
                colectivo.setMap(null);
            colectivo = app.insertarMarcador(puntoOrigen.latlng, '', "busGPS.png", mapa);
            colectivo.setAnimation(google.maps.Animation.BOUNCE);
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
                    dLat = app.toRad(lat2 - lat1), dLon = app.toRad(lon2 - lon1),
                    R = 6371, a, c, distancia;
            a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(app.toRad(lat1)) * Math.cos(app.toRad(lat2)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
            c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distancia = R * c;
            return distancia;
        };

//Convierte coordenada numérica a radianes        
        app.toRad = function(value) {
            return value * Math.PI / 180;
        };

//Recibe un origen (LatLng) y un array de destinos LatLng
//Devuelve el destino más próximo al origen (OBJETO PROPIO con coordenada, distancia y posicion en del array)
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

//Recibe una polilinea y dos puntos donde cortar (LatLng)
//Devuelve un Objeto con:
//recorrido: array de LatLng acotado entre paradaOrigen y paradaDestino
//vuelta: TRUE si el ptoOrigen es Mayor que el puntoDestino
        app.acotarPolilinea = function(polilinea, corteOrigen, corteDestino) {
            var recorrido = polilinea.getPath().getArray(), recorridoAcotado = [], vuelta = false,
                    //Devuelve el punto (LatLng) del recorrido más cercano a la parada
                    ptoOrigen = app.calcularMenorDistancia(corteOrigen, recorrido),
                    ptoDestino = app.calcularMenorDistancia(corteDestino, recorrido);
//                    console.log('corte: ' + corteOrigen + ' - pto: ' + ptoOrigen.latlng);

// //Funciones para ver si están bien los límites, dibujandolos en el mapa
//    app.insertarMarcador(ptoOrigen.latlng, 'ParadaOrigen', 'origen.png', mapa);
//    app.insertarMarcador(ptoDestino.latlng, 'ParadaDestino', 'destino.png', mapa);

//Si el ptoOrigen es más grande que el destino
            if (ptoOrigen.indice > ptoDestino.indice) {
                vuelta = true;
                var parte1 = recorrido.slice(ptoOrigen.indice); //corto hasta el final
                var parte2 = recorrido.slice(0, ptoDestino.indice); //corto desde el principio
                recorridoAcotado = parte1.concat(parte2);
            }
            else {
                recorridoAcotado = recorrido.slice(ptoOrigen.indice, ptoDestino.indice);
            }
            return {recorrido: recorridoAcotado, vuelta: vuelta};
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

        app.minAHoras = function(min)
        {
            if (min < 60)
                return min + ' min';
            var hrs = Math.floor(min / 60);
            min = min % 60;
            if (min < 10)
                min = "0" + min;
            return hrs + ":" + min + ' hs';
        };


        //Ejecuto función principal
        app.init();

    })(Colectivos);
});
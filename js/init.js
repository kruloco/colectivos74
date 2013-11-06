$(document).on('mobileinit', function() {
    $.mobile.loader.prototype.options.text = "Cargando...";
    $.mobile.loader.prototype.options.textVisible = true;
    $.mobile.loader.prototype.options.theme = "a";
    $.mobile.loader.prototype.options.html = "";
    $.mobile.defaultPageTransition = "flip";
    $.mobile.pageLoadErrorMessage = "Error al cargar la página";
//    $.mobile.loadingMessageTheme = "a";
    $.mobile.pageLoadErrorMessageTheme = "b";
    $.mobile.page.prototype.options.headerTheme = "b";
    $.mobile.page.prototype.options.footerTheme = "b";
});

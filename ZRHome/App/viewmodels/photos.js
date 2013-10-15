define(['plugins/http', 'knockout', 'services/logger', 'services/photostream', 'services/common'], function (http, ko, logger, photostream, common) {
    
    var _images = ko.observableArray([]);

    var photos = {
        title: 'Ann & Zubin Photography',
        images: _images,
        compositionComplete: compositionComplete
    };

    return photos;

    function compositionComplete() {

        // add custom bindings to handle isotope
        addCustomBindings();

        // get the data async
        //$.when(
        //    // load the photos async
        //    photostream.load(common.photoUrl)
        //)
        //.done(function () {
        //    //logger.log("loaded", null, true);

        //    _images(photostream.stream());


        //    // hide the image once the data is loaded
        //    $("#photos-loading").hide();

        //    // initialize lazy load library
        //    common.initializeLazyLoad();

        //    // initialize fancy box library
        //    common.initializeFancyBox();

        //});

        photostream.load(common.photoUrl, done, fail);

        var $galleryContainer = $("#gallery-container");


        $("#gallery .filters a").click( function () {

            var selector = $(this).attr("data-filter");
                
            // trigger isotope filter
            $galleryContainer.isotope({ filter: selector });


            // set link color
            $(this).toggleClass("selected");
            $("#gallery .filters a").not(this).removeClass("selected"); //remove the 'selected class from all other elements

            return false;
        });

    }

    function done() {
        //logger.log('Data loaded, Yo!', null, true);

        _images(photostream.stream());

        // hide the image once the data is loaded
        $("#photos-loading").hide();

        // initialize lazy load library
        common.initializeLazyLoad();

        // initialize fancy box library
        common.initializeFancyBox();

    }

    function fail() {
        logger.logError('Data didn\'t load as expected. Please try again.', null, true);

        // hide the image once the data is loaded
        $("#photos-loading").hide();
    }

    function addCustomBindings() {

        ko.bindingHandlers.isotope = {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

            },
            update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

                var $el = $(element);
                var value = ko.utils.unwrapObservable(valueAccessor());

                var $container = $(value.container);

                $container.isotope({
                    itemSelector: value.itemSelector,
                    onLayout: function () {
                        //$("img:in-viewport").trigger("appear");   
                        $(window).trigger("scroll");  // patch 1 of 2: triggers image load after an isotope filter is applied
                    }
                });

                $container.isotope('appended', $el);

            }

        };

    }

});
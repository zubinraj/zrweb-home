define(['plugins/http', 'knockout', 'services/logger', 'services/photostream', 'services/common'], function (http, ko, logger, photostream, common) {
    
    var photos = {
        title: 'Ann & Zubin Photography',
        images: photostream.stream(),  //ko.observableArray([]),
        activate: activate,
        compositionComplete: compositionComplete
    }

    return photos;

    function compositionComplete() {
        var $galleryContainer = $("#gallery-container");

        // call relayout on isotope
        $galleryContainer.isotope('reLayout');

        // initialize lazy load library
        common.initializeLazyLoad();

        // initialize fancy box library
        common.initializeFancyBox();

        $("#gallery .filters a").click( function () {

            var selector = $(this).attr("data-filter");
                
            // trigger isotope filter
            $galleryContainer.isotope({ filter: selector });


            // set link color
            $(this).toggleClass("selected");
            $("#gallery .filters a").not(this).removeClass("selected"); //remove the 'selected class from all other elements

            return false;
        });

        // hide the loader, when the rendering is complete
        common.hideLoader();

    }

    function activate() {

        // add custom bindings to handle isotope
        addCustomBindings();

        // load the photos async
        photostream.load(common.photoUrl);

        return;
    }

    function addCustomBindings() {

        ko.bindingHandlers.isotope = {
            update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

                var $el = $(element),
                    value = ko.utils.unwrapObservable(valueAccessor());

                if ($el.hasClass('isotope')) {
                    $el.isotope('reLayout');
                }
                else {
                    $el.isotope({
                        itemSelector: value.itemSelector
                    });
                }
            }

        };

    }

});
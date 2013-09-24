define(['plugins/http', 'knockout', 'services/logger', 'services/photostream'], function (http, ko, logger, photostream) {
    
    var ctor = {
        title: 'Ann & Zubin Photography',
        images: photostream.stream(),  //ko.observableArray([]),
        activate: activate,
        compositionComplete: compositionComplete
    }

    return ctor;

    function compositionComplete() {
        var $galleryContainer = $("#gallery-container");

        // call relayout on isotope
        $galleryContainer.isotope('reLayout');

        // initialize lazy load
        $("img.lazy").lazyload({
            effect: "fadeIn"
        });

        // initialize fancybox
        $(".fancybox-thumb").fancybox({
            prevEffect: 'none',
            nextEffect: 'none',
            helpers: {
                title: {
                    type: 'outside'
                },
                thumbs: {
                    width: 50,
                    height: 50
                }
            }
        });

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

    function activate() {

        //the router's activator calls this function and waits for it to complete before proceding
        //if (this.images().length > 0) {
        //    return;
        //}

        // add custom bindings to handle isotope
        addCustomBindings();

        //var that = this;

        // load the photos async
        photostream.load('rss.xml');

        return;
    }

    //function select(item) {

    //}

    function addCustomBindings() {

        ko.bindingHandlers.isotope = {
            //init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

            //},
            update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

                var $el = $(element),
                    value = ko.utils.unwrapObservable(valueAccessor());

                if ($el.hasClass('isotope')) {
                    $el.isotope('reLayout');
                } else {
                    $el.isotope({
                        itemSelector: value.itemSelector
                    });
                }
            }

        };

    }

});
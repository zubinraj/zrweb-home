define(['plugins/http', 'knockout', 'services/logger', 'services/blogstream', 'services/common'], function (http, ko, logger, blogstream, common) {

    var blog = {
        title: 'Zubin\'s Web Log',
        items: blogstream.stream(),  //ko.observableArray([]),
        activate: activate,
        compositionComplete: compositionComplete
    }

    return blog;

    function compositionComplete() {
        var $blogContainer = $("#blog-container");

        // call relayout on isotope
        $blogContainer.isotope('reLayout');


        $("#blog .filters a").click( function () {

            var selector = $(this).attr("data-filter");
                
            // trigger isotope filter
            $blogContainer.isotope({ filter: selector });


            // set link color
            $(this).toggleClass("selected");
            $("#blog .filters a").not(this).removeClass("selected"); //remove the 'selected class from all other elements

            return false;
        });

        // hide the loader, when the rendering is complete
        common.hideLoader();

    }

    function activate () {
        // add custom bindings to handle isotope
        addCustomBindings();

        // load the blog
        blogstream.load(common.blogUrl, '#loader');
    }

    function addCustomBindings() {

        ko.bindingHandlers.isotope = {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

            },
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
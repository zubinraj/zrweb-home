$(function () {

    var $container = $("#gallery-container");

    $container.isotope({
        layoutMode: 'fitRows',
        itemSelector: '.gallery-item',
        animationEngine: 'best-available'
        //masonry: { columnWidth: $container.width() / 3 }
    });

    $("#filters a").click(function () {
        var selector = $(this).attr('rel');
        $container.isotope({ filter: selector });
        //$container.isotope({ sortBy: 'desc' });
    });

});


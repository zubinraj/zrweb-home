define(['durandal/system', 'durandal/app', 'knockout', 'services/logger'],
    function (system, app, ko, logger) {

        return {
            blogUrl: '/blog/feed/',
            photoUrl: '/photos/feed/',
            //blogUrl: '/rss_b.xml',
            //photoUrl: '/rss.xml',
            blogPartialStreamCount: 10,
            photosPartialStreamCount: 3,
            initializeLazyLoad: function () {
                // initialize lazy load
                $("img.lazy").lazyload({
                    effect: "fadeIn"
                });
            },
            initializeFancyBox: function () {
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
            }
        }

    });


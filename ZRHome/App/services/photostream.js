define(['durandal/system', 'durandal/app', 'knockout', 'services/logger'],
    function (system, app, ko, logger) {

        var _stream = ko.observableArray([]);

        var _partialStream = ko.observableArray([]);

        var photostream = {
            stream: _stream,
            partialStream: _partialStream,
            load: _load
        };

        return photostream;



        function _load(url, done, fail) {

            // check if already loaded
            if (_stream().length > 0) {
                done();
                return;
            }

            // clear
            _stream.removeAll();
            _partialStream.removeAll();

            var options = {
                url: url,
                type: 'GET',
                async: true,
                dataType: "xml",
            };

            // load
            $.ajax(options)
            .done(function (data) {

                var $xml = $(data);

                $xml.find("item").each(function () {

                    var _categories = '';
                    var $cat = $(this),
                        _cat = {
                            cat: $cat.find("category").each(function () { _categories += " " + $(this).text().toLowerCase(); })
                        }

                    var $thumb = $(this).find("thumb");
                    var $original = $(this).find("original");

                    var $this = $(this),
                        item = {
                            title: $this.find("title").text(),
                            link: $this.find("link").text(),
                            description: $this.find("description").text(),
                            categories: _categories,
                            pubDate: $this.find("pubDate").text(),
                            author: $this.find("author").text(),
                            thumbUrl: $thumb.text(),
                            thumbHeight: $thumb.attr("height"),
                            thumbWidth: $thumb.attr("width"),
                            originalUrl: $original.text(),
                            originalHeight: $original.attr("height"),
                            originalWidth: $original.attr("width")
                        }

                    _stream().push(item);

                });

                // copy few elements to partial stream
                for (var i = 0; (i < 3) && (i < _stream().length) ; i++) {
                    _partialStream().push(_stream()[i]);
                }

                done();

            })
            .fail(function () {
                fail();
            });
        }

    });
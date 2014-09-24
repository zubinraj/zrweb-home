define(['durandal/system', 'durandal/app', 'knockout', 'services/logger'],
    function (system, app, ko, logger) {

        var _stream = ko.observableArray([]);

        var _partialStream = ko.observableArray([]);

        var blogstream = {
            stream: _stream,
            partialStream: _partialStream,
            load: _load
        };

        return blogstream;

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
                dataType: 'xml'
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

                    var $this = $(this),
                        item = {
                            title: $this.find("title").text(),
                            link: $this.find("link").text(),
                            description: $this.find("description").text(),
                            //pubDate: $this.find("pubDate").text(),
                            pubDay: $this.find("pubDate").text().substring(5, 7),
                            pubMonth: $this.find("pubDate").text().substring(8,11),
                            //pubYear: $this.find("pubDate").text().substring(12,17),
                            author: $this.find("author").text(),
                            categories: _categories
                        }

                    _stream().push(item);

                });

                // copy few elements to partial stream
                for (var i = 0; (i < 15) && (i < _stream().length) ; i++) {
                    _partialStream().push(_stream()[i]);
                }

                done();

            })
            .fail(function () {
                fail();
            });

        }
            
        function _fail() {
        }

    });

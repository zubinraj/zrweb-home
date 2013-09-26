define(['services/logger'], function (logger) {
    var ctor = {
        title: 'License',
        description: 'Photos, source code and articles published on this website, that are not explicitly mentioned otherwise, are licensed under <a target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US">Creative Commons Attribution-NonCommercial 3.0 Unported</a> license.',
        terms: [
            { term: 'Attribution' },
            { term: 'Non-Commercial' }
        ],
        creativeCommons: '<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="./Content/images/cc_attribution_nocommercial_88x31.png" /></a>',
        termsOverride: 'If any section of this website mentions it\'s own licensing terms, that will override the terms mentioned here.',

        commercial: {
            heading: 'Commercial',
            description: 'If you want a higher quality photo published on this website for commercial use, please <a href="#contact">contact me</a>.'
        },

        thirdParty: {
            heading: 'Third Party Licenses',
            libraries: [
            { library: 'Durandal JS', license: 'MIT', url: 'https://raw.github.com/BlueSpire/Durandal/master/License.txt' },
            { library: 'Knockout JS', license: 'MIT', url: 'https://github.com/knockout/knockout#license' },
            { library: 'Bootstrap', license: 'Apache', url: 'https://github.com/twbs/bootstrap/blob/master/LICENSE' },
            { library: 'Isotope', license: 'MIT / Commercial', url: 'http://isotope.metafizzy.co/docs/license.html' },
            { library: 'Require JS', license: 'MIT / "New" BSD', url: 'https://github.com/jrburke/requirejs/blob/master/LICENSE' },
            { library: 'Lazy Load Plugin for JQuery', license: 'MIT', url: 'https://github.com/tuupola/jquery_lazyload#license' },
            { library: 'fancyBox', license: 'MIT', url: 'http://www.fancyapps.com/fancybox/#license' }
            ],
        },
        activate: activate
    }

    return ctor;

    function activate() {

    }
});
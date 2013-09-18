define(['services/logger'], function (logger) {
    var ctor = {
        title: 'License',
        description: 'The contents of this website is licensed under Creative Commons as below:',
        creativeCommons: '<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="http://i.creativecommons.org/l/by-nc/3.0/88x31.png" /></a>',
        terms: [
            { term: 'Attribution' },
            { term: 'Non-Commercial' }
        ],
        thirdPartyHeading: 'Third Party Licenses',
        thirdPartyItems: [
            { library: 'Durandal JS', license: 'MIT', url: 'https://raw.github.com/BlueSpire/Durandal/master/License.txt' },
            { library: 'Knockout JS', license: 'MIT', url: 'https://github.com/knockout/knockout#license' },
            { library: 'Bootstrap', license: 'Apache', url: 'https://github.com/twbs/bootstrap/blob/master/LICENSE' },
            { library: 'Isotope', license: 'MIT / Commercial', url: 'http://isotope.metafizzy.co/docs/license.html' },
            { library: 'Require JS', license: 'MIT / "New" BSD', url: 'https://github.com/jrburke/requirejs/blob/master/LICENSE' }
        ],
        activate: activate
    }

    return ctor;

    function activate() {

    }
});
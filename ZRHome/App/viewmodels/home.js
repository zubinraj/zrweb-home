define(['services/logger'], function (logger) {
    var vm = {
        activate: activate,
        title: 'About'
    };

    return vm;

    //#region Internal Methods
    function activate() {
        //logger.log('Home View Activated', null, 'home', true);
        return true;
    }
    //#endregion
});
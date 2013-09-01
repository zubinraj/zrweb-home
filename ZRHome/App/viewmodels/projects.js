define(['services/logger'], function (logger) {
    var vm = {
        activate: activate,
        title: 'My Projects'
    };

    return vm;

    //#region Internal Methods
    function activate() {
        //logger.log('Project View Activated', null, 'projects', true);
        return true;
    }
    //#endregion
});
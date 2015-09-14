define(['durandal/system'],
    function (system) {
        var logger = {
            log: log,
            logError: logError
        };

        return logger;

        function log(message, data, showToast) {
            _log(message, data, showToast, 'info');
        }

        function logError(message, data, showToast) {
            _log(message, data, showToast, 'error');
        }

        function _log(message, data, showToast, toastType) {
            if (data) {
                system.log('', message, data);
            } else {
                system.log('', message);
            }

            if (showToast) {
                if (toastType === 'error') {
                    //toastr.error(message);
                } else {
                    //toastr.info(message);
                }

            }

        }
    });
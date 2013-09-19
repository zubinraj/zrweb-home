(function () {
/**
 * almond 0.2.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name) && !defining.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    function onResourceLoad(name, defined, deps){
        if(requirejs.onResourceLoad && name){
            requirejs.onResourceLoad({defined:defined}, {id:name}, deps);
        }
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (defined.hasOwnProperty(depName) ||
                           waiting.hasOwnProperty(depName) ||
                           defining.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }

        onResourceLoad(name, defined, args);
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("../Scripts/almond-custom", function(){});

define('durandal/system',["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";i["is"+e]=function(e){return s.call(e)==t}}var i,r=!1,o=Object.keys,a=Object.prototype.hasOwnProperty,s=Object.prototype.toString,c=!1,l=Array.isArray,u=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(d){c=!0}e.on&&e.on("moduleLoaded",function(e,t){i.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){i.setModuleId(e.defined[t.id],t.id)});var f=function(){},v=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==u.call(arguments).length&&"string"==typeof u.call(arguments)[0]?console.log(u.call(arguments).toString()):console.log.apply(console,u.call(arguments));else Function.prototype.bind&&!c||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,u.call(arguments))}catch(t){}},g=function(e){if(e instanceof Error)throw e;throw new Error(e)};i={version:"2.0.0",noop:f,getModuleId:function(e){return e?"function"==typeof e?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return i.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(r=e,r?(this.log=v,this.error=g,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=f,this.error=f)),r},log:f,error:f,assert:function(e,t){e||i.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=0|16*Math.random(),n="x"==e?t:8|3&t;return n.toString(16)})},acquire:function(){var t,n=arguments[0],r=!1;return i.isArray(n)?(t=n,r=!0):t=u.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||r?n.resolve(u.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=u.call(arguments,1),n=0;n<t.length;n++){var i=t[n];if(i)for(var r in i)e[r]=i[r]}return e},wait:function(e){return i.defer(function(t){setTimeout(t.resolve,e)}).promise()}},i.keys=o||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)a.call(e,n)&&(t[t.length]=n);return t},i.isElement=function(e){return!(!e||1!==e.nodeType)},i.isArray=l||function(e){return"[object Array]"==s.call(e)},i.isObject=function(e){return e===Object(e)},i.isBoolean=function(e){return"boolean"==typeof e},i.isPromise=function(e){return e&&i.isFunction(e.then)};for(var p=["Arguments","Function","String","Number","Date","RegExp"],h=0;h<p.length;h++)n(p[h]);return i});
define('durandal/viewEngine',["durandal/system","jquery"],function(e,t){var n;return n=t.parseHTML?function(e){return t.parseHTML(e)}:function(e){return t(e).get()},{viewExtension:".html",viewPlugin:"text",isViewUrl:function(e){return-1!==e.indexOf(this.viewExtension,e.length-this.viewExtension.length)},convertViewUrlToViewId:function(e){return e.substring(0,e.length-this.viewExtension.length)},convertViewIdToRequirePath:function(e){return this.viewPlugin+"!"+e+this.viewExtension},parseMarkup:n,processMarkup:function(e){var t=this.parseMarkup(e);return this.ensureSingleElement(t)},ensureSingleElement:function(e){if(1==e.length)return e[0];for(var n=[],i=0;i<e.length;i++){var r=e[i];if(8!=r.nodeType){if(3==r.nodeType){var o=/\S/.test(r.nodeValue);if(!o)continue}n.push(r)}}return n.length>1?t(n).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0):n[0]},createView:function(t){var n=this,i=this.convertViewIdToRequirePath(t);return e.defer(function(r){e.acquire(i).then(function(e){var i=n.processMarkup(e);i.setAttribute("data-view",t),r.resolve(i)}).fail(function(e){n.createFallbackView(t,i,e).then(function(e){e.setAttribute("data-view",t),r.resolve(e)})})}).promise()},createFallbackView:function(t,n){var i=this,r='View Not Found. Searched for "'+t+'" via path "'+n+'".';return e.defer(function(e){e.resolve(i.processMarkup('<div class="durandal-view-404">'+r+"</div>"))}).promise()}}});
define('durandal/viewLocator',["durandal/system","durandal/viewEngine"],function(e,t){function n(e,t){for(var n=0;n<e.length;n++){var i=e[n],r=i.getAttribute("data-view");if(r==t)return i}}function i(e){return(e+"").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,"\\$1")}return{useConvention:function(e,t,n){e=e||"viewmodels",t=t||"views",n=n||t;var r=new RegExp(i(e),"gi");this.convertModuleIdToViewId=function(e){return e.replace(r,t)},this.translateViewIdToArea=function(e,t){return t&&"partial"!=t?n+"/"+t+"/"+e:n+"/"+e}},locateViewForObject:function(t,n,i){var r;if(t.getView&&(r=t.getView()))return this.locateView(r,n,i);if(t.viewUrl)return this.locateView(t.viewUrl,n,i);var o=e.getModuleId(t);return o?this.locateView(this.convertModuleIdToViewId(o),n,i):this.locateView(this.determineFallbackViewId(t),n,i)},convertModuleIdToViewId:function(e){return e},determineFallbackViewId:function(e){var t=/function (.{1,})\(/,n=t.exec(e.constructor.toString()),i=n&&n.length>1?n[1]:"";return"views/"+i},translateViewIdToArea:function(e){return e},locateView:function(i,r,o){if("string"==typeof i){var a;if(a=t.isViewUrl(i)?t.convertViewUrlToViewId(i):i,r&&(a=this.translateViewIdToArea(a,r)),o){var s=n(o,a);if(s)return e.defer(function(e){e.resolve(s)}).promise()}return t.createView(a)}return e.defer(function(e){e.resolve(i)}).promise()}}});
define('durandal/binder',["durandal/system","knockout"],function(t,e){function n(e){return void 0===e?{applyBindings:!0}:t.isBoolean(e)?{applyBindings:e}:(void 0===e.applyBindings&&(e.applyBindings=!0),e)}function i(i,l,u,d){if(!l||!u)return r.throwOnErrors?t.error(a):t.log(a,l,d),void 0;if(!l.getAttribute)return r.throwOnErrors?t.error(o):t.log(o,l,d),void 0;var f=l.getAttribute("data-view");try{var v;return i&&i.binding&&(v=i.binding(l)),v=n(v),r.binding(d,l,v),v.applyBindings?(t.log("Binding",f,d),e.applyBindings(u,l)):i&&e.utils.domData.set(l,c,{$data:i}),r.bindingComplete(d,l,v),i&&i.bindingComplete&&i.bindingComplete(l),e.utils.domData.set(l,s,v),v}catch(g){g.message=g.message+";\nView: "+f+";\nModuleId: "+t.getModuleId(d),r.throwOnErrors?t.error(g):t.log(g.message)}}var r,a="Insufficient Information to Bind",o="Unexpected View Type",s="durandal-binding-instruction",c="__ko_bindingContext__";return r={binding:t.noop,bindingComplete:t.noop,throwOnErrors:!1,getBindingInstruction:function(t){return e.utils.domData.get(t,s)},bindContext:function(t,e,n){return n&&t&&(t=t.createChildContext(n)),i(n,e,t,n||(t?t.$data:null))},bind:function(t,e){return i(t,e,t,t)}}});
define('durandal/activator',["durandal/system","knockout"],function(e,t){function n(e){return void 0==e&&(e={}),e.closeOnDeactivate||(e.closeOnDeactivate=l.defaults.closeOnDeactivate),e.beforeActivate||(e.beforeActivate=l.defaults.beforeActivate),e.afterDeactivate||(e.afterDeactivate=l.defaults.afterDeactivate),e.affirmations||(e.affirmations=l.defaults.affirmations),e.interpretResponse||(e.interpretResponse=l.defaults.interpretResponse),e.areSameItem||(e.areSameItem=l.defaults.areSameItem),e}function i(t,n,i){return e.isArray(i)?t[n].apply(t,i):t[n](i)}function r(t,n,i,r,a){if(t&&t.deactivate){e.log("Deactivating",t);var o;try{o=t.deactivate(n)}catch(s){return e.error(s),r.resolve(!1),void 0}o&&o.then?o.then(function(){i.afterDeactivate(t,n,a),r.resolve(!0)},function(t){e.log(t),r.resolve(!1)}):(i.afterDeactivate(t,n,a),r.resolve(!0))}else t&&i.afterDeactivate(t,n,a),r.resolve(!0)}function a(t,n,r,a){if(t)if(t.activate){e.log("Activating",t);var o;try{o=i(t,"activate",a)}catch(s){return e.error(s),r(!1),void 0}o&&o.then?o.then(function(){n(t),r(!0)},function(t){e.log(t),r(!1)}):(n(t),r(!0))}else n(t),r(!0);else r(!0)}function o(t,n,i){return i.lifecycleData=null,e.defer(function(r){if(t&&t.canDeactivate){var a;try{a=t.canDeactivate(n)}catch(o){return e.error(o),r.resolve(!1),void 0}a.then?a.then(function(e){i.lifecycleData=e,r.resolve(i.interpretResponse(e))},function(t){e.error(t),r.resolve(!1)}):(i.lifecycleData=a,r.resolve(i.interpretResponse(a)))}else r.resolve(!0)}).promise()}function s(t,n,r,a){return r.lifecycleData=null,e.defer(function(o){if(t==n())return o.resolve(!0),void 0;if(t&&t.canActivate){var s;try{s=i(t,"canActivate",a)}catch(c){return e.error(c),o.resolve(!1),void 0}s.then?s.then(function(e){r.lifecycleData=e,o.resolve(r.interpretResponse(e))},function(t){e.error(t),o.resolve(!1)}):(r.lifecycleData=s,o.resolve(r.interpretResponse(s)))}else o.resolve(!0)}).promise()}function c(i,c){var l,u=t.observable(null);c=n(c);var d=t.computed({read:function(){return u()},write:function(e){d.viaSetter=!0,d.activateItem(e)}});return d.__activator__=!0,d.settings=c,c.activator=d,d.isActivating=t.observable(!1),d.canDeactivateItem=function(e,t){return o(e,t,c)},d.deactivateItem=function(t,n){return e.defer(function(e){d.canDeactivateItem(t,n).then(function(i){i?r(t,n,c,e,u):(d.notifySubscribers(),e.resolve(!1))})}).promise()},d.canActivateItem=function(e,t){return s(e,u,c,t)},d.activateItem=function(t,n){var i=d.viaSetter;return d.viaSetter=!1,e.defer(function(o){if(d.isActivating())return o.resolve(!1),void 0;d.isActivating(!0);var s=u();return c.areSameItem(s,t,l,n)?(d.isActivating(!1),o.resolve(!0),void 0):(d.canDeactivateItem(s,c.closeOnDeactivate).then(function(f){f?d.canActivateItem(t,n).then(function(f){f?e.defer(function(e){r(s,c.closeOnDeactivate,c,e)}).promise().then(function(){t=c.beforeActivate(t,n),a(t,u,function(e){l=n,d.isActivating(!1),o.resolve(e)},n)}):(i&&d.notifySubscribers(),d.isActivating(!1),o.resolve(!1))}):(i&&d.notifySubscribers(),d.isActivating(!1),o.resolve(!1))}),void 0)}).promise()},d.canActivate=function(){var e;return i?(e=i,i=!1):e=d(),d.canActivateItem(e)},d.activate=function(){var e;return i?(e=i,i=!1):e=d(),d.activateItem(e)},d.canDeactivate=function(e){return d.canDeactivateItem(d(),e)},d.deactivate=function(e){return d.deactivateItem(d(),e)},d.includeIn=function(e){e.canActivate=function(){return d.canActivate()},e.activate=function(){return d.activate()},e.canDeactivate=function(e){return d.canDeactivate(e)},e.deactivate=function(e){return d.deactivate(e)}},c.includeIn?d.includeIn(c.includeIn):i&&d.activate(),d.forItems=function(t){c.closeOnDeactivate=!1,c.determineNextItemToActivate=function(e,t){var n=t-1;return-1==n&&e.length>1?e[1]:n>-1&&n<e.length-1?e[n]:null},c.beforeActivate=function(e){var n=d();if(e){var i=t.indexOf(e);-1==i?t.push(e):e=t()[i]}else e=c.determineNextItemToActivate(t,n?t.indexOf(n):0);return e},c.afterDeactivate=function(e,n){n&&t.remove(e)};var n=d.canDeactivate;d.canDeactivate=function(i){return i?e.defer(function(e){function n(){for(var t=0;t<a.length;t++)if(!a[t])return e.resolve(!1),void 0;e.resolve(!0)}for(var r=t(),a=[],o=0;o<r.length;o++)d.canDeactivateItem(r[o],i).then(function(e){a.push(e),a.length==r.length&&n()})}).promise():n()};var i=d.deactivate;return d.deactivate=function(n){return n?e.defer(function(e){function i(i){d.deactivateItem(i,n).then(function(){a++,t.remove(i),a==o&&e.resolve()})}for(var r=t(),a=0,o=r.length,s=0;o>s;s++)i(r[s])}).promise():i()},d},d}var l,u={closeOnDeactivate:!0,affirmations:["yes","ok","true"],interpretResponse:function(n){return e.isObject(n)&&(n=n.can||!1),e.isString(n)?-1!==t.utils.arrayIndexOf(this.affirmations,n.toLowerCase()):n},areSameItem:function(e,t){return e==t},beforeActivate:function(e){return e},afterDeactivate:function(e,t,n){t&&n&&n(null)}};return l={defaults:u,create:c,isActivator:function(e){return e&&e.__activator__}}});
define('durandal/composition',["durandal/system","durandal/viewLocator","durandal/binder","durandal/viewEngine","durandal/activator","jquery","knockout"],function(e,t,n,i,r,a,o){function s(e){for(var t=[],n={childElements:t,activeView:null},i=o.virtualElements.firstChild(e);i;)1==i.nodeType&&(t.push(i),i.getAttribute(m)&&(n.activeView=i)),i=o.virtualElements.nextSibling(i);return n.activeView||(n.activeView=t[0]),n}function c(){y--,0===y&&setTimeout(function(){for(var e=b.length;e--;)b[e]();b=[]},1)}function l(t,n,i){if(i)n();else if(t.activate&&t.model&&t.model.activate){var r;r=e.isArray(t.activationData)?t.model.activate.apply(t.model,t.activationData):t.model.activate(t.activationData),r&&r.then?r.then(n):r||void 0===r?n():c()}else n()}function u(){var t=this;t.activeView&&t.activeView.removeAttribute(m),t.child&&(t.model&&t.model.attached&&(t.composingNewView||t.alwaysTriggerAttach)&&t.model.attached(t.child,t.parent,t),t.attached&&t.attached(t.child,t.parent,t),t.child.setAttribute(m,!0),t.composingNewView&&t.model&&(t.model.compositionComplete&&p.current.complete(function(){t.model.compositionComplete(t.child,t.parent,t)}),t.model.detached&&o.utils.domNodeDisposal.addDisposeCallback(t.child,function(){t.model.detached(t.child,t.parent,t)})),t.compositionComplete&&p.current.complete(function(){t.compositionComplete(t.child,t.parent,t)})),c(),t.triggerAttach=e.noop}function d(t){if(e.isString(t.transition)){if(t.activeView){if(t.activeView==t.child)return!1;if(!t.child)return!0;if(t.skipTransitionOnSameViewId){var n=t.activeView.getAttribute("data-view"),i=t.child.getAttribute("data-view");return n!=i}}return!0}return!1}function f(e){for(var t=0,n=e.length,i=[];n>t;t++){var r=e[t].cloneNode(!0);i.push(r)}return i}function v(e){var t=f(e.parts),n=p.getParts(t),i=p.getParts(e.child);for(var r in n)a(i[r]).replaceWith(n[r])}function g(t){var n,i,r=o.virtualElements.childNodes(t);if(!e.isArray(r)){var a=[];for(n=0,i=r.length;i>n;n++)a[n]=r[n];r=a}for(n=1,i=r.length;i>n;n++)o.removeNode(r[n])}var p,h={},m="data-active-view",b=[],y=0,w="durandal-composition-data",x="data-part",I="["+x+"]",k=["model","view","transition","area","strategy","activationData"],S={complete:function(e){b.push(e)}};return p={convertTransitionToModuleId:function(e){return"transitions/"+e},defaultTransitionName:null,current:S,addBindingHandler:function(e,t,n){var i,r,a="composition-handler-"+e;t=t||o.bindingHandlers[e],n=n||function(){return void 0},r=o.bindingHandlers[e]={init:function(e,i,r,s,c){var l={trigger:o.observable(null)};return p.current.complete(function(){t.init&&t.init(e,i,r,s,c),t.update&&(o.utils.domData.set(e,a,t),l.trigger("trigger"))}),o.utils.domData.set(e,a,l),n(e,i,r,s,c)},update:function(e,t,n,i,r){var s=o.utils.domData.get(e,a);return s.update?s.update(e,t,n,i,r):(s.trigger(),void 0)}};for(i in t)"init"!==i&&"update"!==i&&(r[i]=t[i])},getParts:function(t){var n={};e.isArray(t)||(t=[t]);for(var i=0;i<t.length;i++){var r=t[i];if(r.getAttribute){var o=r.getAttribute(x);o&&(n[o]=r);for(var s=a(I,r).not(a("[data-bind] "+I,r)),c=0;c<s.length;c++){var l=s.get(c);n[l.getAttribute(x)]=l}}}return n},cloneNodes:f,finalize:function(t){if(t.transition=t.transition||this.defaultTransitionName,t.child||t.activeView)if(d(t)){var i=this.convertTransitionToModuleId(t.transition);e.acquire(i).then(function(e){t.transition=e,e(t).then(function(){if(t.cacheViews){if(t.activeView){var e=n.getBindingInstruction(t.activeView);void 0==e.cacheViews||e.cacheViews||o.removeNode(t.activeView)}}else t.child?g(t.parent):o.virtualElements.emptyNode(t.parent);t.triggerAttach()})}).fail(function(t){e.error("Failed to load transition ("+i+"). Details: "+t.message)})}else{if(t.child!=t.activeView){if(t.cacheViews&&t.activeView){var r=n.getBindingInstruction(t.activeView);void 0==r.cacheViews||r.cacheViews?a(t.activeView).hide():o.removeNode(t.activeView)}t.child?(t.cacheViews||g(t.parent),a(t.child).show()):t.cacheViews||o.virtualElements.emptyNode(t.parent)}t.triggerAttach()}else t.cacheViews||o.virtualElements.emptyNode(t.parent),t.triggerAttach()},bindAndShow:function(e,t,r){t.child=e,t.composingNewView=t.cacheViews?-1==o.utils.arrayIndexOf(t.viewElements,e):!0,l(t,function(){if(t.binding&&t.binding(t.child,t.parent,t),t.preserveContext&&t.bindingContext)t.composingNewView&&(t.parts&&v(t),a(e).hide(),o.virtualElements.prepend(t.parent,e),n.bindContext(t.bindingContext,e,t.model));else if(e){var r=t.model||h,s=o.dataFor(e);if(s!=r){if(!t.composingNewView)return a(e).remove(),i.createView(e.getAttribute("data-view")).then(function(e){p.bindAndShow(e,t,!0)}),void 0;t.parts&&v(t),a(e).hide(),o.virtualElements.prepend(t.parent,e),n.bind(r,e)}}p.finalize(t)},r)},defaultStrategy:function(e){return t.locateViewForObject(e.model,e.area,e.viewElements)},getSettings:function(t){var n,a=t(),s=o.utils.unwrapObservable(a)||{},c=r.isActivator(a);if(e.isString(s))return s=i.isViewUrl(s)?{view:s}:{model:s,activate:!0};if(n=e.getModuleId(s))return s={model:s,activate:!0};!c&&s.model&&(c=r.isActivator(s.model));for(var l in s)s[l]=-1!=o.utils.arrayIndexOf(k,l)?o.utils.unwrapObservable(s[l]):s[l];return c?s.activate=!1:void 0===s.activate&&(s.activate=!0),s},executeStrategy:function(e){e.strategy(e).then(function(t){p.bindAndShow(t,e)})},inject:function(n){return n.model?n.view?(t.locateView(n.view,n.area,n.viewElements).then(function(e){p.bindAndShow(e,n)}),void 0):(n.strategy||(n.strategy=this.defaultStrategy),e.isString(n.strategy)?e.acquire(n.strategy).then(function(e){n.strategy=e,p.executeStrategy(n)}).fail(function(t){e.error("Failed to load view strategy ("+n.strategy+"). Details: "+t.message)}):this.executeStrategy(n),void 0):(this.bindAndShow(null,n),void 0)},compose:function(n,i,r,a){y++,a||(i=p.getSettings(function(){return i},n));var o=s(n);i.activeView=o.activeView,i.parent=n,i.triggerAttach=u,i.bindingContext=r,i.cacheViews&&!i.viewElements&&(i.viewElements=o.childElements),i.model?e.isString(i.model)?e.acquire(i.model).then(function(t){i.model=e.resolveObject(t),p.inject(i)}).fail(function(t){e.error("Failed to load composed module ("+i.model+"). Details: "+t.message)}):p.inject(i):i.view?(i.area=i.area||"partial",i.preserveContext=!0,t.locateView(i.view,i.area,i.viewElements).then(function(e){p.bindAndShow(e,i)})):this.bindAndShow(null,i)}},o.bindingHandlers.compose={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,r,a){var s=p.getSettings(t,e);if(s.mode){var c=o.utils.domData.get(e,w);if(!c){var l=o.virtualElements.childNodes(e);c={},"inline"===s.mode?c.view=i.ensureSingleElement(l):"templated"===s.mode&&(c.parts=f(l)),o.virtualElements.emptyNode(e),o.utils.domData.set(e,w,c)}"inline"===s.mode?s.view=c.view.cloneNode(!0):"templated"===s.mode&&(s.parts=c.parts),s.preserveContext=!0}p.compose(e,s,a,!0)}},o.virtualElements.allowedBindings.compose=!0,p});
define('durandal/events',["durandal/system"],function(t){var e=/\s+/,n=function(){},i=function(t,e){this.owner=t,this.events=e};return i.prototype.then=function(t,e){return this.callback=t||this.callback,this.context=e||this.context,this.callback?(this.owner.on(this.events,this.callback,this.context),this):this},i.prototype.on=i.prototype.then,i.prototype.off=function(){return this.owner.off(this.events,this.callback,this.context),this},n.prototype.on=function(t,n,r){var a,o,s;if(n){for(a=this.callbacks||(this.callbacks={}),t=t.split(e);o=t.shift();)s=a[o]||(a[o]=[]),s.push(n,r);return this}return new i(this,t)},n.prototype.off=function(n,i,r){var a,o,s,c;if(!(o=this.callbacks))return this;if(!(n||i||r))return delete this.callbacks,this;for(n=n?n.split(e):t.keys(o);a=n.shift();)if((s=o[a])&&(i||r))for(c=s.length-2;c>=0;c-=2)i&&s[c]!==i||r&&s[c+1]!==r||s.splice(c,2);else delete o[a];return this},n.prototype.trigger=function(t){var n,i,r,a,o,s,c,l;if(!(i=this.callbacks))return this;for(l=[],t=t.split(e),a=1,o=arguments.length;o>a;a++)l[a-1]=arguments[a];for(;n=t.shift();){if((c=i.all)&&(c=c.slice()),(r=i[n])&&(r=r.slice()),r)for(a=0,o=r.length;o>a;a+=2)r[a].apply(r[a+1]||this,l);if(c)for(s=[n].concat(l),a=0,o=c.length;o>a;a+=2)c[a].apply(c[a+1]||this,s)}return this},n.prototype.proxy=function(t){var e=this;return function(n){e.trigger(t,n)}},n.includeIn=function(t){t.on=n.prototype.on,t.off=n.prototype.off,t.trigger=n.prototype.trigger,t.proxy=n.prototype.proxy},n});
define('durandal/app',["durandal/system","durandal/viewEngine","durandal/composition","durandal/events","jquery"],function(e,t,n,i,r){function a(){return e.defer(function(t){return 0==s.length?(t.resolve(),void 0):(e.acquire(s).then(function(n){for(var i=0;i<n.length;i++){var r=n[i];if(r.install){var a=c[i];e.isObject(a)||(a={}),r.install(a),e.log("Plugin:Installed "+s[i])}else e.log("Plugin:Loaded "+s[i])}t.resolve()}).fail(function(t){e.error("Failed to load plugin(s). Details: "+t.message)}),void 0)}).promise()}var o,s=[],c=[];return o={title:"Application",configurePlugins:function(t,n){var i=e.keys(t);n=n||"plugins/",-1===n.indexOf("/",n.length-1)&&(n+="/");for(var r=0;r<i.length;r++){var a=i[r];s.push(n+a),c.push(t[a])}},start:function(){return e.log("Application:Starting"),this.title&&(document.title=this.title),e.defer(function(t){r(function(){a().then(function(){t.resolve(),e.log("Application:Started")})})}).promise()},setRoot:function(i,r,a){var o,s={activate:!0,transition:r};o=!a||e.isString(a)?document.getElementById(a||"applicationHost"):a,e.isString(i)?t.isViewUrl(i)?s.view=i:s.model=i:s.model=i,n.compose(o,s)}},i.includeIn(o),o});
define('services/logger',["durandal/system"],function(t){function e(t,e,n,r){i(t,e,n,r,"info")}function n(t,e,n,r){i(t,e,n,r,"error")}function i(e,n,i,r,a){i=i?"["+i+"] ":"",n?t.log(i,e,n):t.log(i,e),r&&("error"===a?toastr.error(e):toastr.info(e))}var r={log:e,logError:n};return r});
requirejs.config({urlArgs:"bust="+(new Date).getTime(),paths:{text:"../Scripts/text",durandal:"../Scripts/durandal",plugins:"../Scripts/durandal/plugins",transitions:"../Scripts/durandal/transitions"}}),define("jquery",[],function(){return jQuery}),define("knockout",ko),define('main',["durandal/system","durandal/app","durandal/viewLocator","services/logger"],function(t,e,n){t.debug(!0),e.title="test",e.configurePlugins({router:!0,dialog:!0,widget:!0}),e.start().then(function(){toastr.options.positionClass="toast-bottom-right",toastr.options.backgroundpositionClass="toast-bottom-right",n.useConvention(),e.setRoot("viewmodels/shell","entrance")})});
define('plugins/http',["jquery","knockout"],function(t,e){return{callbackParam:"callback",get:function(e,n){return t.ajax(e,{data:n})},jsonp:function(e,n,i){return-1==e.indexOf("=?")&&(i=i||this.callbackParam,e+=-1==e.indexOf("?")?"?":"&",e+=i+"=?"),t.ajax({url:e,dataType:"jsonp",data:n})},post:function(n,i){return t.ajax({url:n,data:e.toJSON(i),type:"POST",contentType:"application/json",dataType:"json"})}}});
define('viewmodels/blog',["plugins/http","knockout","services/logger"],function(t,e){function n(){var t=$("#blog-container");t.isotope("reLayout"),$("#blog .filters a").click(function(){var e=$(this).attr("data-filter");return t.isotope({filter:e}),$(this).toggleClass("selected"),$("#blog .filters a").not(this).removeClass("selected"),!1})}function i(){if(!(this.items().length>0)){r();var e=this;return t.get("rss_b.xml").then(function(t){var n=$(t);n.find("item").each(function(){var t="",n=$(this);({cat:n.find("category").each(function(){t+=" "+$(this).text().toLowerCase()})});var i=$(this),r={title:i.find("title").text(),link:i.find("link").text(),description:i.find("description").text(),pubDate:i.find("pubDate").text(),author:i.find("author").text(),categories:t};e.items.push(r)})})}}function r(){e.bindingHandlers.isotope={init:function(){},update:function(t,n){var i=$(t),r=e.utils.unwrapObservable(n());i.hasClass("isotope")?i.isotope("reLayout"):i.isotope({itemSelector:r.itemSelector})}}}var a={title:"Blog",items:e.observableArray([]),activate:i,compositionComplete:n};return a});
define('viewmodels/contact',["services/logger"],function(){function t(){}var e={title:"Contact",contactHeading:"Any questions?",contactItems:[{channel:"email",text:"support @ zubinraj dot com",url:""},{channel:"twitter",text:"@zubinraj",url:"https://twitter.com/zubinraj"},{channel:"github",text:"https://github.com/zubinraj/",url:"https://github.com/zubinraj/"}],licenseHeading:"License",licenseText:'See <a href="#license/">here</a> for more information.',disclaimerText:"Disclaimer: The opinions expressed herein are my own personal opinions and do not represent my employer’s view in any way.",activate:t};return e});
define('viewmodels/error',["plugins/http","knockout","services/logger"],function(t,e){function n(t){"404"==t?i():r()}function i(){console.log("404 error"),o.title("Not Found"),o.msg("The resource you are requesting has either moved or is unavailable."+a)}function r(){console.log("default error"),o.title("Error"),o.msg("Oops! Something bad just happened."+a)}var a=' Please try again or go to the <a href="#">home page</a>.',o={title:e.observable(),msg:e.observable(),activate:n};return o});
define('viewmodels/flickr',["plugins/http","durandal/app","knockout"],function(t,e,n){return{title:"Photography",images:n.observableArray([]),activate:function(){if(!(this.images().length>0)){var e=this;return t.jsonp("http://api.flickr.com/services/feeds/photos_public.gne",{id:"9347697@N03",tags:"bird",tagmode:"all",format:"json"},"jsoncallback").then(function(t){e.images(t.items)})}},select:function(t){t.viewUrl="views/detail",e.showDialog(t)}}});
define('viewmodels/license',["services/logger"],function(){function t(){}var e={title:"License",description:"The contents of this website is licensed under Creative Commons as below:",creativeCommons:'<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="http://i.creativecommons.org/l/by-nc/3.0/88x31.png" /></a>',terms:[{term:"Attribution"},{term:"Non-Commercial"}],thirdPartyHeading:"Third Party Licenses",thirdPartyItems:[{library:"Durandal JS",license:"MIT",url:"https://raw.github.com/BlueSpire/Durandal/master/License.txt"},{library:"Knockout JS",license:"MIT",url:"https://github.com/knockout/knockout#license"},{library:"Bootstrap",license:"Apache",url:"https://github.com/twbs/bootstrap/blob/master/LICENSE"},{library:"Isotope",license:"MIT / Commercial",url:"http://isotope.metafizzy.co/docs/license.html"},{library:"Require JS",license:'MIT / "New" BSD',url:"https://github.com/jrburke/requirejs/blob/master/LICENSE"}],activate:t};return e});
define('viewmodels/photos',["plugins/http","knockout","services/logger"],function(t,e){function n(){var t=$("#gallery-container");t.isotope("reLayout"),$("img.lazy").lazyload({effect:"fadeIn"}),$("#gallery .filters a").click(function(){var e=$(this).attr("data-filter");return t.isotope({filter:e}),$(this).toggleClass("selected"),$("#gallery .filters a").not(this).removeClass("selected"),!1})}function i(){if(!(this.images().length>0)){r();var e=this;return t.get("rss.xml","xml").then(function(t){var n=$(t);n.find("item").each(function(){var t="",n=$(this);({cat:n.find("category").each(function(){t+=" "+$(this).text().toLowerCase()})});var i=$(this),r={title:i.find("title").text(),link:i.find("link").text(),description:i.find("description").text(),categories:t,pubDate:i.find("pubDate").text(),author:i.find("author").text(),thumbUrl:"300x200.gif",thumbHeight:i.find("height").text(),thumbWidth:i.find("width").text()};e.images.push(r)})})}}function r(){e.bindingHandlers.isotope={update:function(t,n){var i=$(t),r=e.utils.unwrapObservable(n());i.hasClass("isotope")?i.isotope("reLayout"):i.isotope({itemSelector:r.itemSelector})}}}var a={title:"Photography",images:e.observableArray([]),activate:i,compositionComplete:n};return a});
define('plugins/history',["durandal/system","jquery"],function(t,e){function n(t,e,n){if(n){var i=t.href.replace(/(javascript:|#).*$/,"");t.replace(i+"#"+e)}else t.hash="#"+e}var i=/^[#\/]|\s+$/g,r=/^\/+|\/+$/g,a=/msie [\w.]+/,o=/\/$/,s={interval:50,active:!1};return"undefined"!=typeof window&&(s.location=window.location,s.history=window.history),s.getHash=function(t){var e=(t||s).location.href.match(/#(.*)$/);return e?e[1]:""},s.getFragment=function(t,e){if(null==t)if(s._hasPushState||!s._wantsHashChange||e){t=s.location.pathname;var n=s.root.replace(o,"");t.indexOf(n)||(t=t.substr(n.length))}else t=s.getHash();return t.replace(i,"")},s.activate=function(n){s.active&&t.error("History has already been activated."),s.active=!0,s.options=t.extend({},{root:"/"},s.options,n),s.root=s.options.root,s._wantsHashChange=s.options.hashChange!==!1,s._wantsPushState=!!s.options.pushState,s._hasPushState=!!(s.options.pushState&&s.history&&s.history.pushState);var o=s.getFragment(),c=document.documentMode,l=a.exec(navigator.userAgent.toLowerCase())&&(!c||7>=c);s.root=("/"+s.root+"/").replace(r,"/"),l&&s._wantsHashChange&&(s.iframe=e('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,s.navigate(o,!1)),s._hasPushState?e(window).on("popstate",s.checkUrl):s._wantsHashChange&&"onhashchange"in window&&!l?e(window).on("hashchange",s.checkUrl):s._wantsHashChange&&(s._checkUrlInterval=setInterval(s.checkUrl,s.interval)),s.fragment=o;var u=s.location,d=u.pathname.replace(/[^\/]$/,"$&/")===s.root;if(s._wantsHashChange&&s._wantsPushState){if(!s._hasPushState&&!d)return s.fragment=s.getFragment(null,!0),s.location.replace(s.root+s.location.search+"#"+s.fragment),!0;s._hasPushState&&d&&u.hash&&(this.fragment=s.getHash().replace(i,""),this.history.replaceState({},document.title,s.root+s.fragment+u.search))}return s.options.silent?void 0:s.loadUrl()},s.deactivate=function(){e(window).off("popstate",s.checkUrl).off("hashchange",s.checkUrl),clearInterval(s._checkUrlInterval),s.active=!1},s.checkUrl=function(){var t=s.getFragment();return t===s.fragment&&s.iframe&&(t=s.getFragment(s.getHash(s.iframe))),t===s.fragment?!1:(s.iframe&&s.navigate(t,!1),s.loadUrl(),void 0)},s.loadUrl=function(t){var e=s.fragment=s.getFragment(t);return s.options.routeHandler?s.options.routeHandler(e):!1},s.navigate=function(e,i){if(!s.active)return!1;if(void 0===i?i={trigger:!0}:t.isBoolean(i)&&(i={trigger:i}),e=s.getFragment(e||""),s.fragment!==e){s.fragment=e;var r=s.root+e;if(s._hasPushState)s.history[i.replace?"replaceState":"pushState"]({},document.title,r);else{if(!s._wantsHashChange)return s.location.assign(r);n(s.location,e,i.replace),s.iframe&&e!==s.getFragment(s.getHash(s.iframe))&&(i.replace||s.iframe.document.open().close(),n(s.iframe.location,e,i.replace))}return i.trigger?s.loadUrl(e):void 0}},s.navigateBack=function(){s.history.back()},s});
define('plugins/router',["durandal/system","durandal/app","durandal/activator","durandal/events","durandal/composition","plugins/history","knockout","jquery"],function(e,t,n,i,r,a,o,s){function c(e){return e=e.replace(b,"\\$&").replace(p,"(?:$1)?").replace(h,function(e,t){return t?e:"([^/]+)"}).replace(m,"(.*?)"),new RegExp("^"+e+"$")}function l(e){var t=e.indexOf(":"),n=t>0?t-1:e.length;return e.substring(0,n)}function u(e){return e.router&&e.router.loadUrl}function d(e,t){return-1!==e.indexOf(t,e.length-t.length)}function f(e,t){if(!e||!t)return!1;if(e.length!=t.length)return!1;for(var n=0,i=e.length;i>n;n++)if(e[n]!=t[n])return!1;return!0}var v,g,p=/\((.*?)\)/g,h=/(\(\?)?:\w+/g,m=/\*\w+/g,b=/[\-{}\[\]+?.,\\\^$|#\s]/g,y=/\/$/,w=function(){function r(t,n){e.log("Navigation Complete",t,n);var i=e.getModuleId(D);i&&P.trigger("router:navigation:from:"+i),D=t,j=n;var r=e.getModuleId(D);r&&P.trigger("router:navigation:to:"+r),u(t)||P.updateDocumentTitle(t,n),g.explicitNavigation=!1,g.navigatingBack=!1,P.trigger("router:navigation:complete",t,n,P)}function s(t,n){e.log("Navigation Cancelled"),P.activeInstruction(j),j&&P.navigate(j.fragment,!1),T(!1),g.explicitNavigation=!1,g.navigatingBack=!1,P.trigger("router:navigation:cancelled",t,n,P)}function p(t){e.log("Navigation Redirecting"),T(!1),g.explicitNavigation=!1,g.navigatingBack=!1,P.navigate(t,{trigger:!0,replace:!0})}function h(e,t,n){g.navigatingBack=!g.explicitNavigation&&D!=n.fragment,P.trigger("router:route:activating",t,n,P),e.activateItem(t,n.params).then(function(i){if(i){var a=D;r(t,n),u(t)&&k({router:t.router,fragment:n.fragment,queryString:n.queryString}),a==t&&P.attached()}else e.settings.lifecycleData&&e.settings.lifecycleData.redirect?p(e.settings.lifecycleData.redirect):s(t,n);v&&(v.resolve(),v=null)})}function m(t,n,i){var r=P.guardRoute(n,i);r?r.then?r.then(function(r){r?e.isString(r)?p(r):h(t,n,i):s(n,i)}):e.isString(r)?p(r):h(t,n,i):s(n,i)}function b(e,t,n){P.guardRoute?m(e,t,n):h(e,t,n)}function x(e){return j&&j.config.moduleId==e.config.moduleId&&D&&(D.canReuseForRoute&&D.canReuseForRoute.apply(D,e.params)||D.router&&D.router.loadUrl)}function I(){if(!T()){var t=V.shift();if(V=[],t){if(t.router){var i=t.fragment;return t.queryString&&(i+="?"+t.queryString),t.router.loadUrl(i),void 0}T(!0),P.activeInstruction(t),x(t)?b(n.create(),D,t):e.acquire(t.config.moduleId).then(function(n){var i=e.resolveObject(n);b(O,i,t)}).fail(function(n){e.error("Failed to load routed module ("+t.config.moduleId+"). Details: "+n.message)})}}}function k(e){V.unshift(e),I()}function _(e,t,n){for(var i=e.exec(t).slice(1),r=0;r<i.length;r++){var a=i[r];i[r]=a?decodeURIComponent(a):null}var o=P.parseQueryString(n);return o&&i.push(o),{params:i,queryParams:o}}function S(t){P.trigger("router:route:before-config",t,P),e.isRegExp(t)?t.routePattern=t.route:(t.title=t.title||P.convertRouteToTitle(t.route),t.moduleId=t.moduleId||P.convertRouteToModuleId(t.route),t.hash=t.hash||P.convertRouteToHash(t.route),t.routePattern=c(t.route)),P.trigger("router:route:after-config",t,P),P.routes.push(t),P.route(t.routePattern,function(e,n){var i=_(t.routePattern,e,n);k({fragment:e,queryString:n,config:t,params:i.params,queryParams:i.queryParams})})}function A(t){if(e.isArray(t.route))for(var n=0,i=t.route.length;i>n;n++){var r=e.extend({},t);r.route=t.route[n],n>0&&delete r.nav,S(r)}else S(t);return P}function C(e){e.isActive||(e.isActive=o.computed(function(){var t=O();return t&&t.__moduleId__==e.moduleId}))}var D,j,V=[],T=o.observable(!1),O=n.create(),P={handlers:[],routes:[],navigationModel:o.observableArray([]),activeItem:O,isNavigating:o.computed(function(){var e=O(),t=T(),n=e&&e.router&&e.router!=P&&e.router.isNavigating()?!0:!1;return t||n}),activeInstruction:o.observable(null),__router__:!0};return i.includeIn(P),O.settings.areSameItem=function(e,t,n,i){return e==t?f(n,i):!1},P.parseQueryString=function(e){var t,n;if(!e)return null;if(n=e.split("&"),0==n.length)return null;t={};for(var i=0;i<n.length;i++){var r=n[i];if(""!==r){var a=r.split("=");t[a[0]]=a[1]&&decodeURIComponent(a[1].replace(/\+/g," "))}}return t},P.route=function(e,t){P.handlers.push({routePattern:e,callback:t})},P.loadUrl=function(t){var n=P.handlers,i=null,r=t,o=t.indexOf("?");if(-1!=o&&(r=t.substring(0,o),i=t.substr(o+1)),P.relativeToParentRouter){var s=this.parent.activeInstruction();r=s.params.join("/"),r&&"/"==r[0]&&(r=r.substr(1)),r||(r=""),r=r.replace("//","/").replace("//","/")}r=r.replace(y,"");for(var c=0;c<n.length;c++){var l=n[c];if(l.routePattern.test(r))return l.callback(r,i),!0}return e.log("Route Not Found"),P.trigger("router:route:not-found",t,P),j&&a.navigate(j.fragment,{trigger:!1,replace:!0}),g.explicitNavigation=!1,g.navigatingBack=!1,!1},P.updateDocumentTitle=function(e,n){n.config.title?document.title=t.title?n.config.title+" | "+t.title:n.config.title:t.title&&(document.title=t.title)},P.navigate=function(e,t){return e&&-1!=e.indexOf("://")?(window.location.href=e,!0):(g.explicitNavigation=!0,a.navigate(e,t))},P.navigateBack=function(){a.navigateBack()},P.attached=function(){setTimeout(function(){T(!1),P.trigger("router:navigation:attached",D,j,P),I()},10)},P.compositionComplete=function(){P.trigger("router:navigation:composition-complete",D,j,P)},P.convertRouteToHash=function(e){if(P.relativeToParentRouter){var t=P.parent.activeInstruction(),n=t.config.hash+"/"+e;return a._hasPushState&&(n="/"+n),n=n.replace("//","/").replace("//","/")}return a._hasPushState?e:"#"+e},P.convertRouteToModuleId=function(e){return l(e)},P.convertRouteToTitle=function(e){var t=l(e);return t.substring(0,1).toUpperCase()+t.substring(1)},P.map=function(t,n){if(e.isArray(t)){for(var i=0;i<t.length;i++)P.map(t[i]);return P}return e.isString(t)||e.isRegExp(t)?(n?e.isString(n)&&(n={moduleId:n}):n={},n.route=t):n=t,A(n)},P.buildNavigationModel=function(t){var n=[],i=P.routes;t=t||100;for(var r=0;r<i.length;r++){var a=i[r];a.nav&&(e.isNumber(a.nav)||(a.nav=t),C(a),n.push(a))}return n.sort(function(e,t){return e.nav-t.nav}),P.navigationModel(n),P},P.mapUnknownRoutes=function(t,n){var i="*catchall",r=c(i);return P.route(r,function(o,s){var c=_(r,o,s),l={fragment:o,queryString:s,config:{route:i,routePattern:r},params:c.params,queryParams:c.queryParams};if(t)if(e.isString(t))l.config.moduleId=t,n&&a.navigate(n,{trigger:!1,replace:!0});else if(e.isFunction(t)){var u=t(l);if(u&&u.then)return u.then(function(){P.trigger("router:route:before-config",l.config,P),P.trigger("router:route:after-config",l.config,P),k(l)}),void 0}else l.config=t,l.config.route=i,l.config.routePattern=r;else l.config.moduleId=o;P.trigger("router:route:before-config",l.config,P),P.trigger("router:route:after-config",l.config,P),k(l)}),P},P.reset=function(){return j=D=void 0,P.handlers=[],P.routes=[],P.off(),delete P.options,P},P.makeRelative=function(t){return e.isString(t)&&(t={moduleId:t,route:t}),t.moduleId&&!d(t.moduleId,"/")&&(t.moduleId+="/"),t.route&&!d(t.route,"/")&&(t.route+="/"),t.fromParent&&(P.relativeToParentRouter=!0),P.on("router:route:before-config").then(function(e){t.moduleId&&(e.moduleId=t.moduleId+e.moduleId),t.route&&(e.route=""===e.route?t.route.substring(0,t.route.length-1):t.route+e.route)}),P},P.createChildRouter=function(){var e=w();return e.parent=P,e},P};return g=w(),g.explicitNavigation=!1,g.navigatingBack=!1,g.activate=function(t){return e.defer(function(n){if(v=n,g.options=e.extend({routeHandler:g.loadUrl},g.options,t),a.activate(g.options),a._hasPushState)for(var i=g.routes,r=i.length;r--;){var o=i[r];o.hash=o.hash.replace("#","")}s(document).delegate("a","click",function(e){if(g.explicitNavigation=!0,a._hasPushState&&!(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)){var t=s(this).attr("href"),n=this.protocol+"//";(!t||"#"!==t.charAt(0)&&t.slice(n.length)!==n)&&(e.preventDefault(),a.navigate(t))}})}).promise()},g.deactivate=function(){a.deactivate()},g.install=function(){o.bindingHandlers.router={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,i,a){var s=o.utils.unwrapObservable(t())||{};if(s.__router__)s={model:s.activeItem(),attached:s.attached,compositionComplete:s.compositionComplete,activate:!1};else{var c=o.utils.unwrapObservable(s.router||i.router)||g;s.model=c.activeItem(),s.attached=c.attached,s.compositionComplete=c.compositionComplete,s.activate=!1}r.compose(e,s,a)}},o.virtualElements.allowedBindings.router=!0},g});
define('viewmodels/shell',["durandal/system","plugins/router","services/logger"],function(t,e,n){function i(){return r("Welcome!",null,!0),e.on("router:route:not-found",function(t){o("Page not found",t,!0)}),e.map([{route:"",title:"Welcome",icon:"glyphicon-home",moduleId:"viewmodels/welcome",nav:!0},{route:"blog",title:"Blog",icon:"glyphicon-book",moduleId:"viewmodels/blog",nav:!0},{route:"photos",title:"Photography",icon:"glyphicon-camera",moduleId:"viewmodels/photos",nav:!0},{route:"contact",title:"Contact",icon:"glyphicon-envelope",moduleId:"viewmodels/contact",nav:!0},{route:"license",title:"License",icon:"",moduleId:"viewmodels/license",nav:!1},{route:"error",title:"Error",icon:"",moduleId:"viewmodels/error",nav:!1},{route:"error/:id",title:"Error",icon:"",moduleId:"viewmodels/error",nav:!1}]).buildNavigationModel(),e.activate()}function r(e,i,r){n.log(e,i,t.getModuleId(a),r)}function o(e,i,r){n.logError(e,i,t.getModuleId(a),r)}var a={router:e,copyright:"Copyright © 2010-"+(new Date).getFullYear()+' <a href="http://www.zubinraj.com/">Zubin Raj</a>',footerItems:[{item:'Follow me on <a href="https://github.com/zubinraj/" target="_blank">GitHub</a> | <a href="https://twitter.com/zubinraj" target="_blank">Twitter</a>'},{item:'Powered by <a href="http://durandaljs.com/" target="_blank">Durandal JS</a>, <a href="http://knockoutjs.com/" target="_blank">Knockout JS</a>, <a href="http://getbootstrap.com/" target="_blank">Bootstrap</a> and <a href="http://isotope.metafizzy.co/" target="_blank">Isotope</a>'}],creativeCommons:'<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img class="lazy" alt="Creative Commons License" style="border-width:0" src="Content/Images/grey.gif" data-original="http://i.creativecommons.org/l/by-nc/3.0/88x31.png" /></a>',activate:i};return a});
define('viewmodels/welcome',["plugins/http","durandal/app","knockout","services/logger"],function(t,e,n){function i(){var t={isactive:1,imagesrc:"http://placehold.it/1200x480",caption:"caption 1"};this.items.push(t);var t={isactive:0,imagesrc:"http://placehold.it/1200x480",caption:"caption 2"};this.items.push(t);var t={isactive:0,imagesrc:"http://placehold.it/1200x480",caption:"caption 3"};this.items.push(t),$(".carousel").carousel({interval:2e3})}var r={title:"Welcome",items:n.observableArray([]),activate:i};return r});
define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!views/blog.html',[],function () { return '<section id="blog">\r\n\r\n    <div class="options">\r\n        <ul class="filters list-inline">\r\n            <li class="first"><a class="selected" data-filter="*" href="javascript: void(0);">Show All</a></li>\r\n            <li><a href="javascript: void(0);" data-filter=".programming">Programming</a></li>\r\n            <li><a href="javascript: void(0);" data-filter=".mobile">Mobile</a></li>\r\n            <li><a href="javascript: void(0);" data-filter=".linux">Linux</a></li>\r\n        </ul>\r\n    </div>\r\n\r\n    <div id="blog-container" data-bind="foreach: items, isotope: { itemSelector: \'.blog-item\' }">\r\n        <div class="blog-item" data-bind="css: categories">\r\n            <a data-bind="attr: { href: link }">\r\n                <h3 data-bind="text: title"></h3>\r\n            </a>\r\n            <p data-bind="text: description"></p>\r\n            <small><a data-bind="attr: { href: link }">Read More</a></small>\r\n                \r\n        </div>\r\n    </div>\r\n\r\n</section>';});

define('text!views/contact.html',[],function () { return '<section>\n    <div>\r\n        <h2 data-bind="text: contactHeading"></h2>\n        <table class="table table-striped table-hover" data-bind="foreach: contactItems">\n            <tr>\n                <td data-bind="text: channel"></td>\n                <td><a data-bind="enable: url.length > 0, attr: { href: url }, text: text"></a></td>\n            </tr>\n        </table>\n    </div>\r\n\r\n    <div>\r\n        <h2 data-bind="text: licenseHeading"></h2>\n        <p data-bind="html: licenseText"></p>\n    </div>\n    \r\n    <div class="alert alert-warning">\r\n        <p data-bind="html: disclaimerText"></p>\n    </div>    \n</section>';});

define('text!views/detail.html',[],function () { return '<div class="messageBox autoclose" style="max-width: 425px">\n    <div class="modal-header">\n        <h3>Details</h3>\n    </div>\n    <div class="modal-body">\n        <p data-bind="html: description"></p>\n    </div>\n</div>';});

define('text!views/error.html',[],function () { return '<section>\n    <div >\n        <h2 data-bind="text: title"></h2>\n\n        <h4 data-bind="html: msg"></h4>\n\n    </div>\n\n</section>\n';});

define('text!views/flickr.html',[],function () { return '<section>\n    <div class="row">\n        <ul class="list-inline" data-bind="foreach: images">\n            <li>\n                <a href="#" class="thumbnail" data-bind="click: $parent.select">\n                    <img style="width: 260px; height: 180px;" data-bind="attr: { src: media.m }"/>\n                    <span data-bind="text: title"></span>\n                    <span data-bind="text: tags"></span>\n                </a>\n            </li>\n        </ul>\n    </div>\n</section>';});

define('text!views/footer.html',[],function () { return '    <div class="bs-footer">\n        <small><i>\n            <p data-bind="html: copyright"></p>\n            <span data-bind="foreach: footerItems">\n                <p data-bind="html: item"></p>\n            </span>\n        </i></small>\n        <div class="clearfix"> <p data-bind="html: creativeCommons"></p></div>\n    </div>\n';});

define('text!views/header.html',[],function () { return '    <nav class="navbar navbar-fixed-top navbar-default" role="navigation">\n        <div class="navbar-header">\n            <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-ex1-collapse">\n              <span class="sr-only">Toggle navigation</span>\n              <span class="icon-bar"></span>\n              <span class="icon-bar"></span>\n              <span class="icon-bar"></span>\n            </button>\n\n            <a class="navbar-brand" data-bind="attr: { href: router.navigationModel()[0].hash }">\n                <!--<i class="glyphicon glyphicon-leaf"></i>-->\n                <span>test</span>\n            </a>\n        </div>\n        <div class="collapse navbar-collapse navbar-ex1-collapse">\n            <ul class="nav navbar-nav" data-bind="foreach: router.navigationModel">\n                <li data-bind="css: { active: isActive }">\n                    <a data-bind="attr: { href: hash }">\n                        <i class="glyphicon" data-bind="css: icon"></i>\n                        <span data-bind="text: title"></span>\n                    </a>\n                </li>\n            </ul>\n        \n            <div class="loader pull-right" data-bind="css: { active: router.isNavigating }">\n                <i class="icon-spinner icon-2x icon-spin"></i>\n            </div>\n        </div>        \n    </nav>\n';});

define('text!views/license.html',[],function () { return '<h2 data-bind="text: title"></h2>\n\n<p data-bind="html: description"></p>\n\n<div class="pull-left" style="width: 200px;">\n    <ul data-bind="foreach: terms">\n        <li data-bind="text: term"></li>\n    </ul>\n</div>\n\n<div class="clearfix"> <p data-bind="html: creativeCommons"></p></div>\n\n<p>If any section of this website mentions it\'s own licensing terms, that will override the terms mentioned here.</p>\n\n<h2 data-bind="text: thirdPartyHeading"></h2>\n<table class="table table-striped table-hover" data-bind="foreach: thirdPartyItems">\n    <tr> \n        <td data-bind="text: library"></td>\n        <td data-bind="text: license"></td>\n        <td><a data-bind="attr: { href: url }, text: url" target="_blank"></a></td>\n    </tr>\n</table>\n';});

define('text!views/photos.html',[],function () { return '<section id="gallery">\n    <div class="options">\n        <ul class="filters list-inline">\n            <li class="first"><a class="selected" data-filter="*" href="javascript: void(0);">Show All</a></li>\n            <li><a href="javascript: void(0);" data-filter=".portfolio">Portfolio</a></li>\n            <li><a href="javascript: void(0);" data-filter=".people">People</a></li>\n            <li><a href="javascript: void(0);" data-filter=".places">Places</a></li>\n            <li><a href="javascript: void(0);" data-filter=".bird">Birds</a></li>\n        </ul>\n    </div>\n    <div id="gallery-container"  class="list-inline" data-bind="foreach: images, isotope: { itemSelector: \'.gallery-item\' }">\n    <!--<ul id="gallery-container"  class="list-inline" data-bind="foreach: images">-->\n        <div class="gallery-item" data-bind="css: categories, style: { height: thumbHeight, width: thumbWidth }">\n            <a href="#" data-bind="click:$parent.select">\n                <img class="lazy" src="Content/Images/grey.gif" data-bind="attr: { \'data-original\': thumbUrl, title: title, alt: title, height: thumbHeight, width: thumbWidth }"/>\n                <!--<span data-bind="text: title"></span>-->\n            </a>\n        </div>\n    </div>\n</section>';});

define('text!views/shell.html',[],function () { return '<div>\n    <header data-bind="compose: { view: \'header\' }"></header>\n    \n    <div class="container page-host" data-bind="router: { transition:\'entrance\', cacheViews:true }"></div>\n\n    <footer data-bind="compose: { view: \'footer\' }"></footer>\n\n</div>';});

define('text!views/welcome.html',[],function () { return '<section>\n    <h2 data-bind="html: title"></h2>\n    <!--  Carousel\n        consult the Twitter Bootstrap docs at http://twitter.github.com/bootstrap/javascript.html#carousel \n    -->\n    <div id="myCarousel" class="carousel slide" >\n        <!-- Indicators -->\n        <ol class="carousel-indicators" data-bind="{foreach: items}">\n            <li data-target="#myCarousel" data-bind="attr: {\'data-slide-to\':$index}, css: {\'active\':isactive}"  ></li>\n        </ol>\n\n        <!-- Carousel items -->\n        <div class="carousel-inner" data-bind="{foreach: items}">\n            <div class="item" data-bind="css: {\'active\':isactive}">\n                <img alt="" data-bind="attr: {\'src\': imagesrc}" />\n                <div class="carousel-caption">\n                    <p data-bind="{\'text\': caption}"></p>\n                </div>\n            </div>\n        </div>\n        <!-- Carousel nav -->\n        <a class="carousel-control left" href="#myCarousel" data-slide="prev">&lsaquo;</a>\n        <a class="carousel-control right" href="#myCarousel" data-slide="next">&rsaquo;</a>\n    </div>\n\n</section>';});

define('plugins/dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator","durandal/viewEngine","jquery","knockout"],function(t,e,n,i,r,o,a){function s(e){return t.defer(function(n){t.isString(e)?t.acquire(e).then(function(e){n.resolve(t.resolveObject(e))}).fail(function(n){t.error("Failed to load dialog module ("+e+"). Details: "+n.message)}):n.resolve(e)}).promise()}var c,l={},u=0,d=function(t,e,n){this.message=t,this.title=e||d.defaultTitle,this.options=n||d.defaultOptions};return d.prototype.selectOption=function(t){c.close(this,t)},d.prototype.getView=function(){return r.processMarkup(d.defaultViewMarkup)},d.setViewUrl=function(t){delete d.prototype.getView,d.prototype.viewUrl=t},d.defaultTitle=e.title||"Application",d.defaultOptions=["Ok"],d.defaultViewMarkup=['<div data-view="plugins/messageBox" class="messageBox">','<div class="modal-header">','<h3 data-bind="text: title"></h3>',"</div>",'<div class="modal-body">','<p class="message" data-bind="text: message"></p>',"</div>",'<div class="modal-footer" data-bind="foreach: options">','<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',"</div>","</div>"].join("\n"),c={MessageBox:d,currentZIndex:1050,getNextZIndex:function(){return++this.currentZIndex},isOpen:function(){return u>0},getContext:function(t){return l[t||"default"]},addContext:function(t,e){e.name=t,l[t]=e;var n="show"+t.substr(0,1).toUpperCase()+t.substr(1);this[n]=function(e,n){return this.show(e,n,t)}},createCompositionSettings:function(t,e){var n={model:t,activate:!1};return e.attached&&(n.attached=e.attached),e.compositionComplete&&(n.compositionComplete=e.compositionComplete),n},getDialog:function(t){return t?t.__dialog__:void 0},close:function(t){var e=this.getDialog(t);if(e){var n=Array.prototype.slice.call(arguments,1);e.close.apply(e,n)}},show:function(e,r,o){var a=this,c=l[o||"default"];return t.defer(function(t){s(e).then(function(e){var o=i.create();o.activateItem(e,r).then(function(i){if(i){var r=e.__dialog__={owner:e,context:c,activator:o,close:function(){var n=arguments;o.deactivateItem(e,!0).then(function(i){i&&(u--,c.removeHost(r),delete e.__dialog__,0==n.length?t.resolve():1==n.length?t.resolve(n[0]):t.resolve.apply(t,n))})}};r.settings=a.createCompositionSettings(e,c),c.addHost(r),u++,n.compose(r.host,r.settings)}else t.resolve(!1)})})}).promise()},showMessage:function(e,n,i){return t.isString(this.MessageBox)?c.show(this.MessageBox,[e,n||d.defaultTitle,i||d.defaultOptions]):c.show(new this.MessageBox(e,n,i))},install:function(t){e.showDialog=function(t,e,n){return c.show(t,e,n)},e.showMessage=function(t,e,n){return c.showMessage(t,e,n)},t.messageBox&&(c.MessageBox=t.messageBox),t.messageBoxView&&(c.MessageBox.prototype.getView=function(){return t.messageBoxView})}},c.addContext("default",{blockoutOpacity:.2,removeDelay:200,addHost:function(t){var e=o("body"),n=o('<div class="modalBlockout"></div>').css({"z-index":c.getNextZIndex(),opacity:this.blockoutOpacity}).appendTo(e),i=o('<div class="modalHost"></div>').css({"z-index":c.getNextZIndex()}).appendTo(e);if(t.host=i.get(0),t.blockout=n.get(0),!c.isOpen()){t.oldBodyMarginRight=e.css("margin-right"),t.oldInlineMarginRight=e.get(0).style.marginRight;var r=o("html"),a=e.outerWidth(!0),s=r.scrollTop();o("html").css("overflow-y","hidden");var l=o("body").outerWidth(!0);e.css("margin-right",l-a+parseInt(t.oldBodyMarginRight)+"px"),r.scrollTop(s)}},removeHost:function(t){if(o(t.host).css("opacity",0),o(t.blockout).css("opacity",0),setTimeout(function(){a.removeNode(t.host),a.removeNode(t.blockout)},this.removeDelay),!c.isOpen()){var e=o("html"),n=e.scrollTop();e.css("overflow-y","").scrollTop(n),t.oldInlineMarginRight?o("body").css("margin-right",t.oldBodyMarginRight):o("body").css("margin-right","")}},compositionComplete:function(t,e,n){var i=o(t),r=i.width(),a=i.height(),s=c.getDialog(n.model);i.css({"margin-top":(-a/2).toString()+"px","margin-left":(-r/2).toString()+"px"}),o(s.host).css("opacity",1),o(t).hasClass("autoclose")&&o(s.blockout).click(function(){s.close()}),o(".autofocus",t).each(function(){o(this).focus()})}}),c});
define('plugins/observable',["durandal/system","durandal/binder","knockout"],function(e,t,n){function i(e){var t=e[0];return"_"===t||"$"===t}function r(t){if(!t||e.isElement(t)||t.ko===n||t.jquery)return!1;var i=d.call(t);return-1==f.indexOf(i)&&!(t===!0||t===!1)}function a(e,t){var n=e.__observable__,i=!0;if(!n||!n.__full__){n=n||(e.__observable__={}),n.__full__=!0,v.forEach(function(n){e[n]=function(){i=!1;var e=m[n].apply(t,arguments);return i=!0,e}}),g.forEach(function(n){e[n]=function(){i&&t.valueWillMutate();var r=h[n].apply(e,arguments);return i&&t.valueHasMutated(),r}}),p.forEach(function(n){e[n]=function(){for(var r=0,a=arguments.length;a>r;r++)o(arguments[r]);i&&t.valueWillMutate();var s=h[n].apply(e,arguments);return i&&t.valueHasMutated(),s}}),e.splice=function(){for(var n=2,r=arguments.length;r>n;n++)o(arguments[n]);i&&t.valueWillMutate();var a=h.splice.apply(e,arguments);return i&&t.valueHasMutated(),a};for(var r=0,a=e.length;a>r;r++)o(e[r])}}function o(t){var o,s;if(r(t)&&(o=t.__observable__,!o||!o.__full__)){if(o=o||(t.__observable__={}),o.__full__=!0,e.isArray(t)){var l=n.observableArray(t);a(t,l)}else for(var u in t)i(u)||o[u]||(s=t[u],e.isFunction(s)||c(t,u,s));b&&e.log("Converted",t)}}function s(e,t,n){var i;e(t),i=e.peek(),n?i.destroyAll||(i||(i=[],e(i)),a(i,e)):o(i)}function c(t,i,r){var c,l,u=t.__observable__||(t.__observable__={});if(void 0===r&&(r=t[i]),e.isArray(r))c=n.observableArray(r),a(r,c),l=!0;else if("function"==typeof r){if(!n.isObservable(r))return null;c=r}else e.isPromise(r)?(c=n.observable(),r.then(function(t){if(e.isArray(t)){var i=n.observableArray(t);a(t,i),t=i}c(t)})):(c=n.observable(r),o(r));return Object.defineProperty(t,i,{configurable:!0,enumerable:!0,get:c,set:n.isWriteableObservable(c)?function(t){t&&e.isPromise(t)?t.then(function(t){s(c,t,e.isArray(t))}):s(c,t,l)}:void 0}),u[i]=c,c}function l(t,n,i){var r,a=this,o={owner:t,deferEvaluation:!0};return"function"==typeof i?o.read=i:("value"in i&&e.error('For ko.defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof i.get&&e.error('For ko.defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),o.read=i.get,o.write=i.set),r=a.computed(o),t[n]=r,c(t,n,r)}var u,d=Object.prototype.toString,f=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],v=["remove","removeAll","destroy","destroyAll","replace"],g=["pop","reverse","sort","shift","splice"],p=["push","unshift"],h=Array.prototype,m=n.observableArray.fn,b=!1;return u=function(e,t){var i,r,a;return e?(i=e.__observable__,i&&(r=i[t])?r:(a=e[t],n.isObservable(a)?a:c(e,t,a))):null},u.defineProperty=l,u.convertProperty=c,u.convertObject=o,u.install=function(e){var n=t.binding;t.binding=function(e,t,i){i.applyBindings&&!i.skipConversion&&o(e),n(e,t)},b=e.logConversion},u});
define('plugins/serializer',["durandal/system"],function(e){return{typeAttribute:"type",space:void 0,replacer:function(e,t){if(e){var n=e[0];if("_"===n||"$"===n)return void 0}return t},serialize:function(t,n){return n=void 0===n?{}:n,(e.isString(n)||e.isNumber(n))&&(n={space:n}),JSON.stringify(t,n.replacer||this.replacer,n.space||this.space)},getTypeId:function(e){return e?e[this.typeAttribute]:void 0},typeMap:{},registerType:function(){var t=arguments[0];if(1==arguments.length){var n=t[this.typeAttribute]||e.getModuleId(t);this.typeMap[n]=t}else this.typeMap[t]=arguments[1]},reviver:function(e,t,n,i){var r=n(t);if(r){var a=i(r);if(a)return a.fromJSON?a.fromJSON(t):new a(t)}return t},deserialize:function(e,t){var n=this;t=t||{};var i=t.getTypeId||function(e){return n.getTypeId(e)},r=t.getConstructor||function(e){return n.typeMap[e]},a=t.reviver||function(e,t){return n.reviver(e,t,i,r)};return JSON.parse(e,a)}}});
define('plugins/widget',["durandal/system","durandal/composition","jquery","knockout"],function(e,t,n,i){function r(e,n){var r=i.utils.domData.get(e,c);r||(r={parts:t.cloneNodes(i.virtualElements.childNodes(e))},i.virtualElements.emptyNode(e),i.utils.domData.set(e,c,r)),n.parts=r.parts}var a={},o={},s=["model","view","kind"],c="durandal-widget-data",l={getSettings:function(t){var n=i.utils.unwrapObservable(t())||{};if(e.isString(n))return{kind:n};for(var r in n)n[r]=-1!=i.utils.arrayIndexOf(s,r)?i.utils.unwrapObservable(n[r]):n[r];return n},registerKind:function(e){i.bindingHandlers[e]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,n,i,a,o){var s=l.getSettings(n);s.kind=e,r(t,s),l.create(t,s,o,!0)}},i.virtualElements.allowedBindings[e]=!0},mapKind:function(e,t,n){t&&(o[e]=t),n&&(a[e]=n)},mapKindToModuleId:function(e){return a[e]||l.convertKindToModulePath(e)},convertKindToModulePath:function(e){return"widgets/"+e+"/viewmodel"},mapKindToViewId:function(e){return o[e]||l.convertKindToViewPath(e)},convertKindToViewPath:function(e){return"widgets/"+e+"/view"},createCompositionSettings:function(e,t){return t.model||(t.model=this.mapKindToModuleId(t.kind)),t.view||(t.view=this.mapKindToViewId(t.kind)),t.preserveContext=!0,t.activate=!0,t.activationData=t,t.mode="templated",t},create:function(e,n,i,r){r||(n=l.getSettings(function(){return n},e));var a=l.createCompositionSettings(e,n);t.compose(e,a,i)},install:function(e){if(e.bindingName=e.bindingName||"widget",e.kinds)for(var t=e.kinds,n=0;n<t.length;n++)l.registerKind(t[n]);i.bindingHandlers[e.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,i,a){var o=l.getSettings(t);r(e,o),l.create(e,o,a,!0)}},i.virtualElements.allowedBindings[e.bindingName]=!0}};return l});
define('transitions/entrance',["durandal/system","durandal/composition","jquery"],function(e,t,n){var i=100,r={marginRight:0,marginLeft:0,opacity:1},o={marginLeft:"",marginRight:"",opacity:"",display:""},a=function(t){return e.defer(function(e){function a(){e.resolve()}function s(){t.keepScrollPosition||n(document).scrollTop(0)}function c(){s(),t.triggerAttach();var e={marginLeft:u?"0":"20px",marginRight:u?"0":"-20px",opacity:0,display:"block"},i=n(t.child);i.css(e),i.animate(r,l,"swing",function(){i.css(o),a()})}if(t.child){var l=t.duration||500,u=!!t.fadeOnly;t.activeView?n(t.activeView).fadeOut(i,c):c()}else n(t.activeView).fadeOut(i,a)}).promise()};return a});
require(["main"]);
}());
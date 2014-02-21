/*
 * angular-error
 *
 * Captures errors and reports them back to a server for inspection
 *
 * (c) 2014 Wes Cruver
 * License: MIT
 */


(function() {

'use strict';

angular.module('cfp.error', [])

  /**
   * Decorate Angular's $exceptionHandler service to easily hook into the log
   * and post the error to an external service
   */
  .config(['$provide', function ($provide) {

    /**
     * Error object to standardize everything
     * @param  {[type]} exception [description]
     * @param  {[type]} cause     [description]
     * @param  {[type]} opts      [description]
     * @return {[type]}           [description]
     */
    function ErrorReport (exception, cause, ua) {
      this.exception = exception;
      this.cause = cause;
      this.ua = ua;
      this.count = 1;
    }


    $provide.decorator('$exceptionHandler', ['$delegate', '$log', '$window', 'errorService', function ($delegate, $log, $window, errorService) {

      return function (exception, cause) {
        var ua;

        if ($window.navigator && $window.navigator.userAgent) {
          ua = $window.navigator.userAgent;
        }

        var errorReport = new ErrorReport(exception, cause, ua);
        errorService.post(errorReport);
        $log.error.apply($log, arguments);
      };

    }]);
  }])


  /**
   * This service handles the posting of errors, and can be decorated by devs
   * to customize the post payload
   */
  .provider('errorService', function() {

    this.postUri = null;
    this.throttle = 5000;

    /**
     * Keep a cache of recent errors so we can do things like debouncing and
     * aggregating errors into a single post
     *
     * @type {Array}
     */
    var errors = [];


    this.$get = ['$injector', '$window', function ($injector, $window) {
      var $http, $q, $timeout;
      var isThrottled = false;

      var resolveDependencies = function() {
        $q       = $q       || $injector.get('$q');
        $http    = $http    || $injector.get('$http');
        $timeout = $timeout || $injector.get('$timeout');
      };

      /**
       * Only add unique errors.  any duplicates should iterate the errorCount property of the ErrorReport
       * @param  {ErrorReport} errorReport The error report
       */
      var pushError = function(errorReport) {
        var push = true;

        for (var i = 0; i < errors.length; i++) {
          // TODO: profile this:
          if (errorReport.exception.stack === errors[i].exception.stack) {
            push = false;
            errors[i].count++;
          }
        }

        if (push) {
          errors.push(errorReport);
        }

      };

      return {
        post: function (errorReport) {
          var uri = this.postUri;
          resolveDependencies();
          pushError(errorReport);
          // errors.push(errorReport);

          if (isThrottled) {
            return;
          }

          $timeout(function(){
            $http.post(uri, errors);
            errors = [];
            isThrottled = false;
          }, this.throttle);

          isThrottled = true;

        },
        postUri: this.postUri,
        throttle: this.throttle
      };
    }];

  });
})();
